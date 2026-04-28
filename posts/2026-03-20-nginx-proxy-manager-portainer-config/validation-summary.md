# Validation Summary: How to Configure Nginx Proxy Manager to Forward Traffic to Portainer

## Status
validated

## Post Type
Tutorial / Step-by-step configuration guide

## Technologies Covered
- Nginx Proxy Manager (NPM, jc21/nginx-proxy-manager)
- Portainer CE (portainer/portainer-ce)
- Docker / Docker Compose
- Nginx (reverse proxy directives)
- Let's Encrypt (SSL certificate issuance via NPM)
- WebSockets (for Portainer's xterm.js console)

## Sources Consulted
- Nginx Proxy Manager setup docs: https://nginxproxymanager.com/setup/
- Portainer CE installation docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer CLI reference (the `-H` / `--host` flag and SSL flags): https://docs.portainer.io/advanced/cli
- Nginx `ngx_http_proxy_module` directive reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Docker Compose networks reference: https://docs.docker.com/compose/networking/

## Issues Found
1. **Incorrect description of Portainer HTTPS backend setup.** The section "Using Portainer HTTPS Backend" originally said:
   > If you run Portainer with HTTPS enabled (`-H tcp://...` with TLS):

   The `-H` (`--host`) flag in Portainer specifies the **Docker daemon endpoint that Portainer manages** (e.g., `-H tcp://docker:2376`). It has nothing to do with enabling HTTPS on the Portainer web UI. Portainer CE 2.9+ enables HTTPS by default on port 9443 with an auto-generated self-signed certificate; custom certs are configured via `--sslcert`/`--sslkey`. Updated the wording to:
   > If you point NPM at Portainer's built-in HTTPS interface (enabled by default on port 9443 in Portainer CE 2.9+, with a self-signed certificate):

   The forward port (9443), scheme (https), and `proxy_ssl_verify off;` advice that follow remain correct.

## Review Notes
- Port 9000 (Portainer HTTP) is no longer exposed by default in Portainer CE 2.9+; readers using a current default install must explicitly publish `-p 9000:9000` (or simply use 9443/HTTPS as shown in the "Using Portainer HTTPS Backend" section). The post's implicit assumption that 9000 is available is still valid for installs that map it, so no change was made — but readers on a stock newer install may need to either expose 9000 or follow the HTTPS section instead.
- All NPM UI options referenced (Block Common Exploits, Websockets Support, Cache Assets, Force SSL, HTTP/2 Support, Access Lists, Advanced custom Nginx config) match NPM's current proxy host UI.
- All Nginx directives in the Advanced tab snippet (`proxy_read_timeout`, `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_set_header X-Real-IP`, `proxy_set_header X-Forwarded-For`, `proxy_ssl_verify off`) are valid in the location context that NPM injects them into.
- The Docker Compose snippet is syntactically valid and the shared `proxy` network correctly enables container-name DNS resolution between NPM and Portainer.
- WebSocket support requirement for the Portainer container console (xterm.js) is correct.
- The `curl -vI ... | grep -i "issuer\|expire"` certificate check works but `openssl s_client -connect host:443 -servername host </dev/null | openssl x509 -noout -issuer -dates` would be a more reliable way to inspect cert details — left as-is since the curl approach works for a smoke check.
