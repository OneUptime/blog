# Validation Summary: How to Use Ansible to Set Up a Consul Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- HashiCorp Consul
- Consul agent configuration in HCL
- Consul ACLs and service registration
- systemd service management
- Linux infrastructure automation

## Sources Consulted
- HashiCorp Consul agent configuration documentation: https://developer.hashicorp.com/consul/docs/fundamentals/agent
- HashiCorp Consul configuration file reference: https://developer.hashicorp.com/consul/docs/agent/config/config-files
- HashiCorp Consul ACL agent configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/acl
- HashiCorp Consul service definition reference: https://developer.hashicorp.com/consul/docs/reference/service
- HashiCorp Consul ACL rules reference: https://developer.hashicorp.com/consul/docs/reference/acl/rule
- HashiCorp Consul agent token guide: https://developer.hashicorp.com/consul/docs/secure/acl/token/agent
- HashiCorp Consul datacenter bootstrap guide: https://developer.hashicorp.com/consul/docs/deploy/server/vm/bootstrap
- HashiCorp Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports
- HashiCorp Consul install documentation: https://developer.hashicorp.com/consul/docs/fundamentals/install
- Ansible systemd module documentation: https://docs.ansible.com/ansible/7/collections/ansible/builtin/systemd_module.html

## Issues Found
- The ACL-enabled configuration did not provide agent or service registration tokens. I added vault-backed defaults and an `acl.tokens` block with `agent`, `config_file_service_registration`, and server-side `initial_management` tokens so node and service registration can work when `default_policy` is `deny`.
- The binary installation example downloaded a `.zip` archive but did not ensure an unzip implementation was installed. I added an Ansible package task to install `unzip` before `unarchive`.
- The handlers defined `restart consul` before `reload systemd`, which could restart Consul before systemd had loaded a changed unit file. I reordered the handlers so `daemon_reload` is defined first.
- The reload handler used `consul reload`, which can depend on HTTP API access and ACL credentials. I changed it to use systemd reload, which invokes the unit's `ExecReload` signal path.
- The verification commands did not account for ACLs being enabled. I added an explicit `CONSUL_HTTP_TOKEN` export before running Consul CLI status commands.

## Review Notes
Consul `1.17.1` is not the latest Consul release as of this validation date, but the configuration fields used in the article are still valid for that version. The example still omits production hardening such as TLS certificate distribution, binary checksum verification, firewall rules for Consul ports, and an ACL policy/token creation workflow; those are future improvements rather than syntax errors in the current tutorial.
