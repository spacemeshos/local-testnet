bootstrap_params = {
    "randcon": '4',
    "hare-committee-size": '5',
    "hare-max-adversaries": '2',
    "hare-round-duration-sec": '10',
    "layer-duration-sec": '60',
    "layer-average-size": '10',
    "hare-wakeup-delta": '10',
    "test-mode": "",
    "grpc-server": "",
    "json-server": "",
    "genesis-conf": "/tmp/genesis.json"
}

client_params = {
    **bootstrap_params,
    "bootstrap": ""
}

poet_params = {
    "rpclisten": "0.0.0.0:50002",
    "restlisten": "0.0.0.0:80",
}

genesis_accounts = {
    "Almog": "0x4d05cfede9928bcd225c008db8110cfeb1f01011e118bdb93f1bb14d2052c276",
    "Anton": "0xdb58184012f26c405bff2d8866bf7ef2d1da7f0b391d1f1364f1d695929df617",
    "Gavrad": "0x0dc90fe42d96e302ae122aa3437e320d792772aba8f459f80e18a45ae754112d",
    "Tap": "0x891da146767aa80e3ce3ef826ef675c1bb32e9021844193a163fac231513149a",
    "Yosher": "0x39a27e846f7e9783cd8fcae0f94abe7ba1428df096e13e903ef5b9df85d520e1"
}

bootstrap_coinbase = "097598942e44919cf7d11499887a595e41b097acd0a75d65ed8b8c6fa739d297"
