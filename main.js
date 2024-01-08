const {RippleAPI} = require('ripple-lib');
const fs = require('fs');

const sleep = (timeountMS) => new Promise((resolve) => {
  setTimeout(resolve, timeountMS);
});

const ripple = new RippleAPI();

const remote = new RippleAPI({ server : "wss://s1.ripple.com", feeCushion : 1.2, maxFeeXRP : "0.01" });
remote.connection._config.connectionTimeout = 10000;
remote.on('connected', () => { console.log('Remote connected'); });
remote.on('disconnected', (code) => { console.log('Remote disconnected, code:', code); });
remote.on('error', (errorCode, errorMessage) => { console.log('Remote error(' + errorCode + '): ' + errorMessage); });

async function trustline(address) {
  let lines = await remote.getTrustlines(address);
  for (let line of lines) {
    if (line.specification.counterparty == "rN1bCPAxHDvyJzvkUso1L2wvXufgE4gXPL") {
      return line.specification.limit > 10000000;
    }
  }
  return false;
}

async function payment(txt, address, secret) {
  const amount = { currency : "XRP", value: "0.1" }
  const payment = {
      "source": {
        "address": address,
        "maxAmount": amount
      },
      "destination": {
        "address": "r4eLeum9n4UQtnANDbgpaGLn9uSgcYXRps",
        "amount": amount
      }
  }
  const json = {tick: 'xrps', op: 'mint', txt: txt};
  payment.memos = [{data: JSON.stringify(json), type: 'xrc20', format: 'text'}];

  try {
    let prepared = await remote.preparePayment(address, payment);
    const {signedTransaction} = remote.sign(prepared.txJSON, secret);
    let result = await remote.submit(signedTransaction);
    if ("tesSUCCESS" !== result.engine_result && "terQUEUED" !== result.engine_result) {
      throw new Error(result.engine_result);
    }
    return result;
  } catch (err) {
    if (err.data) {
      throw new Error(err.data.engine_result);
    }
    throw err;
  }
}

async function mint(address, secret) {
  const path = 'input.txt';
  const data = fs.readFileSync(path, 'utf8');
  const lines = data.split('\n');

  let tasks = [];
  for (let i=0; i<lines.length; i++) {
    let line = lines[i].trim();
    if (line.length) {
      tasks.push(line);
    }
  }

  console.log("WARNING: There is a maximum number limit per account, this script does not check this limit. If the number of lines exceeds the limit, you will waste additional XRP.");
  console.log(`${tasks.length} lines. We will start in 3s.`);
  await sleep(3000);

  let fail_num = 0;
  for (let i=0; i<tasks.length; i++) {
    let line = tasks[i];
    try {
      let result = await payment(line, address, secret);
      console.log(i+1, line, result.resultCode);
      // If submitted too quickly, the IP will be blocked.
      await sleep(6000);
    } catch (err) {
      console.log(i+1, line, err.message);
      fail_num++;
    }
  }
  console.log(`${fail_num} lines failed.`);
}

async function main() {
  try {
    const secret = "YOUR_SECRET";
    const keypair = remote.deriveKeypair(secret);
    const address = RippleAPI.deriveClassicAddress(keypair.publicKey);

    await remote.connect();
    if (await trustline(address)) {
      await mint(address, secret);
    } else {
      console.log("You need to add XRPS trustline!");
    }
  } catch(err) {
    console.error(err);
  }
}

main();
