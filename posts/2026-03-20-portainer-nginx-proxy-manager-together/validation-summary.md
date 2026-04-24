# Validation Summary: Running Portainer and Nginx Proxy Manager Together

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer CE
- Nginx Proxy Manager
- Docker Compose
- Docker networking
- MariaDB
- Let's Encrypt / TLS termination

## Sources Consulted
- Portainer CE install docs: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer reverse proxy docs: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Portainer initial setup docs: https://docs.portainer.io/start/install-ce/server/setup
- Portainer reverse proxy timeout troubleshooting: https://docs.portainer.io/sts/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Nginx Proxy Manager setup docs: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager guide and default admin user: https://nginxproxymanager.com/guide/
- Nginx Proxy Manager default proxy headers (official repository): https://raw.githubusercontent.com/NginxProxyManager/nginx-proxy-manager/develop/docker/rootfs/etc/nginx/conf.d/include/proxy.conf
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose `version` field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- MariaDB official image environment variables: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables

## Issues Found
- The compose snippet included a MariaDB container for Nginx Proxy Manager but omitted the required `DB_MYSQL_*` environment variables on the NPM service. I added the database settings and `depends_on` so the example matches NPM's documented MariaDB setup.
- The compose snippet published Portainer's UI ports to the host even though the post later advised not to expose Portainer directly. I removed the Portainer `ports` block so NPM reaches Portainer over the shared Docker network instead of via host-published ports.
- The NPM proxy host example forwarded to `https://portainer:9443` while the post described NPM as handling TLS termination. I updated the proxy host to `http://portainer:9000`, which matches Portainer's documented reverse-proxy pattern inside Docker.
- The post said NPM could reach services by container name. I corrected this to service name to align with Docker Compose networking documentation.
- The troubleshooting note about manually forwarding `X-Forwarded-Proto` was outdated for NPM, which already sets that header in its default proxy configuration. I replaced it with Portainer's documented `proxy_read_timeout 3600;` fix for console disconnects behind reverse proxies.
- The top-level `version: "3.8"` field in the compose snippet is obsolete in current Compose. I removed it to match current Docker documentation.
- The security recommendation to enable 2FA on the Portainer admin account could not be verified in Portainer's current official docs. I replaced it with documented strong-password guidance instead.

## Review Notes
- The post validates cleanly after the corrections above.
- It still uses `:latest` image tags for Portainer and Nginx Proxy Manager. That is valid, but pinning to a specific release or the appropriate Portainer LTS/STS channel would reduce surprise upgrades in production.
- Portainer's public access docs focus on `9443`, but its reverse-proxy documentation still uses the internal HTTP port `9000` behind a proxy. That distinction is why the corrected guide proxies to `portainer:9000` on the Docker network while avoiding host exposure of Portainer's UI ports.
