# Validation Summary: How to Create DigitalOcean Managed Databases with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- DigitalOcean Terraform Provider (`digitalocean/digitalocean`)
- DigitalOcean Managed Databases (PostgreSQL, MySQL, Redis/Valkey)
- HashiCorp Configuration Language (HCL)
- PgBouncer (connection pooling)

## Sources Consulted
- DigitalOcean Terraform Provider docs — `digitalocean_database_cluster`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/database_cluster.md
- DigitalOcean Terraform Provider docs — `digitalocean_database_firewall`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/database_firewall.md
- DigitalOcean Terraform Provider docs — `digitalocean_database_connection_pool`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/database_connection_pool.md
- Provider source code: `digitalocean/database/resource_database_cluster.go` (engine slug constants and DiffSuppressFunc)

## Issues Found
No technical issues found.

All resource names, argument names, and exported attributes verified against the official provider documentation:
- `digitalocean_database_cluster` arguments (`name`, `engine`, `version`, `size`, `region`, `node_count`, `tags`) and exported attributes (`host`, `port`, `uri`) are correct.
- `digitalocean_database_db` and `digitalocean_database_user` accept `cluster_id` and `name`; `password` is exported on the user resource.
- `digitalocean_database_firewall` rule types `"tag"` and `"ip_addr"` are valid (full set: `droplet`, `k8s`, `ip_addr`, `tag`, `app`).
- `digitalocean_database_connection_pool` accepts `cluster_id`, `name`, `mode`, `size`, `db_name`, and `user`. `"transaction"` and `"session"` are valid modes (the docs also accept `"statement"`, but mentioning only the two common ones is fine).
- Engine slug `"pg"` for PostgreSQL, `"mysql"`, and `"redis"` are all valid. PostgreSQL 16, MySQL 8, and Redis 7 are all supported versions.
- Sizes `db-s-1vcpu-1gb` and `db-s-2vcpu-4gb` are valid basic shared-CPU plans; `nyc3` is a valid region.

## Review Notes
- DigitalOcean has shifted its Redis-compatible offering to Valkey, and the latest provider documentation primarily uses `engine = "valkey"`. However, the provider source still defines `redisDBEngineSlug = "redis"` and uses a `DiffSuppressFunc` to treat `"redis"` and `"valkey"` as interchangeable, so the post's `engine = "redis"` configuration continues to work without forcing cluster recreation. New posts written today might prefer `"valkey"` for forward-compatibility, but the existing example is not incorrect.
- The post does not pin a `digitalocean` provider version. In production, users should declare a `required_providers` block to lock the provider version — worth a future enhancement note but not a technical error.
- The connection pool example omits `mode = "statement"` as a third valid option; the inline comment correctly says "transaction or session" which are the two most common modes, so this is fine.
