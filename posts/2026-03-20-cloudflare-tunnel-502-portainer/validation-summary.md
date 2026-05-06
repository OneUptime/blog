# Validation Summary: How to Fix 502 Bad Gateway Errors with Cloudflare Tunnel and Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare Tunnel (`cloudflared`)
- Cloudflare Zero Trust
- Portainer
- Docker
- Docker Compose
- `curl`

## Sources Consulted
- Cloudflare Tunnel troubleshooting: https://developers.cloudflare.com/tunnel/troubleshooting/
- Cloudflare Tunnel origin parameters: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/origin-parameters/
- Cloudflare Tunnel configuration file reference: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Portainer API access reference: https://docs.portainer.io/2.21/api/access
- Portainer troubleshooting for HTTP sent to HTTPS: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/client-sent-an-http-request-to-an-https-server
- Docker CLI help checked locally for `docker ps`, `docker logs`, and `docker inspect`

## Issues Found
- The post treated Portainer's legacy HTTP port `9000` as the default. Current Portainer docs show HTTPS on `9443` as the default UI/API port, with `9000` used for legacy HTTP only when explicitly enabled. I updated the commands, service URL examples, and explanatory text accordingly.
- The Cloudflare Zero Trust navigation path was outdated. Cloudflare now documents Tunnel management under `Zero Trust > Networks > Connectors > Cloudflare Tunnels`, so I updated the dashboard path.
- The `cloudflared` YAML snippets omitted the required final catch-all ingress rule. Cloudflare's configuration file reference states that ingress configurations must end with a catch-all rule, so I added `- service: http_status:404` to the config examples.
- The post used `docker exec cloudflared curl ...` as a diagnostic, which is not a safe assumption for the `cloudflare/cloudflared` container image. I replaced that with Docker network inspection commands that verify the prerequisite documented by Docker: both containers must share a network for service-name routing to work.
- The timeout section implied those origin settings fix long-running Portainer operations such as large image pulls. Cloudflare documents these as origin connection and keepalive settings, so I rewrote the section to describe their real scope and corrected the example values to align with current documented defaults where applicable.

## Review Notes
- The post is technically salvageable and is now accurate after the fixes above.
- `noTLSVerify` is valid and documented, but Cloudflare treats it as a workaround for untrusted/self-signed origin certificates rather than the preferred production configuration.
- The guide assumes container names like `cloudflared` and `portainer`; readers may need to substitute their actual container names.
