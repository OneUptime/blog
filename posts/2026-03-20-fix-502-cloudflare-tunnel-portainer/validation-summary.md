# Validation Summary: How to Resolve 502 Bad Gateway with Cloudflare Tunnel and Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare Tunnel (`cloudflared`)
- Portainer
- Docker
- Docker Compose
- TLS / HTTPS
- Container networking

## Sources Consulted
- Cloudflare Tunnel troubleshooting: https://developers.cloudflare.com/tunnel/troubleshooting/
- Cloudflare Tunnel origin parameters: https://developers.cloudflare.com/tunnel/advanced/origin-parameters/
- Cloudflare Tunnel local management configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Tunnel locally-managed tunnel setup: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/
- Portainer CE install on Docker Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Docker Compose file reference (`version` top-level element): https://docs.docker.com/reference/compose-file/version-and-name/
- Docker host network driver: https://docs.docker.com/engine/network/drivers/host/
- Docker `network connect` CLI reference: https://docs.docker.com/reference/cli/docker/network/connect/

## Issues Found
- The post said `noTLSVerify: true` was always required for Portainer HTTPS. Cloudflare documents `noTLSVerify` as disabling certificate verification and recommends it only as a last resort for self-signed origins. I updated the guidance to say it is only needed when Portainer is still using its default self-signed certificate, and noted `caPool` as the alternative trust-based fix.
- The post described port `9000` as an "older versions" path. Current Portainer docs state `9443` is the default HTTPS UI port and `9000` is optional for legacy HTTP compatibility when explicitly enabled. I updated the `curl` comment, the HTTP config heading, and the best-practices note to reflect that.
- The port table listed the Portainer Agent on `9001` as HTTP. Portainer documents agent communication on `9001` as HTTPS. I corrected the protocol in the table.
- The host-network `cloudflared` Docker example was incomplete and implied host networking alone solved cross-network issues. I updated it to include the required Cloudflare config/credentials mount and tunnel run arguments, and clarified that this approach applies when Portainer is published on the host.
- The Compose example used `cloudflared tunnel ... run` without a tunnel ID. Cloudflare's locally-managed tunnel docs show `run <UUID or NAME>`, so I added `YOUR-TUNNEL-ID` to the command.
- The Compose example included the top-level `version` key. Docker documents this field as obsolete, so I removed it.

## Review Notes
- The post is now technically accurate for the locally-managed Cloudflare Tunnel flow it shows.
- For production setups, Cloudflare's preferred approach is to trust the origin certificate with `caPool` or install a trusted certificate instead of relying on `noTLSVerify: true`.
