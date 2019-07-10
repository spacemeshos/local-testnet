<h1 align="center"><a href="https://spacemesh.io"><img width="400" src="https://spacemesh.io/content/images/2019/05/black_logo_hp.png" alt="Spacemesh logo" /></a><p align="center">A programmable Cryptocurrency</p></h1>
  
# Spacemesh Local Testnet (Localnet)

This repo contains the framework for running a 6 nodes Spacemesh testnet locally on one computer. 
It contains a setup script that clones and builds all the relevant repositories required for running a localnet.
To learn more about the Spacemesh cryptocurrency visit [https://spacemesh.io](https://spacemesh.io) .

## Prerequisites
#### git 
https://git-scm.com/
#### go lang v1.11+
https://golang.org/
https://github.com/moovweb/gvm

#### python3
https://www.python.org/downloads/

#### virtualenv + pip
https://docs.python.org/3/library/venv.html

#### docker
for ubuntu use following instructions:
https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-18-04

## Building & Running

1. Clone this repo to your computer.
2. From the shell run:
```
setup.sh
```

## Working with the Localnet
Please follow the steps in our [localnet guide](https://testnet.spacemesh.io/#/local).

## Troubleshooting
docker cannot run without sudo: please refer to the guide mentioned above
fluentd container does not boot: make sure `logs` dir exists and has `{user}` rw permissions
