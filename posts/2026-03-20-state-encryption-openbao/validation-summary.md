# Validation Summary: How to Configure State Encryption with OpenBao in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state and plan encryption
- OpenBao Transit secrets engine
- OpenBao policies and token authentication
- OpenBao AppRole authentication
- HCL configuration
- OpenTofu CLI
- OpenBao CLI

## Sources Consulted
- OpenTofu State and Plan Encryption documentation, current v1.11: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu State and Plan Encryption documentation, v1.7: https://opentofu.org/docs/v1.7/language/state/encryption/
- OpenTofu OpenBao key provider source, `config.go`: https://github.com/opentofu/opentofu/blob/v1.11.4/internal/encryption/keyprovider/openbao/config.go
- OpenTofu OpenBao key provider source, `client.go`: https://github.com/opentofu/opentofu/blob/v1.11.4/internal/encryption/keyprovider/openbao/client.go
- OpenBao Transit secrets engine documentation: https://openbao.org/docs/secrets/transit/
- OpenBao Transit secrets engine API documentation: https://openbao.org/api-docs/secret/transit/
- OpenBao AppRole auth method documentation: https://openbao.org/docs/auth/approle/
- OpenBao token create command documentation: https://openbao.org/docs/commands/token/create/
- OpenBao policy documentation: https://openbao.org/docs/concepts/policies/
- OpenBao duration string format documentation: https://openbao.org/docs/concepts/duration-format/

## Issues Found

1. **Incorrect OpenTofu OpenBao key provider fields**: The post used `transit_key_name` and `transit_mount_path`, but the official OpenTofu OpenBao provider schema uses `key_name` and `transit_engine_path`. Fixed the HCL examples to use the supported fields.

2. **Unsupported AppRole configuration inside the OpenTofu key provider**: The post showed `auth_login_path` and `auth_login_params` inside `key_provider "openbao"`, but the OpenTofu provider only supports `address`, `token`, `key_name`, `key_length`, and `transit_engine_path` for OpenBao. Fixed the post to show AppRole as a way to obtain a client token before running OpenTofu.

3. **Incorrect OpenBao policy path for OpenTofu**: The post granted access to `transit/encrypt/terraform-state`, but OpenTofu's OpenBao key provider calls `transit/datakey/plaintext/<key>` to generate data keys and `transit/decrypt/<key>` to decrypt stored data-key ciphertext. Fixed the policy to grant `transit/datakey/plaintext/terraform-state` and `transit/decrypt/terraform-state`.

4. **Incorrect OpenBao environment variable names**: The post used `OPENBAO_ADDR` and `OPENBAO_TOKEN`, but OpenTofu's OpenBao provider and the OpenBao client use `BAO_ADDR` and `BAO_TOKEN`. Fixed the environment variable examples.

5. **Unsupported TLS and retry options in HCL**: The post included `skip_tls_verify`, `ca_cert_file`, `max_retries`, `retry_wait_min`, and `retry_wait_max` inside the OpenTofu OpenBao key provider. These are not supported OpenTofu OpenBao key provider attributes. Removed them from the HCL examples.

6. **Verification command wording was misleading**: The post said `bao audit list` verifies encryption by checking audit logs. That command lists enabled audit devices rather than reading logs. Fixed the wording to say it confirms audit devices are enabled before checking logs for Transit calls.

7. **Existing state migration caveat was missing**: OpenTofu refuses to read existing plaintext state after encryption is enabled unless an unencrypted fallback is used during migration. Added a short note before the first plan/apply step for existing unencrypted state.

8. **Key rotation guidance implied manual rewrap was required for OpenTofu state**: OpenBao retains older key versions for decryption after rotation, and OpenTofu will obtain freshly wrapped data keys on later writes. Adjusted the rewrap example to clarify that it applies to separately managed Transit ciphertexts.

## Review Notes
- Local `tofu`, `bao`, and `vault` binaries were not installed in the workspace, so CLI behavior was validated against official documentation and OpenTofu source code rather than local `--help` output.
- `auto_rotate_period=2592000` is valid because OpenBao duration strings allow values without a unit, interpreted as seconds. A value such as `30d` would be clearer in a future edit.
- `bao token create -period=24h -orphan` is valid, but creating periodic or orphan tokens requires sufficient OpenBao privileges.
