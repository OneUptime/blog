# Validation Summary: How to Store and Retrieve Secrets with Vault on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- HashiCorp Vault
- Vault KV v2 secrets engine
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- HashiCorp Vault install documentation: https://developer.hashicorp.com/vault/install
- HashiCorp Vault configuration documentation: https://developer.hashicorp.com/vault/docs/configuration
- HashiCorp Vault TCP listener configuration documentation: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- HashiCorp Vault KV secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/kv
- HashiCorp Vault KV v2 setup documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/setup
- HashiCorp Vault versioned KV tutorial: https://developer.hashicorp.com/vault/tutorials/secrets-management/versioned-kv
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The original post started at Step 2 and did not install Vault. Added a Step 1 using HashiCorp's RHEL package repository and `dnf` commands appropriate for RHEL 9.
- The original service configuration used placeholders such as `/etc/<service>/config.conf` and `<service-name>`. Replaced them with Vault's configuration path, `/etc/vault.d/vault.hcl`, and the `vault` systemd unit.
- The original post did not include a valid Vault configuration. Added a minimal Vault HCL configuration using integrated Raft storage and a local TCP listener.
- The original firewall example used `<PORT>`. Replaced it with Vault's default API port, `8200/tcp`.
- The original verification only checked `vault status` and `vault secrets list`, but did not show how to store or retrieve secrets. Added Vault initialization, unseal, login, KV v2 enablement, `vault kv put`, and `vault kv get` commands.
- The troubleshooting section used placeholder package and service names. Replaced them with `vault` and `rpm -q vault`.

## Review Notes
The example disables TLS and binds Vault to `127.0.0.1` for a local tutorial setup. Production deployments should use TLS, a carefully chosen listener address, appropriate policies instead of the initial root token, secure storage of unseal keys, and a reviewed high-availability design.
