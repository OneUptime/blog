# Validation Summary: How to Automate SSL Certificate Renewal for Portainer - Cert

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- TLS/SSL certificates
- Let's Encrypt ACME
- Certbot
- `certbot-dns-cloudflare`
- Traefik Proxy
- `acme.sh`
- Docker
- Docker Compose
- OpenSSL

## Sources Consulted
- Portainer: Using your own SSL certificate with Portainer https://docs.portainer.io/advanced/ssl
- Portainer: CLI configuration options https://docs.portainer.io/advanced/cli
- Portainer: Deploying Portainer behind Traefik Proxy https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer: Install Portainer CE with Docker on Linux https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Certbot User Guide https://eff-certbot.readthedocs.io/en/latest/using.html
- Certbot instructions site https://certbot.eff.org/instructions
- `certbot-dns-cloudflare` documentation https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- Traefik ACME / Let's Encrypt documentation https://doc.traefik.io/traefik/v3.3/https/acme/
- `acme.sh` official repository and usage guide https://github.com/acmesh-official/acme.sh
- `acme.sh` Cloudflare DNS provider script https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cf.sh

## Issues Found
- The introduction said the post covered three methods, but the post actually contained four. I corrected the introduction to match the content.
- The Cloudflare credentials example wrote to `/root/.secrets` without `sudo`. That would fail for a non-root shell, so I changed the commands to use `sudo mkdir`, `sudo tee`, and `sudo chmod`.
- The Certbot + Portainer `docker run` example only mounted `/etc/letsencrypt/live/...`. Portainer's official documentation notes that Certbot's `live` directory uses symlinks into `archive`, so both directories must be mounted. I updated the bind mounts and the `--sslcert` / `--sslkey` paths accordingly.
- The Certbot + Portainer example stopped the existing container and then immediately reused the same container name with `docker run`. That would fail because a stopped container with the same name still exists. I changed this to `docker rm -f portainer` before recreating the container.
- The renewal hook test used `certbot renew --dry-run`, which does not run deploy hooks by default. I changed it to `certbot renew --dry-run --run-deploy-hooks` so the hook is actually exercised during testing.
- The Traefik example stored ACME data in a named volume without addressing the documented `acme.json` file creation and `600` permissions requirement. I changed the example to a bind-mounted `acme.json`, added the required setup note, and explicitly enabled the HTTP challenge flag.
- The `acme.sh` example assumed the shell alias was immediately available after installation via `source ~/.bashrc`, which is not the documented guarantee. I changed the commands to use the explicit `~/.acme.sh/acme.sh` path.
- The `acme.sh` example wrote certificates to `/etc/portainer/certs` without creating the directory or accounting for permissions. I changed the example to a user-writable directory under `$HOME`, which matches the non-root installation flow shown by `acme.sh`.
- The certificate monitoring script probed port `443`, but Portainer's documented default HTTPS port is `9443` unless it is placed behind a reverse proxy. I made the port explicit and configurable, defaulting it to `9443`.

## Review Notes
- The Traefik ACME example assumes port `80` is reachable from Let's Encrypt for the HTTP-01 challenge. If the deployment cannot expose port `80`, a DNS-01 challenge would be more appropriate.
- The examples still use floating image tags such as `portainer/portainer-ce:latest`. They are valid, but pinning an explicit tested version would make the guide more reproducible.
