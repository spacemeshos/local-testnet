import os
import pprint
import time
import traceback
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import timedelta, datetime

import docker
import pytz
from docker.types import LogConfig

import params
import queries
import tools

BOOTSTRAP_PORT = 7513
ORACLE_SERVER_PORT = 3030
POET_SERVER_PORT = 50002
EVENTS_PORT = 56565

NETWORK_NAME = "spacemesh"
NETWORK_SUBNET = '192.168.0.0/8'
NETWORK_GATEWAY = '192.168.0.254'
POET_IP = "192.168.0.20"
BOOTSTRAP_IP = "192.168.0.21"

GENESIS_TIME = pytz.utc.localize(datetime.utcnow() + timedelta(seconds=60))

GENESIS_ACCOUNTS = "genesis_accounts.json"


def create_poet(network_name, poet_ip, bootstrap_ip):
    print("Creating poet container")
    networking_config = advclient.create_networking_config({
        network_name: advclient.create_endpoint_config(ipv4_address=poet_ip)
    })
    host_cfg = advclient.create_host_config(
        log_config=LogConfig(type=LogConfig.types.FLUENTD, config={'tag': 'docker.poet_{{.ID}}'}))
    tools.update_dict(params.poet_params,
                      **{"nodeaddr": '{0}:{1}'.format(bootstrap_ip, '9091')})
    p = advclient.create_container(poet_image,
                                   host_config=host_cfg,
                                   detach=True,
                                   networking_config=networking_config,
                                   command=tools.dict_to_args(params.poet_params))
    advclient.start(p['Id'])
    return client.containers.get(p['Id'])


def create_bootstrap(coinbase ,network_name, bootstrap_ip, poet_ip):
    print("Creating bootstrap container")
    networking_config = advclient.create_networking_config({
        network_name: advclient.create_endpoint_config(ipv4_address=bootstrap_ip)
    })
    tools.update_dict(params.bootstrap_params,
                      **{"genesis-time": GENESIS_TIME.isoformat('T', 'seconds'),
                         "coinbase": coinbase,
                         "poet-server": '{0}:{1}'.format(poet_ip, POET_SERVER_PORT),
                         "events-url": 'tcp://0.0.0.0:{0}'.format(EVENTS_PORT)})

    host_cfg = advclient.create_host_config(
        log_config=LogConfig(type=LogConfig.types.FLUENTD, config={'tag': 'docker.{{.ID}}'}),
        port_bindings={9090: 9090, 9091: 9091, EVENTS_PORT: EVENTS_PORT},
        binds={os.path.abspath(GENESIS_ACCOUNTS): {
                    'bind': params.client_params["genesis-conf"],
                    'mode': 'rw'}})
    print("bootstrap params:", tools.dict_to_args(params.bootstrap_params))
    bts = advclient.create_container(node_image,
                                     name="bootstrap",
                                     host_config=host_cfg,
                                     detach=True,
                                     networking_config=networking_config,
                                     ports=[9090, 9091, EVENTS_PORT],
                                     command=tools.dict_to_args(params.bootstrap_params))
    advclient.start(bts['Id'])
    return client.containers.get(bts['Id'])


def create_nodes(clients, boot_ip, bootID, poet_ip, network_name):
    print("creating clients")
    tools.update_dict(params.client_params,
                      **{"bootnodes": tools.node_string(bootID, boot_ip, BOOTSTRAP_PORT, BOOTSTRAP_PORT),
                         "poet-server": '{0}:{1}'.format(poet_ip, POET_SERVER_PORT),
                         "genesis-time": GENESIS_TIME.isoformat('T', 'seconds')})

    print("running clients with args: " + tools.dict_to_args(params.client_params))
    baseport = 9190
    for name, pubkey in clients.items():
        tools.update_dict(params.client_params,
                          **{"coinbase": pubkey})
        node = client.containers.run(node_image,
                                     log_config=LogConfig(type=LogConfig.types.FLUENTD,
                                                          config={'tag': 'docker.{{.ID}}',
                                                                  'fluentd-sub-second-precision': 'true'}),
                                     volumes={
                                         os.path.abspath(GENESIS_ACCOUNTS): {'bind': params.client_params["genesis-conf"],
                                                                             'mode': 'rw'}},
                                     detach=True,
                                     ports={"9090": baseport},
                                     network=network_name,
                                     name=name,
                                     command=tools.dict_to_args(params.client_params))
        # client.networks.get(network_name).connect(node)
        containers.append({"cont": node})
        # idxes[node.name] = i
        print(tools.bcolors.OKYELLOW + "Client created " + node.name + " connect wallet to 127.0.0.1:" + str(baseport) + " to access this node" + tools.bcolors.ENDC)
        baseport += 1
    print("Finished creating clients")


