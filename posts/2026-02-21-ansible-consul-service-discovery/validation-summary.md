# Validation Summary: How to Use Ansible with Consul for Service Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- HashiCorp Consul
- Consul service definitions
- Consul catalog and health HTTP APIs
- Consul DNS
- Consul KV
- systemd
- YAML
- HCL

## Sources Consulted
- Ansible community.general.consul module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/consul_module.html
- Ansible community.general.consul_kv module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/consul_kv_module.html
- Ansible community.general.consul_kv lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/consul_kv_lookup.html
- Ansible ansible.builtin.add_host module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/add_host_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- HashiCorp Consul agent configuration file reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file
- HashiCorp Consul service definition reference: https://developer.hashicorp.com/consul/docs/reference/service
- HashiCorp Consul catalog HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/catalog
- HashiCorp Consul DNS documentation: https://developer.hashicorp.com/consul/docs/discover/dns

## Issues Found
- The post described `community.general.consul` as a dynamic inventory plugin, but current Ansible documentation defines it as a module for Consul service and check registration. I replaced that example with a runtime inventory pattern that queries Consul's `/v1/catalog/service/:service_name` API and adds hosts via `ansible.builtin.add_host`.
- The Consul service definition used `meta { ... }`, but Consul documents `meta` as a map. I changed it to `meta = { ... }`.
- The service verification task used `retries` without an `until` condition and did not force the notified reload before checking registration. I added `ansible.builtin.meta: flush_handlers`, registered the URI result, and added `until`.
- The KV lookup used nested Jinja delimiters inside a string literal, which would not interpolate `environment_name` correctly. I changed it to string concatenation with `~`.
- The common use case used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. I updated the task.
- The introductory and takeaway text referred to Consul as an Ansible dynamic inventory source. I adjusted the wording to describe querying Consul to build runtime inventory.

## Review Notes
The examples remain illustrative and assume supporting handlers, variables, Consul ACL permissions, and required Python dependencies such as `py-consul` and `requests` are installed where the Ansible Consul modules or lookups run.
