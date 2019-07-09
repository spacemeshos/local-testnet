#! /bin/sh -x

GITHUB=https://github.com
SPACEMESHOS=$GITHUB/spacemeshos
GO_GITHUB=~/go/src/github.com/spacemeshos


git clone $SPACEMESHOS/go-spacemesh.git $GO_GITHUB/go-spacemesh
git clone $SPACEMESHOS/poet.git $GO_GITHUB/poet
git clone $SPACEMESHOS/CLIWallet.git $GO_GITHUB/CLIWallet

echo "building node"
cd $GO_GITHUB/go-spacemesh
make dockerbuild-go || echo "building spacemsh node failed"

echo "building poet"
cd $GO_GITHUB/poet
make dockerbuild-go || echo "building poet failed"

cd $GO_GITHUB/CLIWallet
go get && go build || echo "building wallet failed"
#! /bin/sh

SPACEMESHOS=spacemeshos
GO_GITHUB=~/go/src/github.com/spacemeshos


go get $SPACEMESHOS/go-spacemesh
go get $SPACEMESHOS/poet
go get $SPACEMESHOS/CLIWallet

echo "building node"
cd $GO_GITHUB/go-spacemesh
make dockerbuild-go

cd $GO_GITHUB/poet
make dockerbuild-go

cd $GO_GITHUB/CLIWallet
go build

