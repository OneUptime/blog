# Validation Summary: How to Enable Vault TLS and Audit Logging on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- HashiCorp Vault
- Vault TCP listener TLS configuration
- Vault file audit device
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- HashiCorp Vault TCP listener TLS configuration: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp/tcp-tls
- HashiCorp Vault TCP listener configuration: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- HashiCorp Vault file audit device documentation: https://developer.hashicorp.com/vault/docs/audit/file
- HashiCorp Vault `audit enable` CLI documentation: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- HashiCorp Vault run as a service documentation: https://developer.hashicorp.com/vault/docs/deploy/run-as-service
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The post used placeholder service paths and names such as `/etc/<service>/config.conf` and `<service-name>`. I replaced these with Vault's package-managed configuration path `/etc/vault.d/vault.hcl` and the `vault` systemd service name.
- The post did not include an actual Vault TLS listener configuration. I added a valid `listener "tcp"` example using `tls_cert_file`, `tls_key_file`, and `tls_min_version`.
- The post did not enable audit logging despite the title. I added the supported `vault audit enable file file_path=/var/log/vault/audit.log` command and a log directory setup command.
- The firewall example used a placeholder port. I changed it to Vault's default API port, `8200/tcp`.
- The verification section did not check audit logging. I added `vault audit list`.
- The troubleshooting commands used placeholders. I changed them to the Vault service and package names.
- The introduction described audit logs as immutable. I changed this to a detailed record of Vault requests and responses because file audit logs are not inherently immutable.

## Review Notes
The corrected guide assumes Vault is already installed, initialized, and unsealed before audit logging is enabled. In a future revision, the post could add a separate installation and initialization section, but that would be beyond the scope of this validation pass.
