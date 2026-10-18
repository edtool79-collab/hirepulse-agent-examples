"""Free by default. --pay --wallet-file PATH enables one capped x402 payment."""
import argparse
import asyncio
import json
from pathlib import Path
import httpx
from x402 import x402Client
from x402.http import decode_payment_required_header, encode_payment_signature_header
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact import ExactEvmScheme
from eth_account import Account

URL = 'https://gethirepulse.xyz/v1/tech-stack'
RECEIVER = '0xa807d3992d5f6b6e51f7460c47c49058b7dc5126'
USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'

async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pay', action='store_true')
    parser.add_argument('--wallet-file', type=Path)
    args = parser.parse_args()
    body = {'domain': 'linear.app'}
    async with httpx.AsyncClient(timeout=120, follow_redirects=False) as http:
        response = await http.post(URL, json=body)
        if response.status_code == 402:
            if not args.pay or not args.wallet_file:
                raise SystemExit('HTTP 402: free allowance exhausted; no payment attempted.')
            terms = decode_payment_required_header(response.headers['PAYMENT-REQUIRED'])
            if terms.x402_version != 2 or terms.resource.url != URL:
                raise SystemExit('Unexpected payment resource or protocol.')
            offers = [p for p in terms.accepts if p.network == 'eip155:8453'
                      and p.scheme == 'exact' and p.asset.lower() == USDC
                      and p.pay_to.lower() == RECEIVER and 0 < int(p.amount) <= 5000]
            if len(offers) != 1:
                raise SystemExit('Unexpected terms; maximum is 0.005 USDC on Base.')
            terms.accepts = offers
            wallet = json.loads(args.wallet_file.read_text(encoding='utf-8'))
            account = Account.from_key(wallet['key'])
            client = x402Client().register('eip155:8453', ExactEvmScheme(EthAccountSigner(account)))
            payload = await client.create_payment_payload(terms)
            response = await http.post(URL, json=body, headers={
                'PAYMENT-SIGNATURE': encode_payment_signature_header(payload)})
            # No retry if settlement is uncertain. Never print signed payloads.
        response.raise_for_status()
        data = response.json()
        print(json.dumps({'http': response.status_code, 'charged_micro_usd':
            response.headers.get('X-Usage-Charged-Micro-Usd'), 'result': data}, indent=2))

if __name__ == '__main__':
    asyncio.run(main())
