#! /bin/sh -x

GITHUB=git://github.com
SPACEMESHOS=$GITHUB/spacemeshos
GO_GITHUB=~/go/src/github.com/spacemeshos


git clone $SPACEMESHOS/go-spacemesh.git $GO_GITHUB/go-spacemesh
git clone $SPACEMESHOS/poet.git $GO_GITHUB/poet
git clone $SPACEMESHOS/CLIWallet.git $GO_GITHUB/CLIWallet

mkdir Logs

echo "building node"
cd $GO_GITHUB/go-spacemesh
make dockerbuild-go || echo "building spacemsh node failed"

echo "building poet"
cd $GO_GITHUB/poet
make dockerbuild-go || echo "building poet failed"

cd $GO_GITHUB/CLIWallet
go get && go build || echo "building wallet failed"


