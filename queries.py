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
    id = re.split(r'\.', msg["N"])[0]
    m = re.findall(r'\d+', msg["M"])
    layer = m[0]
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
    m = re.findall(r'\d+', msg["M"])
    layer = m[0]
    layers[layer] += 1
    # print("got tick %s %s, total: %s" % (layer, msg, layers[layer]))
    if layers[layer] == num_of_instances:
        print(msg["T"])
        print_layer_stats(int(layer))


def print_layer_stats(layer):
    l = str(layer - 1)
    total_blocks = sum([len(node2blocks[x]["layers"][l]) for x in layer_miners[l]])
    print(bcolors.HEADER + "layer %s ended, %s miners created %s blocks" % (layer - 1, len(layer_miners[l]), total_blocks) + bcolors.ENDC)
    if layer % layers_per_epoch == 0:
        print(bcolors.OKBLUE + "an epoch has finished, atxs published in this epoch: %s" %
              len(epoch_atxs[str(int(layer/layers_per_epoch) -1)]) + bcolors.ENDC)


def parse_atx(msg):
    # based on log: atx published! id: %v, prevATXID: %v, posATXID: %v, layer: %v, published in epoch: %v, active set: %v miner: %v view %v
    nid = re.split(r'\.', msg["N"][0])
    m = re.findall(r'(?<=\b:\s)(\w+)|(?<=view\s)(\w+)', msg["M"])
    epoch_atxs[m[4][0]].append(m)
    # print("got atx ", msg["M"], " len of epoch %s is %s" % (m[4][0], len(epoch_atxs[m[4][0]])))


def parse_transactions(msg):
    # based on log transaction processed, s_account: %s d_account: %s, amount: %v shmekels tx nonce: %v, gas limit: %v gas price: %v
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["M"])
    tx_id = (m[0], m[1], m[3])
    # print(tx_id)
    transactions[tx_id].append(m)
    if len(transactions[tx_id]) == num_of_instances:
        print(bcolors.OKGREEN + "confirmed tx: orig: %s dest: %s amount %s nonce: %s" % (m[0], m[1], m[2], m[3]) + bcolors.ENDC)


def parse_transaction_recv(msg):
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["M"])
    print(bcolors.OKYELLOW + "tx received by node, dst %s amount %s" % (m[0], m[2]) + bcolors.ENDC)


def app_started(msg):
    print(bcolors.OKGREEN + "App started in %s at %s" % (msg["T"], msg["container_name"]) + bcolors.ENDC)


def parse_rewards(msg):
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["M"])
    reward = (m[0], m[1], m[3])
    rewards[reward].append(m)
    # print(m, " ", len(rewards[reward]))
    if len(rewards[reward]) % num_of_instances == 0:
        print(bcolors.OKGREEN + "applied reward for node %s, reward: %s ⚒" % (m[0], m[1]) + bcolors.ENDC)


def parse_reward(msg):
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["M"])
    reward = m[0]
    rewards[reward].append(m)
    # print(m, " ", len(rewards[reward]))
    if len(rewards[reward]) % num_of_instances == 0:
        print(bcolors.OKGREEN + "applied reward for nodes, total reward: %s ⚒" % (m[0]) + bcolors.ENDC)


def post_proof(msg):
    m = re.findall(r'(?<=\b:\s)(\w+)', msg["M"])
    id = re.split(r'\.', msg["N"])[0]
    print(bcolors.ORANGE + "commitment finished for node: %s size: %s (bytes) 💾⏰💪" % (id, m[2]) + bcolors.ENDC)


# node added event
# bootstrapped
# block created event
# atx created event
# new layer event
# consensus process started?
# pbase advanced?
events = {"I've created a block in layer": block_created,
          "release tick": released_tick,
          "App started": app_started,
          "atx published": parse_atx,
          "transaction processed": parse_transactions,
          "GRPC SubmitTransaction to address": parse_transaction_recv,
          "reward applied for account": parse_rewards,
          "fees reward:": parse_reward,
          "finished PoST initialization": post_proof}
