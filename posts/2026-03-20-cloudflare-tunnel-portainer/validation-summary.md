# Validation Summary: How to Set Up Cloudflare Tunnel for Portainer Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cloudflare Tunnel
- `cloudflared`
- Cloudflare Zero Trust
- Cloudflare Access
- Portainer CE
- Docker Compose
- DNS routing

## Sources Consulted
- Cloudflare Tunnel overview: https://developers.cloudflare.com/tunnel/
- Create a locally-managed tunnel: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Tunnel routing: https://developers.cloudflare.com/tunnel/routing/
- Tunnel tokens: https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/
- Run as a service on Linux: https://developers.cloudflare.com/tunnel/advanced/local-management/as-a-service/linux/
- Create a tunnel (dashboard): https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/
- Publish a self-hosted application to the Internet: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- Cloudflared downloads and update guidance: https://developers.cloudflare.com/tunnel/downloads/ and https://developers.cloudflare.com/tunnel/downloads/update-cloudflared/
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer HTTPS/HTTP behavior FAQ: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/client-sent-an-http-request-to-an-https-server

## Issues Found
- The Linux install snippet used `dpkg -i` without elevated privileges. I changed it to `sudo dpkg -i cloudflared.deb` because package installation requires root privileges on Debian-based systems.
- The local tunnel config hard-coded the credentials file path under `/root/.cloudflared` while the config itself was being written to the current user's home directory. I replaced that with `<PATH_TO_TUNNEL_CREDENTIALS_FILE>` because the correct path depends on the user and the path returned by `cloudflared tunnel create`.
- The Zero Trust dashboard navigation was outdated. I updated `Networks → Tunnels` to `Networks → Connectors → Cloudflare Tunnels`, and `Access → Applications → Add Application` to `Access controls → Applications → Add an application`, matching current Cloudflare documentation.
- The post used `localhost:9000` in places that would fail when `cloudflared` runs as a Docker container. Inside that container, `localhost` refers to the `cloudflared` container itself, not Portainer. I changed the general origin examples to `http://<PORTAINER_HOST>:9000` and clarified that the Docker-networked case should use `http://portainer:9000`.
- The sentence saying the DNS record is created and "the tunnel is active" was too broad. I narrowed it to the verified behavior: saving the public hostname creates the DNS record.

## Review Notes
- No additional technical issues were found after the above corrections.
- The `portainer/portainer-ce:latest` tag is currently published and valid, but Portainer's documentation generally uses `:lts` in production-oriented examples.
- Cloudflare's current documentation recommends remotely-managed tunnels for Docker-based `cloudflared` deployments, which is consistent with the post's recommendation to use the dashboard method.
