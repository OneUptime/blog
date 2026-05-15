# Validation Summary: How to Install and Configure HashiCorp Vault on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Vault
- systemd
- firewalld
- Vault integrated storage / Raft

## Sources Consulted
- HashiCorp Developer documentation: Install Vault - https://developer.hashicorp.com/vault/install
- HashiCorp Developer documentation: Vault configuration parameters - https://developer.hashicorp.com/vault/docs/configuration
- HashiCorp Developer documentation: TCP listener configuration - https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- HashiCorp Developer documentation: Run Vault as a service - https://developer.hashicorp.com/vault/docs/run-as-service
- HashiCorp Developer documentation: Vault server command - https://developer.hashicorp.com/vault/docs/commands/server
- HashiCorp Developer documentation: Vault operator init command - https://developer.hashicorp.com/vault/docs/commands/operator/init
- HashiCorp Developer tutorial: Vault with integrated storage deployment guide - https://developer.hashicorp.com/vault/tutorials/day-one-raft/raft-deployment-guide
- Red Hat Enterprise Linux documentation: Configuring firewalls and packet filters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The installation commands used generic placeholders (`<package-name>`) and unrelated packages (`epel-release`, "Development Tools"). Replaced them with HashiCorp's official RHEL repository setup and Vault package installation commands.
- The verification command used a placeholder package name. Replaced it with `vault version` and `rpm -qi vault`.
- The configuration path `/etc/<service>/config.conf` was not a Vault configuration path. Replaced it with `/etc/vault.d/vault.hcl`.
- The post did not include a valid Vault server configuration. Added a minimal HCL configuration using Vault integrated storage, a TCP listener, UI enablement, and TLS certificate settings.
- The systemd service commands used `<service>` placeholders. Replaced them with the actual `vault` service name.
- The setup test command `sudo <service> --test` is not a valid Vault command. Replaced it with `VAULT_ADDR`, `vault status`, `vault operator init`, and `vault operator unseal` guidance.
- The firewall command used `--add-service=<service>`, but firewalld does not provide a generic Vault service name by default. Replaced it with `--add-port=8200/tcp`, Vault's default listener port.
- Performance and troubleshooting commands used placeholder service names. Replaced them with `vault` and the default Vault API port.

## Review Notes
The corrected configuration assumes valid TLS certificate and key files exist at `/opt/vault/tls/vault.crt` and `/opt/vault/tls/vault.key`. For production, Vault deployments should use routable node addresses, a secure certificate lifecycle, protected unseal key handling, and a full high-availability design.
