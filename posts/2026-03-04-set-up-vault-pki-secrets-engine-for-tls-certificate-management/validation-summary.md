# Validation Summary: How to Set Up Vault PKI Secrets Engine for TLS Certificate Management on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Vault
- Vault PKI secrets engine
- systemd
- firewalld
- DNF/RPM package management

## Sources Consulted
- HashiCorp Developer documentation: Set up and use the PKI secrets engine, https://developer.hashicorp.com/vault/docs/secrets/pki/setup
- HashiCorp Developer documentation: Quick start root CA setup, https://developer.hashicorp.com/vault/docs/secrets/pki/quick-start-root-ca
- HashiCorp Developer documentation: PKI secrets engine considerations, https://developer.hashicorp.com/vault/docs/secrets/pki/considerations
- Red Hat Enterprise Linux documentation: Managing software with the DNF tool, installing RHEL content, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/installing-rhel-content

## Issues Found
- The post is a generic placeholder rather than a Vault PKI tutorial. It uses unresolved placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, so the commands cannot be followed as written.
- The post does not include the core Vault PKI workflow documented by HashiCorp, such as enabling the PKI secrets engine, configuring PKI URLs, generating or importing a root/intermediate CA, creating a role, and issuing certificates through a role endpoint.
- The RHEL package-management examples are generic and not tied to Vault installation or configuration. The `dnf install <package-name>` and `rpm -qi <package-name>` examples are placeholders, not executable setup instructions for Vault.
- The service-management and firewall examples are also placeholders. They do not identify the Vault service name, Vault listener port, Vault configuration path, or any Vault-specific verification command.

## Review Notes
This post should be removed or replaced with a real Vault PKI guide. A corrected version would need substantial new technical content rather than small accuracy edits, so the README was not modified during validation.
