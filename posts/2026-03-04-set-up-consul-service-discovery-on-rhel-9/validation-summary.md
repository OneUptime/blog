# Validation Summary: How to Set Up Consul Service Discovery on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- HashiCorp Consul
- systemd
- firewalld
- HCL configuration

## Sources Consulted
- HashiCorp Consul install documentation: https://developer.hashicorp.com/consul/install
- HashiCorp Consul agent configuration documentation: https://developer.hashicorp.com/consul/docs/fundamentals/agent
- HashiCorp Consul configuration file reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file
- HashiCorp Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports

## Issues Found
- The post used placeholder paths such as `/etc/<service>/config.conf`. Changed this to `/etc/consul.d/consul.hcl`, which matches Consul's documented configuration directory pattern on Linux.
- The post did not include a valid Consul agent configuration example. Added a minimal HCL configuration for a single Consul server using documented settings such as `datacenter`, `data_dir`, `server`, `bootstrap_expect`, `bind_addr`, `client_addr`, and `log_level`.
- The systemd commands used `<service-name>` placeholders. Replaced them with the Consul service name, `consul`.
- The firewall section used a `<PORT>` placeholder. Replaced it with Consul's documented default ports for server RPC, LAN/WAN Serf, HTTP API, and DNS, including both TCP and UDP where required.
- The troubleshooting commands used placeholder service and package names. Replaced them with `journalctl -u consul -e --no-pager` and `rpm -qa | grep consul`.
- The prerequisites did not state that Consul must already be installed. Added a prerequisite clarifying that Consul should be installed from the HashiCorp package repository.

## Review Notes
The article now provides technically valid single-node Consul setup commands for RHEL-based systems. For a future revision, the guide could include an explicit installation step and distinguish between single-node test setups and production Consul clusters, where multiple server agents and stronger security configuration are recommended.