def load_fluentd(network_name):
    fd = client.containers.run(fluentd_image,
                               detach=True,
                               ports={24224: 24224},
                               network=network_name,
                               volumes={
                                   os.path.abspath('test.conf'): {'bind': '/fluentd/etc/test.conf', 'mode': 'rw'},
                                   os.path.abspath('logs'): {'bind': '/tmp/logs', 'mode': 'rw'}},
                               environment={"FLUENTD_CONF": "test.conf"})
    return fd


def create_network(network_name, subnet, gateway):
    ipam_pool = docker.types.IPAMPool(
        subnet=subnet,  # '192.168.0.0/16',
        gateway=gateway  # '192.168.0.254'
    )
    ipam_config = docker.types.IPAMConfig(
        pool_configs=[ipam_pool]
    )
    client.networks.create(
        network_name,
        driver="bridge",
        ipam=ipam_config
    )


def runMultiple(func, afterfunc):
    futures = []
    with ProcessPoolExecutor(max_workers=10) as pool:
        print("running %s tasks" % len(containers))
        # this code will run in multiple threads
        for cont in containers:
            fut = pool.submit(func, cont["cont"].name)
            futures.append(fut)
    # As the jobs are completed, we process the data more
    for res in as_completed(futures):
        if afterfunc is not None:
            if isinstance(afterfunc, list):
                # a list of function
                for f in afterfunc:
                    f(res.result())
            elif callable(afterfunc):
                afterfunc(res.result())


def getpubkey(cont):
    id = tools.getPublicKey(client.containers.get(cont))
    return True, cont, id


def assignpubkey(packed):
    suc, cont, id = packed
    containers[idxes[cont]]["id"] = id


def wait_for_bootstrap(cont):
    line = "discovery_bootstrap"
    print("[" + cont + "]")
    start_time = time.time()
    for i in client.containers.get(cont).logs(stream=True, stdout=True):
        elapsed_time = time.time() - start_time
        if line in str(i):
            print("I got it !")
            return True
        if elapsed_time > 60:
            return False


counting = 0


def count(success):
    if success:
        global counting
        counting = counting + 1


### Create docker client

pp = pprint.PrettyPrinter(indent=4)
randcon = 4

client = docker.from_env()
advclient = docker.APIClient(base_url='unix://var/run/docker.sock')

poet_image = "poet:develop"
node_image = "go-spacemesh:develop"
fluentd_image = "fluent/fluentd:latest"

# Start a network with size `netsize` boot each client and add to the list
# After that run the needed tests.
netsize = 5
idxes = {}
containers = []
poet = None
bootstrap = None
fluentd = None
try:
    client.networks.prune()
    # tools.cleanUp(client.containers.list())
    create_network(NETWORK_NAME, NETWORK_SUBNET, NETWORK_GATEWAY)
    fluentd = load_fluentd(NETWORK_NAME)
    poet = create_poet(NETWORK_NAME, POET_IP, BOOTSTRAP_IP)
    bootstrap = create_bootstrap(params.bootstrap_coinbase, NETWORK_NAME, BOOTSTRAP_IP, POET_IP)
    print("Waiting for node to boot up")
    #tools.tail(fluentd)
    tools.wait_for_log("App started", fluentd)

    print("Bootstrap booted")
    # collect id and ip.

    bootIP = tools.getExternalIP(advclient, bootstrap)
    if bootIP == "":
        print("bootstrap failed")

    if bootIP != BOOTSTRAP_IP:
        print("bootstrap loaded with wrong ip")

    bootID = tools.getPublicKey(fluentd)
    print("Bootnode is at - " + bootstrap.name + ": " + bootIP + ":7513/" + bootID)

    create_nodes(params.genesis_accounts, bootIP, bootID, POET_IP, NETWORK_NAME)
    print("Started " + str(netsize) + " more instances booting from bootnode")

    tools.parse_logs(fluentd, queries.events)
except KeyboardInterrupt:
    print("Run stopped")
except:
    traceback.print_exc()
finally:
    print("Starting to shutdown nodes")
    if fluentd is not None:
        containers.append({"cont": fluentd})
    containers.append({"cont": bootstrap})
    if poet is not None:
        containers.append({"cont": poet})
    tools.cleanUp(containers)
    client.networks.prune()
