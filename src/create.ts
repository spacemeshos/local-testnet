import chalk from 'chalk';
import boxen from 'boxen';
import {
  getDockerClient,
  getContainerIP,
  getMinerPublicKey,
  pullImage,
  getNewWallet
} from './utils';
import moment from 'moment';
import isValidPath from 'is-valid-path';
import fs from 'fs';
import sleep from 'sleep-promise';
import fetch from 'node-fetch';
import { upAll } from 'docker-compose';
import path from 'path';

export default async command => {
  try {
    console.log(
      boxen('Creating New Network', {
        padding: 1,
        borderColor: 'blue',
        borderStyle: 'classic'
      })
    );
    const docker = await getDockerClient();

    let LogConfig = undefined;
    if (command.elk) {
      console.log(chalk.bold.blue('Starting ELK'));

      await upAll({ cwd: `${path.join(__dirname)}/elk`, log: true });
      LogConfig = {
        Type: 'syslog',
        Config: { 'syslog-address': 'tcp://localhost:9000' }
      };

      console.log(chalk.bold.blue('Waiting for Kibana to be ready'));
      for (;;) {
        let res = null;

        try {
          res = await fetch(
            'http://localhost:5601/api/saved_objects/index-pattern/*?overwrite=true',
            {
              method: 'post',
              body: JSON.stringify({
                attributes: { title: '*', timeFieldName: '@timestamp' }
              }),
              headers: {
                'Content-Type': 'application/json',
                'kbn-xsrf': 'reporting',
                Authorization: 'Basic ZWxhc3RpYzpzcGFjZW1lc2g='
              },
              redirect: 'follow'
            }
          ).then(res => res.text());
        } catch (e) {
          if (
            !e.message.toString().includes('socket hang up') &&
            !e.message.toString().includes('read ECONNRESET')
          ) {
            throw e;
          } else {
            res = 'Kibana server is not ready yet';
          }
        }

        if (res === 'Kibana server is not ready yet') {
          await sleep(5000);
        } else {
          console.log(chalk.bold.blue('Kibana is ready'));
          break;
        }
      }

      console.log(
        chalk.bold.green('Started ELK. Kibana URL: http://localhost:5601')
      );
    }

    let config = command.config;
    if (isValidPath(config)) {
      config = fs.readFileSync(config).toString();
      config = JSON.parse(config);
    } else {
      config = JSON.parse(config);
    }

    let poetImage = command.poetImage.split(':');
    let smImage = command.goSmImage.split(':');

    poetImage = `${poetImage[0]}:${
      poetImage[1] === undefined ? 'latest' : poetImage[1]
    }`;
    smImage = `${smImage[0]}:${
      smImage[1] === undefined ? 'latest' : smImage[1]
    }`;

    try {
      await docker.image.get(poetImage).status();
    } catch (e) {
      if (e.message.includes('No such image')) {
        console.log(chalk.bold.yellow(`Poet Image: ${poetImage} not found`));
        try {
          console.log(chalk.bold.yellow(`Pulling Poet Image: ${poetImage}`));
          await pullImage(poetImage);
          await sleep(5000);
          console.log(chalk.bold.green(`Pulled Poet Image: ${poetImage}`));
        } catch (e) {
          if (e.message.includes('not found')) {
            throw new Error('Poet image not found');
          } else {
            throw e;
          }
        }
      } else {
        throw e;
      }
    }

    try {
      await docker.image.get(smImage).status();
    } catch (e) {
      if (e.message.includes('No such image')) {
        console.log(
          chalk.bold.yellow(`Go-spacemesh Image: ${smImage} not found`)
        );
        try {
          console.log(
            chalk.bold.yellow(`Pulling Go-spacemesh Image: ${smImage}`)
          );
          await pullImage(smImage);
          await sleep(5000);
          console.log(
            chalk.bold.green(`Pulled Go-spacemesh Image: ${smImage}`)
          );
        } catch (e) {
          if (e.message.includes('not found')) {
            throw new Error('Go-spacemesh image not found');
          } else {
            throw e;
          }
        }
      } else {
        throw e;
      }
    }

    if (config.logging) {
      Object.keys(config.logging).forEach(
        key => (config.logging[key] = command.logLevel)
      );
    }

    const genesisTime = moment()
      .add('90', 'seconds')
      .toISOString();

    config.main['genesis-time'] = genesisTime;
    config.main['genesis-active-size'] = command.miners;

    if (!fs.existsSync(command.dataDir)) {
      fs.mkdirSync(command.dataDir);
    }

    fs.writeFileSync(
      `${command.dataDir}/config.json`,
      JSON.stringify(config, null, 2)
    );

    const duration = Math.floor(
      (parseInt(config.main['layer-duration-sec']) *
        parseInt(config.main['layers-per-epoch'])) /
        2
    );
    fs.writeFileSync(
      `${command.dataDir}/config.conf`,
      `duration = "${duration}s"\nn = "15"`,
      { encoding: 'utf8', flag: 'w' }
    );

    console.log(chalk.bold.blue(`Starting Poet`));

    if (LogConfig) {
      LogConfig.Config['tag'] = 'poet';
    }

    await docker.container
      .create({
        Hostname: 'spacemesh.poet',
        Domainname: 'spacemesh.poet',
        name: 'poet',
        Image: poetImage,
        Cmd: [
          '--restlisten=0.0.0.0:5000',
          `--initialduration=${duration}s`,
          `--jsonlog`,
          `--configfile=/share/config.conf`
        ],
        Labels: {
          kind: 'spacemesh'
        },
        ExposedPorts: {
          '5000/tcp': {}
        },
        HostConfig: {
          Binds: [`${command.dataDir}:/share`],
          PortBindings: { '5000/tcp': [{ HostPort: '5000' }] },
          LogConfig
        }
      })
      .then(container => container.start());

    const poetURL = `${await getContainerIP('/poet')}:5000`;
    console.log(chalk.bold.green(`Poet started: ${poetURL}`));

    const minerURLs = [];

    const addMinerConnectionDetails = async (miner, wallet) => {
      await sleep(12000);
      // const url = `spacemesh://${await getMinerPublicKey(
      //   `/node${miner}`
      // )}@${await getContainerIP(`/node${miner}`)}:${5000 + miner}`;
      const url = `/ip4/${await getContainerIP(`/node${miner}`)}/tcp/${5000 +
        miner}/${await getMinerPublicKey(`/node${miner}`)}`;
      minerURLs.push(url);
      console.log(
        chalk.bold.green(
          `Started Node${miner}: ${url}. Rewards Account -> Private key: ${wallet.privateKey}, Public Key: ${wallet.publicKey} and Address: ${wallet.address}`
        )
      );
    };

    //start bootstrap
    console.log(chalk.bold.blue(`Starting Node1 (Type: Bootstrap)`));
    let port = 1;
    await (async () => {
      const exposedPorts = {};
      exposedPorts[`${5000 + port}/tcp`] = {};
      exposedPorts[`${6000 + port}/tcp`] = {};
      exposedPorts[`${7000 + port}/tcp`] = {};
      exposedPorts[`${8000 + port}/tcp`] = {};

      const portBindings = {};
      portBindings[`${5000 + port}/tcp`] = [{ HostPort: `${5000 + port}` }];
      portBindings[`${6000 + port}/tcp`] = [{ HostPort: `${6000 + port}` }];
      portBindings[`${7000 + port}/tcp`] = [{ HostPort: `${7000 + port}` }];
      portBindings[`${8000 + port}/tcp`] = [{ HostPort: `${8000 + port}` }];

      if (LogConfig) {
        LogConfig.Config['tag'] = `node${port}`;
      }

      const wallet = getNewWallet();

      const Cmd = [
        '--config=/share/config.json',
        '--test-mode',
        `--listen=/ip4/0.0.0.0/tcp/${5000 + port}`,
        `--smeshing-coinbase=${wallet.publicKey}`,
        `--poet-server=${poetURL}`,
        `--json-port=${7000 + port}`,
        `--json-server=true`,
        `--smeshing-start=true`,
        `--grpc-port=${6000 + port}`
      ];

      await docker.container
        .create({
          Hostname: `spacemesh.node${port}`,
          Domainname: `spacemesh.node${port}`,
          name: `node${port}`,
          Image: smImage,
          Entrypoint: '/bin/go-spacemesh',
          Cmd,
          ExposedPorts: exposedPorts,
          HostConfig: {
            Binds: [`${command.dataDir}:/share`],
            PortBindings: portBindings,
            LogConfig
          },
          Labels: {
            kind: 'spacemesh'
          }
        })
        .then(container => container.start());

      await addMinerConnectionDetails(port, wallet);
    })();

    console.log(chalk.bold.blue(`Activating Poet`));

    await fetch('http://localhost:5000/v1/start', {
      method: 'post',
      body: JSON.stringify({
        gatewayAddresses: [`${await getContainerIP(`/node1`)}:6001`]
      }),
      headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json());

    console.log(chalk.bold.green(`Poet Activated`));

    let promises = [];

    const bootnodes = minerURLs.join(',');
    for (
      let count = 1;
      count <= parseInt(command.miners) - 1; // whe have one boostrap node
      count++
    ) {
      port++;
      console.log(chalk.bold.blue(`Starting Node${port}`));
      const exposedPorts = {};
      exposedPorts[`${5000 + port}/tcp`] = {};
      exposedPorts[`${6000 + port}/tcp`] = {};
      exposedPorts[`${7000 + port}/tcp`] = {};
      exposedPorts[`${8000 + port}/tcp`] = {};

      const portBindings = {};
      portBindings[`${5000 + port}/tcp`] = [{ HostPort: `${5000 + port}` }];
      portBindings[`${6000 + port}/tcp`] = [{ HostPort: `${6000 + port}` }];
      portBindings[`${7000 + port}/tcp`] = [{ HostPort: `${7000 + port}` }];
      portBindings[`${8000 + port}/tcp`] = [{ HostPort: `${8000 + port}` }];

      if (LogConfig) {
        LogConfig.Config['tag'] = `node${port}`;
      }

      const wallet = getNewWallet();

      const Cmd = [
        '--config=/share/config.json',
        '--test-mode',
        `--listen=/ip4/0.0.0.0/tcp/${5000 + port}`,
        `--smeshing-coinbase=${wallet.publicKey}`,
        `--poet-server=${poetURL}`,
        `--json-port=${7000 + port}`,
        `--json-server=true`,
        `--smeshing-start`,
        '--bootstrap',
        `--bootnodes=${bootnodes}`,
        '--acquire-port=0',
        `--grpc-port=${6000 + port}`
      ];

      await docker.container
        .create({
          Hostname: `spacemesh.node${port}`,
          Domainname: `spacemesh.node${port}`,
          name: `node${port}`,
          Image: smImage,
          Entrypoint: '/bin/go-spacemesh',
          Cmd,
          ExposedPorts: exposedPorts,
          HostConfig: {
            Binds: [`${command.dataDir}:/share`],
            PortBindings: portBindings,
            LogConfig
          },
          Labels: {
            kind: 'spacemesh'
          }
        })
        .then(container => container.start());

      promises.push(addMinerConnectionDetails(port, wallet));
    }

    await Promise.all(promises);

    // Delete Index Pattern
    // var myHeaders = new Headers();
    // myHeaders.append("kbn-xsrf", "reporting");
    // myHeaders.append("Authorization", "Basic ZWxhc3RpYzpzcGFjZW1lc2g=");

    // var requestOptions = {
    //   method: 'DELETE',
    //   headers: myHeaders,
    //   redirect: 'follow'
    // };

    // fetch("http://localhost:5601/api/saved_objects/index-pattern/*", requestOptions)
    //   .then(response => response.text())
    //   .then(result => console.log(result))
    //   .catch(error => console.log('error', error));

    console.log(
      boxen('Network Started', {
        padding: 1,
        borderColor: 'blue',
        borderStyle: 'classic'
      })
    );
  } catch (e) {
    console.log(chalk.bold.red('Error: ' + e.message));
  }
};
