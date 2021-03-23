import { Docker } from 'node-docker-api';
import sleep from 'sleep-promise';
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
import EthCrypto from 'eth-crypto';

export async function getDockerClient() {
  try {
    await docker.container.list();
  } catch (e) {
    if (e.message.includes('ECONNREFUSED')) {
      throw new Error('Docker is not running');
    } else {
      throw e;
    }
  }

  return docker;
}

export async function getContainerIP(name) {
  const containers = await docker.container.list();

  let ip = null;

  containers.forEach(container => {
    const data = JSON.parse(JSON.stringify(container.data));
    if (data.Names.includes(name)) {
      ip = data.NetworkSettings.Networks.bridge.IPAddress;
    }
  });

  return ip;
}

export async function executeCommand(container, command) {
  let data = null;
  const promisifyStream = stream =>
    new Promise((resolve, reject) => {
      stream.on('data', d => (data = d.toString()));
      stream.on('end', () => {
        resolve(data);
      });
      stream.on('error', reject);
    });
  ///root/spacemesh/*/p2p/nodes/*/id.json
  let output = await container.exec
    .create({
      AttachStdout: true,
      AttachStderr: true,
      Cmd: command
    })
    .then(exec => {
      return exec.start({ Detach: false });
    })
    .then(stream => promisifyStream(stream));

  return output;
}

export async function getMinerPublicKey(name) {
  const containers = await docker.container.list();

  let container = null;

  containers.forEach(c => {
    const data = JSON.parse(JSON.stringify(c.data));
    if (data.Names.includes(name)) {
      container = c;
    }
  });

  for (;;) {
    try {
      const networkId = (await executeCommand(container, [
        'ls',
        '/root/spacemesh'
      ])).replace(/\D/g, '');
      let path = `/root/spacemesh/${networkId.toString()}/p2p/nodes`;
      let nodeId = await executeCommand(container, ['ls', path]);
      nodeId = nodeId.replace('\n', '');
      let removeChars = nodeId.length - 44;
      nodeId = nodeId.substring(removeChars);
      nodeId = nodeId.replace(',', '');
      path = `${path}/${nodeId}/id.json`;
      let json = await executeCommand(container, ['cat', path]);
      json = json.substring(8);
      json = JSON.parse(json);
      return json.pubKey;
    } catch (e) {
      await sleep(2000);
    }
  }
}

export async function pullImage(name) {
  const promisifyStream = stream =>
    new Promise((resolve, reject) => {
      stream.on('data', d => console.log(d.toString()));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

  await docker.image
    .create({}, { fromImage: name.split(':')[0], tag: name.split(':')[1] })
    .then(stream => promisifyStream(stream))
    .then(() => docker.image.get(name).status())
    .then(image => image.history())
    .then(events => console.log(events));
}

export function getNewWallet() {
  const identity = EthCrypto.createIdentity();
  return {
    privateKey: identity.privateKey.substring(2),
    publicKey: EthCrypto.publicKey.compress(identity.publicKey),
    address: EthCrypto.publicKey.toAddress(identity.publicKey)
  };
}
