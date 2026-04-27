# Validation Summary: How to Configure State Encryption with OpenBao in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (state and plan encryption, `encryption {}` block)
- OpenBao (open-source Vault fork)
- OpenBao Transit Secret Engine
- AES-GCM encryption method
- HCL configuration language
- AppRole authentication (referenced for CI/CD context)

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu OpenBao key provider source: https://github.com/opentofu/opentofu/tree/main/internal/encryption/keyprovider/openbao (`config.go`, `client.go`)
- OpenBao Transit secret engine documentation: https://openbao.org/docs/secrets/transit/
- OpenBao AppRole auth method documentation: https://openbao.org/docs/auth/approle/

## Issues Found

1. **Wrong field name `transit_key`** in `key_provider "openbao"`. The OpenTofu OpenBao key provider config struct (`internal/encryption/keyprovider/openbao/config.go`) defines the field as `key_name` (`hcl:"key_name"`), and it is required. Replaced `transit_key = "tofu-state-key"` with `key_name = "tofu-state-key"` in both the main configuration and the Token Authentication snippet.

2. **Wrong field name `mount`**. The provider uses `transit_engine_path` (default `/transit`), not `mount`. Replaced `mount = "transit"` with `transit_engine_path = "/transit"`.

3. **Invalid AppRole configuration on the key provider.** The post showed `auth_method = "approle"`, `role_id`, and `secret_id` as fields on `key_provider "openbao"`. None of these fields exist on the OpenBao key provider — its config only accepts `address`, `token`, `key_name`, `key_length`, and `transit_engine_path`. Using these unknown arguments would fail HCL validation. Rewrote the AppRole subsection to show the correct workflow: perform AppRole login outside OpenTofu using `bao write -field=token auth/approle/login ...` and pass the resulting client token via `BAO_TOKEN`.

4. **Wrong environment variable names.** The post used `VAULT_ADDR`, `VAULT_TOKEN`, `VAULT_ROLE_ID`, and `VAULT_SECRET_ID`. The OpenTofu OpenBao key provider's client uses the OpenBao SDK's `DefaultConfig()`, which reads `BAO_ADDR` and `BAO_TOKEN` (not the `VAULT_*` variants). The `VAULT_ROLE_ID`/`VAULT_SECRET_ID` envs are not consumed by the key provider at all. Replaced the snippet with `BAO_ADDR` and `BAO_TOKEN` and removed the irrelevant AppRole envs.

5. **Inaccurate conclusion.** The original conclusion claimed "the AppRole authentication method is suitable for CI/CD pipelines, while Kubernetes auth works for workloads running on Kubernetes with OpenBao" — implying the key provider itself supports those auth methods. Reworded to make clear the key provider only accepts a token, and AppRole/Kubernetes auth must be performed outside OpenTofu to obtain that token.

## Review Notes

- The OpenBao Transit policy block (`transit/encrypt/...`, `transit/decrypt/...`, `transit/datakey/plaintext/...`) is left as-is. The OpenTofu OpenBao key provider only calls `transit/datakey/plaintext/<key>` (write) and `transit/decrypt/<key>` (write); the `transit/encrypt/<key>` capability is not strictly needed for OpenTofu-driven state encryption, but listing it is harmless and may be useful if the same policy is reused for other tools.
- The bao CLI commands (`bao secrets enable transit`, `bao write -f transit/keys/<name>`, `bao read transit/keys/<name>`, `bao write -f transit/keys/<name>/rotate`) match the official OpenBao Transit documentation.
- The `Benefits Over PBKDF2` table compares high-level properties accurately. PBKDF2 is a passphrase-based KDF without built-in key management, so the comparison stands.
- An `encrypted_metadata_alias` field also exists on the OpenBao key provider but is optional and not commonly required, so it was not added.
