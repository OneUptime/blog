# Validation Summary: How to Use the urlsplit Filter in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jinja2 filters
- URL parsing
- Nginx reverse proxy configuration
- Consul service discovery
- Redis and PostgreSQL connection URLs

## Sources Consulted
- Ansible `ansible.builtin.urlsplit` filter documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/urlsplit_filter.html
- Ansible `ansible.builtin.regex_search` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Ansible `ansible.builtin.default` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html
- Jinja `default` filter documentation: https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.default
- Consul `catalog services` command documentation: https://developer.hashicorp.com/consul/commands/catalog/services
- Consul Catalog HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/catalog
- Nginx reverse proxy documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The examples used `default()` for missing ports and Redis database numbers, but Jinja only applies `default()` to undefined values unless the boolean parameter is set. Updated the Redis example to use `default(..., true)` and updated the generic port examples to explicitly test for `none`.
- The database template applied `first` before `default` on a `regex_search` result. Since `regex_search` can return `None` when there is no match, the fallback needed to happen before `first`. Updated the expression to default to a one-item list before selecting the first item.
- The Nginx WebSocket example treated both `ws` and `wss` as `http` upstream proxy schemes. Updated the template to proxy `wss` through `https`.
- The URL validation example measured the length of `hostname` without handling `None`, which can happen for malformed or relative URLs. Added a boolean-aware default to make the assertion safe.
- The Consul example used `consul catalog services -format=json` and selected `ServiceAddress`, but the documented `catalog services` command lists service names and does not expose service instance addresses in that shape. Replaced it with a Catalog HTTP API query for a specific service and a `jq` expression that builds URLs from non-empty `ServiceAddress` or the node `Address` plus `ServicePort`.
- The URL reconstruction example defined `original_url` and `parsed` in the same `set_fact` task, but a fact set in a task is not available to sibling keys until the task completes. Kept `original_url` as a persisted fact and derived `parsed` from the same URL literal.

## Review Notes
The short `urlsplit` filter name is valid because it is part of `ansible-core`, though Ansible recommends the fully qualified `ansible.builtin.urlsplit` name in documentation links and examples to avoid collection name conflicts.
