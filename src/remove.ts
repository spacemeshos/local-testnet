import { getDockerClient } from './utils';
import boxen from 'boxen';
import chalk from 'chalk';
import { down } from 'docker-compose';
import path from 'path';

export default async () => {
  try {
    console.log(
      boxen('Deleting Network', {
        padding: 1,
        borderColor: 'blue',
        borderStyle: 'classic'
      })
    );

    await down({ cwd: `${path.join(__dirname)}/elk`, log: true });

    const docker = await getDockerClient();
    const containers = await docker.container.list({ all: true });

    const promises = [];

    containers.forEach(container => {
      const data = JSON.parse(JSON.stringify(container.data));
      if (data.Names[0].includes('miner') || data.Names[0].includes('poet')) {
        promises.push(container.delete({ force: true }));
      }
    });

    await Promise.all(promises);

    console.log(
      boxen('Network Deleted', {
        padding: 1,
        borderColor: 'blue',
        borderStyle: 'classic'
      })
    );
  } catch (e) {
    console.log(chalk.bold.red('Error: ' + e.message));
  }
};
