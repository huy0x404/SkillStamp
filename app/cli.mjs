// SkillStamp CLI. Function names match the contract's public methods (AGENT.md section 7).
// TODO(verify): genlayer-js import paths and waitForTransactionReceipt options (AGENT.md section 9).
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const { CONTRACT_ADDRESS, PRIVATE_KEY } = process.env;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

if (!CONTRACT_ADDRESS) fail("set CONTRACT_ADDRESS (the deployed SkillStamp address)");

// Without PRIVATE_KEY a throwaway account is used: fine for reads, and for Studio demos.
const account = PRIVATE_KEY ? createAccount(PRIVATE_KEY) : createAccount();
const client = createClient({ chain: studionet, account });

// Contract views may return Map / bigint; make them printable.
function plain(value) {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Map) return Object.fromEntries([...value].map(([k, v]) => [k, plain(v)]));
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  }
  return value;
}

async function write(functionName, args) {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  });
  // Report success only after the receipt, never right after sending.
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 3000,
  });
  return { hash, receipt };
}

async function read(functionName, args = []) {
  return plain(await client.readContract({ address: CONTRACT_ADDRESS, functionName, args }));
}

async function claim_skill(skill, url) {
  const { hash } = await write("claim_skill", [skill, url]);
  const count = await read("get_count");
  console.log(`Claim created (tx ${hash}). claim_id = ${count - 1}`);
}

async function verify(id) {
  const { hash } = await write("verify", [Number(id)]);
  console.log(`Verified (tx ${hash}).`);
  console.log(JSON.stringify(await read("get_claim", [Number(id)]), null, 2));
}

async function get_claim(id) {
  console.log(JSON.stringify(await read("get_claim", [Number(id)]), null, 2));
}

async function get_claims_by_owner(owner) {
  console.log(JSON.stringify(await read("get_claims_by_owner", [owner]), null, 2));
}

async function get_badges(owner) {
  console.log(JSON.stringify(await read("get_badges", [owner]), null, 2));
}

async function get_badge_metadata(id) {
  console.log(JSON.stringify(await read("get_badge_metadata", [Number(id)]), null, 2));
}

async function get_count() {
  console.log(await read("get_count"));
}

const commands = {
  claim: [claim_skill, 2, 'claim "<skill>" <url>'],
  verify: [verify, 1, "verify <claim_id>"],
  get: [get_claim, 1, "get <claim_id>"],
  mine: [get_claims_by_owner, 1, "mine <owner_address>"],
  badges: [get_badges, 1, "badges <owner_address>"],
  metadata: [get_badge_metadata, 1, "metadata <claim_id>"],
  count: [get_count, 0, "count"],
};

const [name, ...args] = process.argv.slice(2);
const entry = commands[name];
if (!entry) {
  fail(`unknown command. Usage:\n  ${Object.values(commands).map((c) => c[2]).join("\n  ")}`);
}
if (args.length < entry[1]) fail(`usage: node cli.mjs ${entry[2]}`);

try {
  await entry[0](...args);
} catch (err) {
  fail(err?.shortMessage ?? err?.message ?? String(err));
}
