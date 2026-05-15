# Validation Summary: How to Install and Configure HashiCorp Consul on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- HashiCorp Consul
- DNF/YUM repositories
- systemd
- firewalld

## Sources Consulted
- HashiCorp Consul install documentation: https://developer.hashicorp.com/consul/install
- HashiCorp Consul agent configuration guide: https://developer.hashicorp.com/consul/docs/fundamentals/agent
- HashiCorp Consul VM deployment guide: https://developer.hashicorp.com/consul/tutorials/production-vms/deployment-guide
- HashiCorp Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports
- HashiCorp Consul agent configuration file reference: https://developer.hashicorp.com/consul/docs/agent/config/config-files
- Red Hat RHEL 9 DNF repository documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat RHEL 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The installation step used `dnf config-manager` without first installing the package that provides repository management helpers. Added `sudo dnf install -y yum-utils`, matching HashiCorp's RHEL package installation instructions.
- The configuration path used a placeholder, `/etc/<service>/config.conf`, which is not a Consul agent configuration path. Replaced it with `/etc/consul.d/consul.hcl`, which HashiCorp documents as the standard Linux Consul configuration directory/file.
- The configuration section did not provide a valid Consul configuration. Added a minimal HCL single-server configuration using documented Consul agent fields: `datacenter`, `data_dir`, `server`, `bootstrap_expect`, and `log_level`.
- The service management commands used `<service-name>` placeholders. Replaced them with the actual systemd unit name, `consul`.
- The firewall section used a generic `<PORT>` placeholder. Replaced it with documented Consul default ports for a basic server agent: `8300/tcp`, `8301/tcp`, `8301/udp`, `8500/tcp`, `8600/tcp`, and `8600/udp`.
- The troubleshooting commands used placeholders for the service and package names. Replaced them with `journalctl -u consul -e --no-pager` and `rpm -q consul`.

## Review Notes
The guide now describes a minimal single-server Consul setup. Production deployments should normally use multiple Consul servers, enable ACLs, configure TLS and gossip encryption, and avoid exposing the HTTP API broadly unless it is secured.
