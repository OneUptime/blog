# Validation Summary: How to Use Ansible to Configure Service Discovery (Consul)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, inventory, and modules
- HashiCorp Consul servers, clients, service registration, ACLs, and catalog API
- HCL configuration
- Python dynamic inventory scripts
- systemd-managed Linux services

## Sources Consulted
- HashiCorp Consul agent configuration file reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file
- HashiCorp Consul general agent parameters and ports reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general
- HashiCorp Consul ACL bootstrap documentation: https://developer.hashicorp.com/consul/docs/secure/acl/bootstrap
- HashiCorp Consul catalog HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/catalog
- HashiCorp Consul reload command documentation: https://developer.hashicorp.com/consul/commands/reload
- HashiCorp Consul releases index: https://releases.hashicorp.com/consul/
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible dynamic inventory development documentation: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html

## Issues Found
- The Consul version was pinned to `1.17.1`, while current stable Consul 1.x releases are in the `1.22.x` line. Updated the example default to `1.22.7`, and verified the release artifact URL resolves successfully.
- The server configuration enabled ACLs with `default_policy = "deny"` but the article did not bootstrap the ACL system or configure server, client, and service tokens. This would make the deployment and later `consul reload` workflow incomplete. Changed the initial deployment example to leave ACLs disabled and added a short inline note that ACLs should be enabled in a separate token bootstrap rollout.
- The dynamic inventory example always used the Consul node `Address` for `ansible_host`. Consul catalog responses may include a service-specific `ServiceAddress`, and official docs state that the node address should be used only when `ServiceAddress` is empty. Updated the script to use `ServiceAddress` with `Address` as a fallback.
- The initial deployment playbook used `serial: 1` for the Consul server play while `bootstrap_expect` was set to `3` and the post-task waited for a leader. On a fresh deployment, the first single-server batch cannot elect a leader with `bootstrap_expect = 3`. Removed `serial: 1` from the initial server deployment.

## Review Notes
- The article references `consul-client.hcl.j2`, `consul.service.j2`, handlers, and included task files without showing their contents. That is not technically wrong for a shortened blog post, but a future revision could include those snippets or link to a complete repository.
- The example binds Consul client interfaces to `0.0.0.0`, which is functional but should be paired with firewalling, TLS, and ACL hardening in production.
