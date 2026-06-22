# Validation Summary: How to Set Up Bitwarden/Vaultwarden on Ubuntu

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Ubuntu
- Docker Engine and Docker Compose
- Vaultwarden
- Bitwarden self-hosting
- Nginx reverse proxy
- Certbot / Let's Encrypt
- SMTP
- SQLite backups
- Fail2ban
- UFW
- OneUptime monitoring

## Sources Consulted
- Docker Engine installation for Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose plugin installation: https://docs.docker.com/compose/install/linux/
- Vaultwarden configuration template: https://github.com/dani-garcia/vaultwarden/blob/main/.env.template
- Vaultwarden Docker Compose guide: https://github.com/dani-garcia/vaultwarden/wiki/Using-Docker-Compose
- Vaultwarden HTTPS guide: https://github.com/dani-garcia/vaultwarden/wiki/Enabling-HTTPS
- Vaultwarden proxy examples: https://github.com/dani-garcia/vaultwarden/wiki/Proxy-examples
- Vaultwarden WebSocket notifications: https://github.com/dani-garcia/vaultwarden/wiki/Enabling-WebSocket-notifications
- Vaultwarden backup guidance: https://github.com/dani-garcia/vaultwarden/wiki/Backing-up-your-vault
- Vaultwarden Fail2ban setup: https://github.com/dani-garcia/vaultwarden/wiki/Fail2Ban-Setup
- Vaultwarden admin page guidance: https://github.com/dani-garcia/vaultwarden/wiki/Enabling-admin-page
- Bitwarden Linux standard deployment: https://bitwarden.com/help/install-on-premise-linux/
- Bitwarden Lite deployment: https://bitwarden.com/help/install-and-deploy-lite/
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The Bitwarden comparison described the official self-hosted option as requiring PostgreSQL. Updated it to distinguish Bitwarden standard deployment, which uses Microsoft SQL Server, from the newer Bitwarden Lite deployment.
- The Docker Compose and Nginx examples exposed and proxied Vaultwarden's old WebSocket port 3012. Current Vaultwarden serves WebSockets on the main HTTP port, and `WEBSOCKET_ENABLED` / `WEBSOCKET_PORT` are deprecated or ignored. Removed the 3012 mapping and upstream, and changed the environment variable to `ENABLE_WEBSOCKET`.
- The Compose healthcheck and monitoring list used `/alive`, but Vaultwarden mounts the health endpoint at `/api/alive`. Updated both references.
- The `.env` example enabled `ROCKET_TLS` while the guide uses Nginx for TLS termination and did not mount the referenced certificate files. Commented out `ROCKET_TLS` and clarified that it should remain unset for this reverse-proxy setup.
- The Nginx configuration referenced Let's Encrypt certificate files before Certbot created them, causing `nginx -t` to fail. Added a temporary self-signed certificate under `/etc/ssl` so the config can be tested before Certbot replaces the paths.
- The backup script copied live SQLite files directly, which can produce inconsistent backups. Updated it to run Vaultwarden's built-in SQLite backup command and archive the consistent database copy.
- Troubleshooting still referenced port 3012 and the old WebSocket variable names. Updated those references.

## Review Notes
The Docker installation commands match Docker's supported apt-repository flow, though Docker's current docs now use a deb822 `.sources` file and `docker.asc` key rather than the older `.list` plus dearmored key style. The older style remains technically workable on Ubuntu apt. The Nginx `listen ... http2` syntax is accepted on Ubuntu LTS Nginx packages but may warn on newer upstream Nginx versions.
