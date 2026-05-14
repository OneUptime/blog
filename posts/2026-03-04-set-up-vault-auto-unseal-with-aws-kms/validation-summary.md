# Validation Summary: How to Set Up Vault Auto-Unseal with AWS KMS on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Vault
- AWS KMS
- systemd
- firewalld

## Sources Consulted
- HashiCorp Vault AWS KMS seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/awskms
- HashiCorp Vault installation documentation: https://developer.hashicorp.com/vault/install
- HashiCorp Vault seal/unseal concepts: https://developer.hashicorp.com/vault/docs/concepts/seal
- Red Hat Enterprise Linux firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The post is a generic placeholder template rather than a usable Vault auto-unseal guide. It uses placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf` instead of the actual Vault package, service, and configuration path.
- The post does not include the required Vault AWS KMS seal configuration, such as a `seal "awskms"` stanza with a KMS key ID and region.
- The installation steps do not follow HashiCorp's documented RHEL package installation flow, which requires configuring the HashiCorp RPM repository before installing the `vault` package.
- The verification command `sudo <service> --test` is not a valid Vault verification command. Vault configuration validation is normally performed with commands such as `vault server -config=...` or by checking the configured service logs after startup.
- The firewall example uses `--add-service=<service>`, but Vault is not a built-in firewalld service name by default. A correct guide would need to open the Vault listener port or define a service explicitly.

## Review Notes
The README was not edited because the problems are structural placeholder content rather than isolated technical mistakes. Correcting it would require replacing the post with a new tutorial, including AWS KMS prerequisites, IAM permissions, Vault installation, Vault listener and storage configuration, the AWS KMS seal stanza, initialization behavior with recovery keys, service startup, and validation steps.
