# Validation Summary: How to Use Vault Transit Secrets Engine for Encryption as a Service on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Vault
- Vault Transit secrets engine
- systemd
- firewalld
- DNF/RPM package management

## Sources Consulted
- HashiCorp Vault install documentation: https://developer.hashicorp.com/vault/install
- HashiCorp Vault configuration parameters: https://developer.hashicorp.com/vault/docs/configuration
- HashiCorp Vault TCP listener configuration: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- HashiCorp Vault Transit secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/transit
- HashiCorp Vault Encryption as a Service Transit tutorial: https://developer.hashicorp.com/vault/tutorials/encryption-as-a-service/eaas-transit
- HashiCorp Vault integrated storage deployment guide: https://developer.hashicorp.com/vault/tutorials/day-one-raft/raft-deployment-guide
- HashiCorp Vault run as a service documentation: https://developer.hashicorp.com/vault/docs/deploy/run-as-service
- Red Hat Enterprise Linux DNF repository documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original post used placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, which were not executable instructions for Vault. Replaced them with the official Vault package name, service name, configuration path, and package verification commands.
- The dependency installation recommended EPEL and Development Tools, which are not required for installing Vault from HashiCorp's RPM repository. Replaced them with `yum-utils`, `jq`, and `firewalld`, which support repository setup, JSON output handling, and firewall configuration.
- The service configuration section did not include a valid Vault configuration. Added a minimal HCL example using integrated storage and a TCP listener with TLS certificate settings.
- The verification step used a nonexistent generic service test command. Replaced it with `vault status`, Vault initialization/unseal commands, Transit engine enablement, key creation, and an encrypt/decrypt test using base64-encoded plaintext as required by Vault Transit.
- The firewall command used `--add-service=<service>`, but Vault does not provide a standard firewalld service name in this context. Replaced it with `--add-port=8200/tcp`, matching Vault's API listener port.
- Troubleshooting and performance commands referenced placeholder service names and ports. Updated them to reference the `vault` service and port `8200`.

## Review Notes
The revised guide is suitable for a single-node test or learning environment. A production Vault deployment should use a highly available storage and seal design, carefully managed TLS certificates, restricted ACL policies, protected unseal/root credentials, and operational procedures for backup, recovery, audit logging, and upgrades.
