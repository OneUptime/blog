# Validation Summary: How to Fix Portainer Not Working Behind Cloudflare Tunnel - A Practical Guide

## Status
validated

## Post Type
Guide / troubleshooting tutorial

## Technologies Covered
- Portainer
- Cloudflare Tunnel (`cloudflared`)
- Cloudflare Zero Trust / Access
- Docker Compose
- WebSockets
- Reverse proxy configuration

## Sources Consulted
- Cloudflare WebSockets: https://developers.cloudflare.com/network/websockets/
- Cloudflare Tunnel origin parameters: https://developers.cloudflare.com/tunnel/advanced/origin-parameters/
- Cloudflare Tunnel setup: https://developers.cloudflare.com/tunnel/setup/
- Cloudflare Tunnel as a Linux service: https://developers.cloudflare.com/tunnel/advanced/local-management/as-a-service/linux/
- Cloudflare Access self-hosted public applications: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- Cloudflare connection limits: https://developers.cloudflare.com/fundamentals/reference/connection-limits/
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer deprecated and removed features: https://docs.portainer.io/advanced/deprecated
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Cloudflare Zero Trust navigation path was outdated. I updated it from the older `Access -> Tunnels / Public Hostname` flow to the current `Networks -> Connectors -> Cloudflare Tunnels -> Published application routes` flow based on current Cloudflare docs.
- The local `cloudflared` service-install example was incomplete for the documented `~/.cloudflared/config.yml` setup. I changed it to `sudo cloudflared --config ~/.cloudflared/config.yml service install` to match Cloudflare's service guidance and avoid the common `sudo` config-path problem.
- The WebSocket testing step treated `wss://portainer.yourdomain.com` as a reliable Portainer WebSocket check. That is too simplistic for Portainer because the console uses authenticated WebSocket endpoints, so I replaced it with a browser-network verification approach that checks for a `101 Switching Protocols` upgrade during an actual console session.
- The cache section claimed you could add `Cache-Control: no-store` in the tunnel config. Cloudflare Tunnel origin parameters do not provide a generic response-header setting for that, so I removed that instruction and narrowed the cache-bypass advice to cases where cache rules already affect the hostname.
- The origin-validation workaround was wrong. The post said to disable origin checking and showed `--ssl`, `--sslcert`, and `--sslkey`, which do not fix `"Origin invalid"` errors and include deprecated Portainer SSL options. I replaced that with Portainer's documented `--trusted-origins` flag.
- The timeout section incorrectly described `tcpKeepAlive` and stated a 100-second Cloudflare limit. I corrected the `tcpKeepAlive` explanation and updated the HTTP timeout claim to Cloudflare's documented 120-second proxy read timeout.
- The Docker Compose example used the obsolete top-level `version` field and did not explain that a separate `cloudflared` container must reach Portainer by service name on the Compose network. I removed the obsolete `version` line and clarified that the origin should be addressed as `https://portainer:9443` in that deployment model.
- The verification section assumed direct `curl` checks would always work and used a Portainer status path that was not necessary for the article. I changed the first check to a simpler `curl -I` against the hostname and added a note that Cloudflare Access must be satisfied first if enabled.

## Review Notes
- The post now correctly treats `noTLSVerify: true` as a self-signed-HTTPS-on-`9443` case, not a universal requirement for every Portainer deployment.
- Portainer currently documents `--trusted-origins` for reverse-proxy `"Origin invalid"` errors and marks `--ssl` plus `--sslcert` / `--sslkey` as deprecated or obsolete for this purpose.
- The article still assumes Portainer is being served over HTTPS on `9443`; that is valid, but using Portainer behind a tunnel over HTTP on `9000` is also possible and would avoid the self-signed certificate concern.
