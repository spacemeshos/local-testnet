<h1 align="center"><a href="https://spacemesh.io"><img width="400" src="https://spacemesh.io/content/images/2019/05/black_logo_hp.png" alt="Spacemesh logo" /></a><p align="center">A programmable Cryptocurrency</p></h1>
  
# Spacemesh Local Testnet (Localnet)

This repo contains the framework for running a 6 node Spacemesh testnet locally on one computer. 
It contains a setup script that clones and builds all the relevant repositories required for running a localnet.
To learn more about the Spacemesh cryptocurrency visit [https://spacemesh.io](https://spacemesh.io) .

<img src="https://spacemesh.io/content/images/2019/07/localnet_grab.jpg">

## Prerequisites
- [git](https://git-scm.com/)
- [go lang v1.11+](https://golang.org/)
- [python3](https://www.python.org/downloads/)
- [virtualenv + pip](https://docs.python.org/3/library/venv.html)
- Docker. For Ubuntu follow [this nice guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-18-04). For OS X download from https://www.docker.com/ 

### OS X setup

- Install [docker](https://www.docker.com/)
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

1. Clone this repo to your computer

2. Setup [git for automation](https://help.github.com/en/articles/git-automation-with-oauth-tokens)

3. From the shell run:
```
sudo chmod u+x setup.sh
./setup.sh
``` 

4. Create virtual environment for running the testnet
```
virtualenv --python=python3 venv
```

5. Activate virtual env and install requirements
```
source venv/bin/activate
pip install -r requirements.txt
```

## Running

```
python testnet.py
```
Logs are available in the `logs` directory.

### Executing Transactions

1. Navigate to CLIWallet directory in your go `src` directory.
```
cd $GOPATH/src/github.com/spacemeshos/CLIWallet
```

2. Run 
```
./CLIWallet
```
3. You should see a list of accounts. Choose one. e.g. enter `anton`
4. Enter `account`  to view anton's account balance
5. Enter `transfer coins` to transfer coin to another account and follow the on-screen instructions

## Working with the Localnet
Please follow the steps in our [localnet guide](https://testnet.spacemesh.io/#/local).

## Troubleshooting
- Docker cannot run without sudo: please refer to [this guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-18-04)
- Fluentd container does not boot: make sure `logs` dir exists and has `{user}` rw permissions
- Nodes stop producing blocks after 30 min - this is an issue with dockers DNS resolving, adding custom dns address to docker config should solve this problem
