# Validation Summary: How to Set Up MySQL on DigitalOcean Managed Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8
- DigitalOcean Managed Databases
- doctl CLI (DigitalOcean command-line tool)
- DigitalOcean API (v2)
- SSL/TLS for database connections

## Sources Consulted
- [doctl databases create reference](https://docs.digitalocean.com/reference/doctl/reference/databases/create/)
- [doctl databases get-ca reference](https://docs.digitalocean.com/reference/doctl/reference/databases/get-ca/)
- [doctl databases replica reference](https://docs.digitalocean.com/reference/doctl/reference/databases/replica/)
- [doctl databases replica create reference](https://docs.digitalocean.com/reference/doctl/reference/databases/replica/create/)
- [doctl databases replica connection reference](https://docs.digitalocean.com/reference/doctl/reference/databases/replica/connection/)
- [doctl databases firewalls append reference](https://docs.digitalocean.com/reference/doctl/reference/databases/firewalls/append/)
- [How to Modify User Privileges in MySQL Databases](https://docs.digitalocean.com/products/databases/mysql/how-to/modify-user-privileges/)
- [How to Connect to MySQL Database Clusters](https://docs.digitalocean.com/products/databases/mysql/how-to/connect/)

## Issues Found

1. **Incorrect CA certificate command (`doctl databases ca`)**: The post used `doctl databases ca my-mysql-cluster --format CAcert --no-header | base64 -d > ca-certificate.crt`. The correct command is `doctl databases get-ca` (not `ca`), the format column is `Certificate` (not `CAcert`), and the base64 decode pipe is unnecessary. Fixed to: `doctl databases get-ca my-mysql-cluster --format Certificate --no-header > ca-certificate.crt`.

2. **Incorrect replica subcommand (`replicas` vs `replica`)**: The post used `doctl databases replicas create` and `doctl databases replicas connection`. The correct doctl subcommand is `replica` (singular), not `replicas`. Fixed both occurrences to `doctl databases replica create` and `doctl databases replica connection`.

3. **Misleading VPC firewall comment**: The comment `# Allow an entire VPC` accompanied the rule `ip_addr:10.0.0.0/8`, but `ip_addr` is a generic IP range rule type, not VPC-specific. DigitalOcean firewall rules support types: `droplet`, `k8s`, `ip_addr`, `tag`, and `app` — there is no `vpc` type. Changed comment to `# Allow a specific IP range`.

4. **Unnecessary `FLUSH PRIVILEGES` statement**: The post included `FLUSH PRIVILEGES;` after a `GRANT` statement. This is unnecessary because MySQL automatically updates the in-memory privilege tables when using GRANT. Additionally, on DigitalOcean managed MySQL, the `doadmin` user may lack the RELOAD privilege required for FLUSH PRIVILEGES. Removed the line.

5. **Description mentioned "connection pooling"**: The post description referenced "connection pooling" but the post does not cover it, and DigitalOcean connection pooling (PgBouncer) is only available for PostgreSQL, not MySQL. Removed "connection pooling" from the description.

## Review Notes
- The post uses `my-mysql-cluster` (a name) as the argument for doctl commands. While doctl does accept cluster names in addition to UUIDs, readers should be aware that if multiple clusters share a name, the UUID should be used instead.
- The `--num-nodes` flag accepts values 1-3 per the official docs. The post's recommendation of 3 nodes for HA is correct and represents the maximum.
- The DigitalOcean API endpoint `https://api.digitalocean.com/v2/databases` and the default port 25060 are correct.
- The `ssl-mode=require` parameter in the connection URI is correct for DigitalOcean managed MySQL.
