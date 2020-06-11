import re
from collections import defaultdict

import params
from tools import bcolors
layer_miners = defaultdict(list)
node2blocks = {}
transactions = defaultdict(list)
layers = defaultdict(int)
rewards = defaultdict(list)
num_of_instances = len(params.genesis_accounts) + 1
layers_per_epoch = 3
atxs = defaultdict(list)
epoch_atxs = defaultdict(list)


def block_created(msg):
    id = msg["node_id"]
    layer = msg["layer_id"]
    m = msg["M"]
    # print(id + " created a block")
    # blocks - list of all blocks, layers - map of blocks per layer
    if id in node2blocks:
        node2blocks[id]["blocks"].append(m)
        if layer in node2blocks[id]["layers"]:
            node2blocks[id]["layers"][layer].append(m)
        else:
            node2blocks[id]["layers"][layer] = [m]
    else:
        node2blocks[id] = {"blocks": [m], "layers": {layer: [m]}}

    if id not in layer_miners[layer]:
        layer_miners[layer].append(id)
    # print("miners created blocks in layer %s: %s" % (layer, len(layer_miners[layer])))


def released_tick(msg):
    #m = re.findall(r'\d+', msg["M"])
    layer = msg["layer_id"]
    layers[layer] += 1
    # print("got tick %s %s, total: %s" % (layer, msg, layers[layer]))
    if layers[layer] == num_of_instances:
        print(msg["T"])
        print_layer_stats(int(layer))


def print_layer_stats(layer):
    l = layer - 1

    total_blocks = sum([len(node2blocks[x]["layers"][l]) for x in layer_miners[l]])
    print(bcolors.HEADER + "Layer %s ended, %s miners created %s blocks" % (layer - 1, len(layer_miners[l]), total_blocks) + bcolors.ENDC)
    if layer % layers_per_epoch == 0:
        print(bcolors.OKBLUE + "An epoch has finished, atxs published in this epoch: %s" %
              len(epoch_atxs[int(layer/layers_per_epoch) -1]) + bcolors.ENDC)


def parse_atx(msg):
    # based on log: atx published! id: %v, prevATXID: %v, posATXID: %v, layer: %v, published in epoch: %v, active set: %v miner: %v view %v
    nid = msg["node_id"]
    # m = re.findall(r'(?<=\b:\s)(\w+)|(?<=view\s)(\w+)', msg["M"])
    epoch_atxs[msg["layer_id"]].append(msg)
    # print("got atx ", msg["M"], " len of epoch %s is %s" % (m[4][0], len(epoch_atxs[m[4][0]])))


def parse_transactions(msg):
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["transaction"])
    tx_id = m[0]
    transactions[tx_id] = transactions.get(tx_id,0) + 1
    if transactions[tx_id] == num_of_instances:
        del transactions[tx_id]
        print(bcolors.OKGREEN + "Tx confirmed id: %s orig: %s dest: %s amount: %s nonce: %s" % (m[0], m[1], m[2], m[3], m[4]) + bcolors.ENDC)


def parse_transaction_recv(msg):
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["M"])
    print(bcolors.OKYELLOW + "Tx received by node, dst: %s amount: %s" % (m[0], m[2]) + bcolors.ENDC)


def app_started(msg):
    print(bcolors.OKGREEN + "App started in %s at %s 🎉" % (msg["T"], msg["container_name"]) + bcolors.ENDC)


def parse_rewards(msg):
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["M"])
    reward = (m[0], m[1], m[3])
    rewards[reward].append(m)
    # print(m, " ", len(rewards[reward]))
    if len(rewards[reward]) % num_of_instances == 0:
        print(bcolors.OKGREEN + "Applied reward for node %s, reward: %s Spacemesh Coins (SMC) 🏅" % (m[0], m[1]) + bcolors.ENDC)


def parse_reward(msg):
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["M"])
    reward = m[0]
    rewards[reward].append(m)
    # print(m, " ", len(rewards[reward]))
    if len(rewards[reward]) % num_of_instances == 0:
        print(bcolors.OKGREEN + "Applied reward for nodes, total reward: %s Spacemesh Coins (SMC)🏅" % (m[0]) + bcolors.ENDC)


def post_proof(msg):
    id = re.split(r'\.', msg["N"])[0]
    print(bcolors.ORANGE + "PoST commitment finished for node: %s size: %s (bytes) 💾⏰💪" % (id, msg["space"]) + bcolors.ENDC)


# node added event
# bootstrapped
# block created event
# atx created event
# new layer event
# consensus process started?
# pbase advanced?
events = {"block created": block_created,
          "release tick": released_tick,
          "App started": app_started,
          "atx published": parse_atx,
          "transaction processed": parse_transactions,
          "GRPC SubmitTransaction to address": parse_transaction_recv,
          "reward applied for account": parse_rewards,
          "fees reward:": parse_reward,
          "PoST initialization completed": post_proof}
