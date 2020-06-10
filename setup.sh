#! /bin/sh -x
STARTDIR=$PWD
GITHUB=git://github.com
SPACEMESHOS=$GITHUB/spacemeshos
GO_GITHUB=$PWD/src/spacemeshos

git clone $SPACEMESHOS/go-spacemesh.git $GO_GITHUB/go-spacemesh
git clone $SPACEMESHOS/poet.git $GO_GITHUB/poet
git clone $SPACEMESHOS/CLIWallet.git $GO_GITHUB/CLIWallet

echo "building go-spacemesh"
cd $GO_GITHUB/go-spacemesh
make dockerbuild-go || echo "docker-build go-spacemesh failed"

echo "building poet"
cd $GO_GITHUB/poet
make dockerbuild-go || echo "docker-build poet failed"

cd $GO_GITHUB/CLIWallet
make build || echo "build wallet failed"
cp $STARTDIR/accounts.json $GO_GITHUB/CLIWallet/accounts.json

cd $STARTDIR
mkdir Logs

