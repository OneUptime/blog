# Validation Summary: How to Use Ansible to Configure API Gateways (Kong)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Kong Gateway
- Kong Admin API
- PostgreSQL
- DB-less declarative configuration
- Kong plugins: rate-limiting, JWT, HTTP Log, CORS, correlation-id

## Sources Consulted
- Kong Gateway Ubuntu installation docs: https://docs.konghq.com/gateway/latest/install/linux/ubuntu/
- Kong Gateway configuration reference: https://docs.konghq.com/gateway/latest/reference/configuration/
- Kong Gateway DB-less and declarative configuration docs: https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/
- Kong Gateway Admin API docs: https://docs.konghq.com/gateway/latest/admin-api/
- Kong Gateway services and routes docs: https://docs.konghq.com/gateway/latest/get-started/services-and-routes/
- Kong Rate Limiting plugin docs: https://docs.konghq.com/hub/kong-inc/rate-limiting/
- Kong HTTP Log plugin configuration docs: https://docs.konghq.com/hub/kong-inc/http-log/configuration/
- Ansible deb822_repository module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible apt_key module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible uri module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Kong gateway-35 Cloudsmith package setup reference: https://cloudsmith.io/~kong/repos/gateway-35/packages/detail/deb/kong/3.5.0/

## Issues Found
- The architecture section said Kong 3.5 could use PostgreSQL or Cassandra as its configuration database. Kong removed Cassandra support in the 3.4 release line, and current Kong configuration docs list only `postgres` and `off` as valid `database` values. I changed the text to PostgreSQL in traditional mode.
- The DB-less defaults still left `kong_database` set to `postgres`, which would prevent DB-less mode from working as described. I changed the default to set `database` to `off` when `kong_mode` is `dbless`.
- The installation example used the old `download.konghq.com` repository URL and `apt_key`. Kong moved package hosting to `packages.konghq.com`, and Ansible documents `apt_key` as deprecated because it relies on deprecated `apt-key`. I replaced the repository setup with `ansible.builtin.deb822_repository`, the current Kong package URL pattern, and the required `python3-debian` dependency.
- The service and route Admin API request bodies used quoted Jinja expressions for numeric and boolean fields, and `default(omit)` inside a nested JSON body. `omit` is intended for module parameters and is not safe inside nested dictionaries. I rewrote the bodies as Jinja-built dictionaries so optional route `methods` are only sent when defined and numeric/boolean values remain typed.

## Review Notes
- The Admin API examples are appropriate for traditional database-backed Kong. In DB-less mode, Kong's Admin API entity CRUD endpoints are effectively read-only; the post correctly separates that workflow by generating a declarative configuration file.
- The `deb822_repository` module is available in ansible-core 2.15 and later. Older Ansible installations would need an alternate repository setup.
