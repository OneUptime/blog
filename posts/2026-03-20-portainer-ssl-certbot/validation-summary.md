# Validation Summary: How to Use Certbot to Secure Portainer with SSL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Certbot
- Let's Encrypt ACME challenges
- Nginx
- Docker
- TLS/SSL certificates
- Cloudflare DNS API

## Sources Consulted
- Certbot installation instructions: https://certbot.eff.org/instructions?os=snap&ws=other
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- Certbot CLI reference: https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- certbot-dns-cloudflare documentation: https://certbot-dns-cloudflare.readthedocs.io/
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt ACME client guidance: https://letsencrypt.org/docs/client-options/
- Let's Encrypt getting started guidance: https://letsencrypt.org/howitworks/
- Portainer custom SSL certificate documentation: https://docs.portainer.io/advanced/ssl
- Nginx beginner's guide and request handling basics: https://nginx.org/en/docs/beginners_guide.html

## Issues Found
- The overview called Certbot the "official" ACME client for Let's Encrypt. Let's Encrypt documents Certbot as the client they recommend for most people, while their ACME client list is explicitly third-party software. I changed the wording to "a recommended ACME client".
- The snap install section used `sudo ln -s /snap/bin/certbot /usr/bin/certbot`. Current Certbot instructions use `/usr/local/bin/certbot`, so I corrected the path.
- The DNS-01 section installed `certbot-dns-cloudflare` with `pip3`, which is not the supported installation path when Certbot itself is installed via the snap. I changed the example to the documented snap plugin flow and added a note that distro-package installs should use the matching distro plugin package instead of mixing package managers.
- The standalone example implied only Portainer mattered for port 80 availability. Certbot's standalone plugin requires that nothing else be bound to port 80 while validation runs, so I corrected that comment.
- The Portainer deployment script copied files from `/etc/letsencrypt/live/...` into `portainer_data` and restarted the container. That is not Portainer's documented certificate configuration flow, and it also ignores Certbot's symlinked `live`/`archive` layout that Portainer documents as important for Docker. I replaced the script with a Portainer container configuration that mounts both the `live` and `archive` directories and uses `--sslcert` / `--sslkey` as documented.
- The renewal hook repeated the same unsupported certificate-copy approach. I changed it to a deploy hook that restarts Portainer after a successful renewal of the configured certificate lineage, using Certbot's documented `RENEWED_LINEAGE` environment variable.
- The OpenSSL expiry check did not set SNI. I added `-servername portainer.example.com` so the command requests the correct certificate more reliably.

## Review Notes
- Certbot's current official guidance recommends the snap build for most Linux environments. The apt and dnf examples in the post can still be valid, but plugin installation must match the installation method used for Certbot itself.
- The Portainer container command in Step 4 is an example baseline. In a real deployment, the image tag, edition, published ports, and any existing mounts or flags should match the user's current Portainer setup.
