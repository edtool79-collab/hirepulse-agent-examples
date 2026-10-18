// Free by default. --pay --wallet-file PATH enables one capped x402 payment.
import { readFile } from 'node:fs/promises';
import { x402Client } from '@x402/core/client';
import { decodePaymentRequiredHeader, encodePaymentSignatureHeader } from '@x402/core/http';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const url = 'https://gethirepulse.xyz/v1/tech-stack';
const receiver = '0xa807d3992d5f6b6e51f7460c47c49058b7dc5126';
const usdc = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const options = { method: 'POST', redirect: 'error' as const,
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: 'linear.app' }) };
let response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
if (response.status === 402) {
  const fileIndex = process.argv.indexOf('--wallet-file');
  if (!process.argv.includes('--pay') || fileIndex < 0 || !process.argv[fileIndex + 1]) {
    throw new Error('HTTP 402: free allowance exhausted; no payment attempted.');
  }
  const terms = decodePaymentRequiredHeader(response.headers.get('PAYMENT-REQUIRED')!);
  if (terms.x402Version !== 2 || terms.resource?.url !== url) throw new Error('Unexpected payment resource.');
  const offers = terms.accepts.filter(p => p.network === 'eip155:8453' && p.scheme === 'exact' &&
    p.asset.toLowerCase() === usdc && p.payTo.toLowerCase() === receiver &&
    BigInt(p.amount) > 0n && BigInt(p.amount) <= 5000n);
  if (offers.length !== 1) throw new Error('Unexpected terms; maximum is 0.005 USDC on Base.');
  const wallet = JSON.parse(await readFile(process.argv[fileIndex + 1], 'utf8'));
  const client = new x402Client().register('eip155:8453', new ExactEvmScheme(privateKeyToAccount(wallet.key)));
  const payload = await client.createPaymentPayload({ ...terms, accepts: offers });
  response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000), headers: {
    ...options.headers, 'PAYMENT-SIGNATURE': encodePaymentSignatureHeader(payload) } });
  // No retry if settlement is uncertain. Never print signed payloads.
}
if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`);
console.log(JSON.stringify({ http: response.status, charged_micro_usd:
  response.headers.get('X-Usage-Charged-Micro-Usd'), result: await response.json() }, null, 2));
