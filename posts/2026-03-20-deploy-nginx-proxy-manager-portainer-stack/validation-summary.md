# Validation Summary: How to Deploy Nginx Proxy Manager as a Portainer Stack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Nginx Proxy Manager
- Docker Compose / Portainer stacks
- MariaDB
- Let's Encrypt
- TLS/SSL certificates
- Reverse proxying

## Sources Consulted
- Nginx Proxy Manager setup instructions: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager guide: https://nginxproxymanager.com/guide
- Portainer stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Nginx Proxy Manager advanced configuration: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/docs/src/advanced-config/index.md
- Nginx Proxy Manager first-run setup screen: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/frontend/src/pages/Setup/index.tsx
- Nginx Proxy Manager certificate help: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/frontend/src/locale/src/HelpDoc/en/Certificates.md
- Nginx Proxy Manager certificate UI actions: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/frontend/src/pages/Certificates/Table.tsx

## Issues Found
- The post said the default login is `admin@example.com` / `changeme`. Current Nginx Proxy Manager shows a first-run setup screen unless `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` are set. I updated the Initial Login section to describe the current setup flow and the environment-variable override.
- The proxy host SSL step used an outdated UI label, `Request a new SSL Certificate`. Current Nginx Proxy Manager uses `Request a new Certificate`. I updated the label to match the current interface.
- The Custom Certificate section incorrectly told readers to choose `Let's Encrypt` and said Nginx Proxy Manager would handle ACME challenge and renewal automatically. Current Nginx Proxy Manager has a separate `Custom Certificate` flow for uploading a certificate and private key, while ACME automation applies to Let's Encrypt certificates. I updated the section accordingly.

## Review Notes
- The compose example is consistent with the current upstream MariaDB-backed setup pattern for Nginx Proxy Manager and works in a Portainer stack.
- The post uses `latest` image tags, which match the upstream examples but are less reproducible than pinned version tags.
