<h1 align="center"><a href="https://spacemesh.io"><img width="400" src="https://spacemesh.io/content/images/2019/05/black_logo_hp.png" alt="Spacemesh logo" /></a><p align="center">A programmable Cryptocurrency</p></h1>

# Spacemesh Local Testnet (Localnet)

This repo contains the framework for running a 6 node Spacemesh testnet locally on one computer.
It contains a setup script that clones and builds all the relevant repositories required for running a localnet.
To learn more about the Spacemesh cryptocurrency visit [https://spacemesh.io](https://spacemesh.io) .

<img src="https://spacemesh.io/content/images/2019/07/localnet_grab.jpg">

> Warning: The local testnet is an experimental alpha software in active development. It is built for developers who are comfortable with the command line, Docker, and dev env setup. You also need a strong modern dev computer to run it such as a Macbook Pro or a strong modern dev desktop computer. That said, we have tested it to work on all supported platforms and most of the issues we see are env setup.

## Prerequisites
- OS X or Linux. Windows 10 Pro support is being tested.
- [git](https://git-scm.com/)
- [go lang v1.11+](https://golang.org/)
- [python3](https://www.python.org/downloads/)
- [virtualenv + pip](https://docs.python.org/3/library/venv.html)
- Docker. Please read this guide for [Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-18-04). For OS X download and install Docker Desktop from https://hub.docker.com/editions/community/docker-ce-desktop-mac

### OS X setup
- Install [docker desktop](https://www.docker.com/)
- Install [brew](https://brew.sh/)

- Run the following from the terminal:
```
brew install git
brew install go
brew install python3
brew install docker
sudo easy_install pip
pip install virtualenv
```

## Building from Source Code
The local testnet is 100% built from open source code from the Spacemesh github repos, and doesn't use any prepackaged pre-built binaries.

1. Clone this repo to your computer
```
git clone https://github.com/spacemeshos/local-testnet.git
```

2. From the shell run:
```
sudo chmod u+x setup.sh
./setup.sh
```

3. Create virtual environment for running the testnet
```
virtualenv --python=python3 venv
```

4. Activate virtual env and install requirements
```
source venv/bin/activate
pip install -r requirements.txt
```

## Running

> Note that the localnet includes an instance of the POET service which is a CPU intensive process. For public testnets and the mainnet, you will not need to run a local POET service instance only 1 full node instance. You need a relatively strong dev box such as a modern MBP to run the localnet.

1. Activate virtual env if you are not already in a virtual env session:
```
source venv/bin/activate
```

2. Let it rip:
```
python testnet.py
```

The testnet logs are available in the `Logs` directory.

### Executing Transactions

1. Open a new Terminal window and navigate to the `CLIWallet` directory in your go `src` directory:

```
cd $GOPATH/src/github.com/spacemeshos/CLIWallet
```

2. Run the wallet
```
./CLIWallet
```
3. You should see a list of accounts. Choose one. e.g. enter `anton`
4. Enter `account`  to view Anton's account balance
5. Enter `transfer coins` to transfer coin to another account and follow the on-screen instructions

## Working with the Localnet
- Please follow the steps in our [localnet guide](https://testnet.spacemesh.io/#/local).

## Troubleshooting
- Docker cannot run without sudo: please refer to [this guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-18-04)
- Container does not boot: make sure `logs` dir exists and has `{user}` rw permissions
- Nodes stop producing blocks after 30 min - this is an issue with dockers DNS resolving, adding custom dns address to docker config should solve this problem

## Linux Setup Tips
- Follow the instructions in [this guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-18-04) to setup Docker desktop on Ubuntu

## Questions, Comments, Feedback?
- Spacemesh [dev gitter channel](https://gitter.im/spacemesh-os/Lobby)

---

## Windows Setup Tips (WIP)
- You need to use Win 10 Pro - Win 10 Home is not supported because it doesn't support Docker Desktop.
- You need to enable virtualization to run Docker desktop in Windows 10 Pro.
- Use the git bash console to run things and not the command line.
- Use these guides to setup python, pip and and virtual env:
  - to be added
