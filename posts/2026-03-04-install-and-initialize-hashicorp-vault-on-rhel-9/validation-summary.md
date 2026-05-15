# Validation Summary: How to Install and Initialize HashiCorp Vault on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- HashiCorp Vault
- DNF/YUM package management
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- HashiCorp Vault install documentation: https://developer.hashicorp.com/vault/install
- HashiCorp Vault configuration documentation: https://developer.hashicorp.com/vault/docs/configuration
- HashiCorp Vault run as a service documentation: https://developer.hashicorp.com/vault/docs/deploy/run-as-service
- HashiCorp Vault operator init command documentation: https://developer.hashicorp.com/vault/docs/commands/operator/init
- HashiCorp Vault operator unseal command documentation: https://developer.hashicorp.com/vault/docs/commands/operator/unseal
- HashiCorp Vault status command documentation: https://developer.hashicorp.com/vault/docs/commands/status
- HashiCorp Vault secrets list command documentation: https://developer.hashicorp.com/vault/docs/commands/secrets/list
- Red Hat Enterprise Linux 9 DNF repository management documentation: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_adding-a-yum-repository_managing-software-with-the-dnf-tool

## Issues Found
- The install step used `dnf config-manager` without installing the plugin that provides it. Added `sudo dnf install -y dnf-plugins-core`.
- The service configuration path used placeholder values (`/etc/<service>/config.conf`) instead of Vault's standard configuration path. Replaced it with `/etc/vault.d/vault.hcl`.
- The service management commands used placeholder service names. Replaced them with the actual `vault` systemd service.
- The post did not include an actual Vault server configuration. Added a minimal single-node HCL example with file storage and a local TCP listener.
- The post did not initialize Vault despite the title and description. Added `VAULT_ADDR`, `vault operator init`, `vault operator unseal`, and `vault login` commands, plus a note that unseal must be repeated until the configured threshold is met.
- The firewall command used a placeholder port. Replaced it with Vault's default API port, `8200/tcp`, and clarified that it should only be opened when Vault listens on a routable address.
- The troubleshooting commands used placeholder service and package names. Replaced them with `vault`-specific commands.

## Review Notes
The updated configuration is appropriate for a local single-node test setup. For production, Vault should be configured with TLS, a durable supported storage backend such as integrated storage, carefully managed unseal or auto-unseal, and a network listener/firewall policy that matches the deployment model.
