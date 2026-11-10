// One-step deploy: creates the data store and notification keys on first run, then publishes GLOW.
// Needs CLOUDFLARE_API_TOKEN (and CLOUDFLARE_ACCOUNT_ID if the token sees several accounts).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { generateVapidKeys } from '../worker/push.js';

// stdin is not a terminal, so wrangler never stops to ask questions
const run = (cmd, input) => execSync(cmd, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'inherit'], input, encoding: 'utf8', shell: true });
const tryRun = cmd => { try { return run(cmd); } catch (e) { return ''; } };
let toml = fs.readFileSync('wrangler.toml', 'utf8');

if (toml.includes('REPLACE_WITH_KV_ID')) {
  console.log('Veri deposu (KV) oluşturuluyor…');
  const out = run('npx wrangler kv namespace create GLOW');
  const id = (out.match(/id = "([0-9a-f]{32})"/) || out.match(/"id":\s*"([0-9a-f]{32})"/) || [])[1];
  if (!id) { console.error(out); throw new Error('KV id okunamadı'); }
  toml = toml.replace('REPLACE_WITH_KV_ID', id); fs.writeFileSync('wrangler.toml', toml);
}

const secrets = tryRun('npx wrangler secret list');
if (!secrets.includes('VAPID_PRIVATE_JWK')) {
  console.log('Bildirim anahtarları oluşturuluyor…');
  const v = await generateVapidKeys();
  run('npx wrangler deploy');               // the worker must exist before secrets can be set
  run('npx wrangler secret put VAPID_PUBLIC_KEY', v.publicKey);
  run('npx wrangler secret put VAPID_PRIVATE_JWK', v.privateJwk);
}
const out = run('npx wrangler deploy');
console.log(out);
const url = (out.match(/https:\/\/[^\s]+workers\.dev/) || [])[0];
if (url) console.log('\n✨ GLOW hazır: ' + url + '\nBu adresi iPhone\'da Safari ile aç → Paylaş → Ana Ekrana Ekle.');
