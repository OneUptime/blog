# Validation Summary: How to Set Up Transit Secrets Engine for Encryption as a Service on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Vault
- Vault Transit secrets engine
- Vault CLI
- Vault policies
- Python
- hvac Python client

## Sources Consulted
- HashiCorp Vault Transit secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/transit
- HashiCorp Vault Transit HTTP API documentation: https://developer.hashicorp.com/vault/api-docs/secret/transit
- HashiCorp Vault encryption as a service tutorial: https://developer.hashicorp.com/vault/tutorials/encryption-as-a-service/eaas-transit
- HashiCorp Vault CLI `write` command documentation: https://developer.hashicorp.com/vault/docs/commands/write
- hvac Transit secrets engine documentation: https://python-hvac.org/en/stable/usage/secrets_engines/transit.html
- HashiCorp Vault Agent caching documentation: https://developer.hashicorp.com/vault/docs/agent/caching
- HashiCorp Vault Transit envelope encryption documentation: https://developer.hashicorp.com/vault/docs/secrets/transit/envelope-encryption

## Issues Found
- The batch encryption example passed `batch_input` as a `key=value` command-line field. Vault CLI documentation states that advanced structures such as arrays should be sent as a JSON blob through stdin. Changed the example to use `vault write ... - << EOF` with a JSON body.
- The sample Transit encryption response included a separate `key_version` row. HashiCorp's Transit examples show the key version embedded in the `vault:vN:` ciphertext prefix, so the extra row was removed.
- The convergent encryption explanation said the same plaintext always produces the same ciphertext. HashiCorp documents this as the same plaintext plus derivation context producing the same ciphertext. Updated the wording and clarified that this supports exact-match indexes, not general search.
- The performance section recommended Vault Agent for caching and connection pooling. Vault Agent caching is for tokens and leased secrets, not caching Transit encryption and decryption operations. Replaced this with connection reuse through a long-lived client.
- The performance section recommended derived keys for client-side encryption. Transit derived keys are not the same as client-side encryption. Updated the recommendation to use Transit data keys for envelope encryption when client-side encryption is needed.

## Review Notes
The core Transit commands, key types, signing and HMAC examples, policy capabilities, rotation flow, minimum decryption version setting, and hvac usage were consistent with current official documentation. The post assumes a default Transit mount path of `transit/`; users who mount the engine elsewhere must adjust paths accordingly.
