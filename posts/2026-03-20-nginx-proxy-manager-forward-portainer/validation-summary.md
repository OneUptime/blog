# Validation Summary: How to Use Nginx Proxy Manager to Forward Traffic in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx Proxy Manager (jc21/nginx-proxy-manager)
- Portainer
- Docker / Docker Compose
- MariaDB
- Let's Encrypt (SSL)
- PostgreSQL (referenced in app stack example)

## Sources Consulted
- Nginx Proxy Manager official setup docs: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager official guide: https://nginxproxymanager.com/guide/
- Nginx Proxy Manager GitHub repository: https://github.com/NginxProxyManager/nginx-proxy-manager
- Docker Hub jc21/nginx-proxy-manager image documentation
- Docker Compose file format documentation

## Issues Found
No technical issues found.

Verified items:
- Docker image `jc21/nginx-proxy-manager:latest` is the official maintained image.
- Admin UI port `81` matches the official documentation.
- Default credentials `admin@example.com` / `changeme` are correct for first login.
- Database environment variables (`DB_MYSQL_HOST`, `DB_MYSQL_PORT`, `DB_MYSQL_USER`, `DB_MYSQL_PASSWORD`, `DB_MYSQL_NAME`) match the names documented in the official NPM setup guide.
- Volume mount paths `/data` and `/etc/letsencrypt` are correct for the NPM container.
- `mariadb:10.11` satisfies NPM's minimum supported version (MariaDB 10.2.7+).
- The shared external Docker network approach (`networks: proxy: external: true`) is the documented pattern for connecting NPM to backend service containers by name.
- NPM features referenced (Proxy Hosts, Block Common Exploits, Force SSL, HTTP/2, Custom Locations, Access Lists) all exist in the NPM admin UI as described.

## Review Notes
- The `version: "3.8"` declaration in the Compose files is technically valid but now considered obsolete by Docker Compose v2 (it emits a warning but still works). This is not a technical error and was left as-is.
- The procedural ordering has the user create the shared `proxy` network in Step 5 after the NPM stack in Step 1 and the app stack in Step 4. In practice the network should exist before either stack referencing it (`external: true`) is deployed. The author addresses this by instructing users to update the NPM stack at the end of Step 5, but readers may need to re-deploy the app stack as well. This is a minor procedural ordering observation rather than a technical inaccuracy.
- In the Step 4 example, the `db` service is attached to the `proxy` network. This works but is not the tightest isolation pattern; a separate internal network for app↔db traffic is more typical. This is an architectural preference, not a correctness issue.
- NPM also supports SQLite (default) and PostgreSQL as alternatives to MySQL/MariaDB; the post chooses MariaDB which is a valid and supported configuration.
