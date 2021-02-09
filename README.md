# README

# A programmable Cryptocurrency

![https://spacemesh.io/content/images/2019/05/black_logo_hp.png](https://spacemesh.io/content/images/2019/05/black_logo_hp.png)

# Spacemesh Local Testnet (Localnet)

This repo contains the CLI for running a 10 node Spacemesh testnet locally on one computer. To learn more about the Spacemesh cryptocurrency visit [https://spacemesh.io](https://spacemesh.io/) .

## Prerequisites

- OS X or Linux or Windows
- Docker
- NPM
- Docker Compose

## Installing CLI

The local testnet is 100% built from open source code from the Spacemesh github repos, and doesn’t use any prepackaged pre-built binaries.

Install the CLI locally using the following command

```
npm install -g spacemesh-local-testnet
```

## Running

To create a local network run the below command:

```bash
spacemesh-local-testnet create
```

And to delete the network run the below command:

```bash
spacemesh-local-testnet delete
```

You can enter `spacemesh-local-testnet --help` to see the available options. 

## Create Network using Local Go Spacemesh Build

To create a network using go-spacemesh local code, first run the below command in go-spacemesh directory:

```bash
docker build -t spacemesh:local .
```

Then run the following command to use the image build above:

```bash
spacemesh-local-testnet create --go-sm-image=spacemesh:local
```

## Executing Transactions using CLI Wallet

Using CLI wallet you can import cli-wallet.json file and use the account to create token transfer transactions. The account is pre-filled in the genesis configuration.

## Update NPM (Devs Only)

Run the following command locally to publish new version to npm

```
npm run build
cd dist && npm publish
```