import json
import sys
import requests

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    OKYELLOW = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    ORANGE = '\033[33m'

def getRPCPort(advclient, cont):
    inspect = advclient.inspect_container(cont.name)
    rpcport = inspect['NetworkSettings']['Ports']['9090/tcp'][0]['HostPort']
    return rpcport


def waitForRPC(cont):
    for l in cont.logs(stream=True, stdout=True):
        if "Started GRPC" in str(l):
            return


def parse_logs(cont, lst):
    for l in cont.logs(stream=True, stdout=True):
        ln = l.decode('utf-8')
        # print(ln)
        if '{' == ln[0]:
            j = json.loads(ln)
            if "M" in j:
                for t in lst.keys():
                    if t in j["M"]:
                        lst[t](j)


def get_logs(msg, cont):
    logs = []
    for l in cont.logs():
        if msg in str(l):
            logs.append(msg)
    return logs


def tail(cont):
    for l in cont.logs(stream=True, stdout=True):
        ln = l.decode('utf-8')
        print(ln)


def wait_for_log(msg, cont):
    for l in cont.logs(stream=True, stdout=True):
        ln = l.decode('utf-8')
        # print(ln)
        if '{' == ln[0]:
            j = json.loads(ln)
            if "M" in j and msg in j["M"]:
                # print("Got LOG " + msg)
                return j["M"]


def getExternalIP(advclient, cont):
    ip = ""
    nets = advclient.inspect_container(cont.name)['NetworkSettings']['Networks']
    for net in nets:
        ip = nets[net]["IPAddress"]
        if ip != "":
            print(ip)
            break
    return ip


def getPublicKey(cont):
    id = ""
    msg = wait_for_log(">>", cont)
    print(msg)
    id = msg.split('>>')[1].strip()
    return id


def registerProtocol(advclient, cont, proto, port):
    rpcport = getRPCPort(advclient, cont)
    print ("Register on " + "http://127.0.0.1:" + str(rpcport) + "/v1/register")
    r = requests.post("http://127.0.0.1:" + str(rpcport) + "/v1/register", json={ "name": proto, "port": port })
    print("Registerd protocol response ", r.status_code, r.reason, r.text)

def node_string(key, ip, port, discport):
    return "spacemesh://{0}@{1}:{2}?disc={3}".format(key, ip, port, discport)


def cleanUp(contlist):
    ### Kill all dockers with nice bar
    toolbar_width = len(contlist)
    print("Killing all dockers")
    sys.stdout.write("[%s]" % (" " * toolbar_width))
    sys.stdout.flush()
    sys.stdout.write("\b" * (toolbar_width+1)) # return to start of line, after '['
    for i in contlist:
        cont = i
        if isinstance(i, dict):
            cont = cont["cont"]
            try:
                cont.kill()
            except:
                print("cannot remove cont")
            finally:
                cont.remove()

        # update the bar
        sys.stdout.write("-")
        sys.stdout.flush()
    sys.stdout.write("\n")


def dict_to_args(dt):
    return "".join(["--" + f'{key} {value} ' for key, value in dt.items()])


def update_dict(dt, **kwargs):
    return dt.update(kwargs)
