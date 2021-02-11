import chalk from 'chalk';
import boxen from 'boxen';
import {
  getDockerClient,
  getContainerIP,
  getMinerPublicKey,
  pullImage
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
          console.log('Error: ', e.message.toString());
          if (!e.message.toString().includes('socket hang up')) {
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

    let genesis = command.genesisConf;
    if (isValidPath(genesis)) {
      genesis = fs.readFileSync(genesis).toString();
      genesis = JSON.parse(genesis);
    } else {
      genesis = JSON.parse(genesis);
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

    const genesisTime = moment()
      .add('60', 'seconds')
      .toISOString();

    if (!config.main) {
      config.main = {
        'genesis-time': genesisTime,
        'layer-duration-sec': 30,
        'layers-per-epoch': 3,
        'genesis-active-size': command.miners
      };
    } else {
      config.main['genesis-time'] = genesisTime;
      config.main['genesis-active-size'] = command.miners;
    }

    if (!config.main['layer-duration-sec']) {
      config.main['layer-duration-sec'] = 30;
    }

    if (!config.main['layers-per-epoch']) {
      config.main['layers-per-epoch'] = 30;
    }

    if (!fs.existsSync(command.dataDir)) {
      fs.mkdirSync(command.dataDir);
    }

    fs.writeFileSync(
      `${command.dataDir}/config.json`,
      JSON.stringify(config, null, 2)
    );
    fs.writeFileSync(
      `${command.dataDir}/genesis.json`,
      JSON.stringify(genesis, null, 2)
    );

    const duration =
      parseInt(config.main['layer-duration-sec']) *
      parseInt(config.main['layers-per-epoch']);
    fs.writeFileSync(
      `${command.dataDir}/config.conf`,
      `duration = "${duration}s"\nn = "21"`,
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

    const addMinerConnectionDetails = async miner => {
      await sleep(12000);
      const url = `spacemesh://${await getMinerPublicKey(
        `/miner${miner}`
      )}@${await getContainerIP(`/miner${miner}`)}:${5000 + miner}`;
      minerURLs.push(url);
      console.log(chalk.bold.green(`Started Miner${miner}: ${url}`));
    };

    //start bootstrap
    console.log(chalk.bold.blue(`Starting Miner1 (Type: Bootstrap)`));
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
        LogConfig.Config['tag'] = `miner${port}`;
      }

      await docker.container
        .create({
          Hostname: `spacemesh.miner${port}`,
          Domainname: `spacemesh.miner${port}`,
          name: `miner${port}`,
          Image: smImage,
          Entrypoint: '/bin/go-spacemesh',
          Cmd: [
            '--config=/share/config.json',
            '--grpc-server',
            '--test-mode',
            `--tcp-port=${5000 + port}`,
            `--coinbase=${command.coinbase}`,
            `--acquire-port=0`,
            `--poet-server=${poetURL}`,
            `--grpc-port=${6000 + port}`,
            `--json-port=${7000 + port}`,
            `--grpc-port-new=${8000 + port}`,
            `--start-mining`,
            `--genesis-conf=/share/genesis.json`
          ],
          ExposedPorts: exposedPorts,
          HostConfig: {
            Binds: [`${command.dataDir}:/share`],
            PortBindings: portBindings,
            LogConfig
          }
        })
        .then(container => container.start());

      await addMinerConnectionDetails(port);
    })();

    let promises = [];

    for (let count = 1; count <= parseInt(command.bootnodes); count++) {
      port++;
      console.log(chalk.bold.blue(`Starting Miner${port} (Type: Bootnode)`));
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
        LogConfig.Config['tag'] = `miner${port}`;
      }

      await docker.container
        .create({
          Hostname: `spacemesh.miner${port}`,
          Domainname: `spacemesh.miner${port}`,
          name: `miner${port}`,
          Image: smImage,
          Entrypoint: '/bin/go-spacemesh',
          Cmd: [
            '--config=/share/config.json',
            '--grpc-server',
            '--test-mode',
            `--tcp-port=${5000 + port}`,
            `--coinbase=${command.coinbase}`,
            `--acquire-port=0`,
            `--poet-server=${poetURL}`,
            `--grpc-port=${6000 + port}`,
            `--json-port=${7000 + port}`,
            `--grpc-port-new=${8000 + port}`,
            `--start-mining`,
            '--bootstrap',
            `--bootnodes=${minerURLs[0]}`,
            '--acquire-port=0',
            `--genesis-conf=/share/genesis.json`
          ],
          ExposedPorts: exposedPorts,
          HostConfig: {
            Binds: [`${command.dataDir}:/share`],
            PortBindings: portBindings,
            LogConfig
          }
        })
        .then(container => container.start());

      promises.push(addMinerConnectionDetails(port));
    }

    await Promise.all(promises);

    const bootnodes = minerURLs.slice(1).join(',');

    for (
      let count = 1;
      count <= parseInt(command.miners) - parseInt(command.bootnodes) - 1;
      count++
    ) {
      port++;
      console.log(chalk.bold.blue(`Starting Miner${port}`));
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
        LogConfig.Config['tag'] = `miner${port}`;
      }

      await docker.container
        .create({
          Hostname: `spacemesh.miner${port}`,
          Domainname: `spacemesh.miner${port}`,
          name: `miner${port}`,
          Image: smImage,
          Entrypoint: '/bin/go-spacemesh',
          Cmd: [
            '--config=/share/config.json',
            '--grpc-server',
            '--test-mode',
            `--tcp-port=${5000 + port}`,
            `--coinbase=${command.coinbase}`,
            `--acquire-port=0`,
            `--poet-server=${poetURL}`,
            `--grpc-port=${6000 + port}`,
            `--json-port=${7000 + port}`,
            `--grpc-port-new=${8000 + port}`,
            `--start-mining`,
            '--bootstrap',
            `--bootnodes=${bootnodes}`,
            '--acquire-port=0',
            `--genesis-conf=/share/genesis.json`
          ],
          ExposedPorts: exposedPorts,
          HostConfig: {
            Binds: [`${command.dataDir}:/share`],
            PortBindings: portBindings,
            LogConfig
          }
        })
        .then(container => container.start());

      promises.push(addMinerConnectionDetails(port));
    }

    await Promise.all(promises);

    console.log(chalk.bold.blue(`Activating Poet`));
    await fetch('http://localhost:5000/v1/start', {
      method: 'post',
      body: JSON.stringify({
        gatewayAddresses: [`${await getContainerIP(`/miner2`)}:6002`]
      }),
      headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json());
    console.log(chalk.bold.green(`Poet Activated`));

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
