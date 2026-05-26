# Validation Summary: How to Create Ansible Inventory from Consul Service Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible dynamic inventory
- Ansible inventory scripts
- HashiCorp Consul service discovery
- Consul Catalog HTTP API
- Consul Health HTTP API
- Consul KV store
- Python

## Sources Consulted
- Ansible dynamic inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- Ansible inventory script development guide: https://docs.ansible.com/projects/ansible-core/2.17/dev_guide/developing_inventory.html
- Ansible inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html
- Ansible inventory plugin index: https://docs.ansible.com/projects/ansible/latest/collections/index_inventory.html
- Ansible community.general collection plugin index: https://docs.ansible.com/projects/ansible/10/collections/community/general/
- ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- Consul Catalog HTTP API: https://developer.hashicorp.com/consul/api-docs/catalog
- Consul Health HTTP API: https://developer.hashicorp.com/consul/api-docs/health
- Consul KV Store HTTP API: https://developer.hashicorp.com/consul/api-docs/kv
- Consul service definition reference: https://developer.hashicorp.com/consul/docs/reference/service

## Issues Found
- The post claimed that Ansible includes a `community.general.consul` inventory plugin. Current Ansible and community.general documentation do not list a Consul inventory plugin, so the section was corrected to use Ansible's supported script inventory interface.
- The prerequisites installed `community.general` for the nonexistent inventory plugin. This was changed to require Ansible and the Python `requests` package used by the inventory script.
- The Consul service definition used a singular `check` field. Consul service definitions document `checks` as an array, so the JSON example was corrected.
- The custom script created group names directly from service names, tags, and datacenters. This could produce invalid Ansible group names such as `tag_v2.1` or `dc_us-east-1`, so group name sanitization was added and the targeting examples were updated.
- The host pattern example `web:&tag_production` was unquoted. Shells can treat `&` as a control operator, so the pattern was quoted.
- The KV helper used `response.json()` for Consul's `?raw` endpoint. Consul documents raw KV responses as `text/plain`, so `consul_get` now supports raw text and the helper parses JSON explicitly with `json.loads`.
- The closing paragraph referred to a built-in plugin handling simple setups. This was removed because the documented approach is a custom inventory script.

## Review Notes
The post is now technically valid as a custom dynamic inventory tutorial. Future improvements could include adding timeouts to HTTP requests, caching inventory results for large Consul catalogs, and documenting how to pass Consul datacenter or namespace query parameters for multi-datacenter or Consul Enterprise environments.
