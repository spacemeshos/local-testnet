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

