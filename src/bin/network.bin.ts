#!/usr/bin/env node
import * as packgeJSON from '../../package.json';
import commander from 'commander';
import create from '../create';
import remove from '../remove';
const homedir = require('os').homedir();
import config from '../config.json';
import genesis from '../genesis.json';

commander
    .version(packgeJSON.version)
    .arguments('[create] [delete]')
    .option(
        '-c --config <string>',
        'Load configuration from file',
        JSON.stringify(config)
    )
    .option(
        '--genesis-conf <string>',
        'Load genesis configuration from file',
        JSON.stringify(genesis)
    )
    .option('-m --miners <string>', `Number of nodes to setup`, '10')
    .option(
        '-b --bootnodes <string>',
        `Number of bootnodes to setup. It should be <= miners - 1`,
        '5'
    )
    .option(
        '-d --data-dir <string>',
        `Specify data directory (default ${homedir}/spacemesh-local)`,
        `${homedir}/spacemesh-local`
    )
    .option(
        '--coinbase <string>',
        `Coinbase for the miners`,
        `7566a5e003748be1c1a999c62fbe2610f69237f57ac3043f3213983819fe3ea5`
    )
    .option(
        '--go-sm-image <string>',
        'Docker image of go spacemesh build',
        'spacemeshos/go-spacemesh:v0.1.23'
    )
    .option(
        '--poet-image <string>',
        'Docker image of PoET build',
        'spacemeshos/poet:73488d6'
    )
    .action(async (operation, options, command) => {
        if (operation === 'create') {
            await create(command);
        } else if (operation === 'delete') {
            await remove();
        }
    })
    .parse(process.argv);
