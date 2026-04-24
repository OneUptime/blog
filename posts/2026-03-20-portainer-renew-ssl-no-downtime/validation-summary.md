# Validation Summary: How to Renew SSL Certificates for Portainer Without Downtime

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Standalone
- Certbot / Let's Encrypt
- SSL/TLS certificates
- Nginx reverse proxy
- OpenSSL
- cron

## Sources Consulted
- Portainer Documentation: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer Documentation: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer Documentation: Portainer architecture - https://docs.portainer.io/start/architecture
- Portainer Documentation: Deploying Portainer behind nginx reverse proxy - https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Certbot User Guide - https://eff-certbot.readthedocs.io/en/latest/using.html
- Certbot man page - https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- NGINX Beginner's Guide - https://nginx.org/en/docs/beginners_guide.html
- NGINX: Controlling nginx - https://nginx.org/en/docs/control.html

## Issues Found
- The original direct-renewal script copied certificates into `portainer_data:/data/certs` using `cert.pem` and `key.pem`. Portainer's documented server-certificate configuration uses `--sslcert` and `--sslkey` pointing to files such as `/certs/portainer.crt` and `/certs/portainer.key`. I replaced the script so it updates the bind-mounted certificate directory that Portainer is actually configured to use, then restarts Portainer.
- The original automation scheduled the entire restart script in cron. That would restart Portainer even when `certbot renew` found nothing to renew. I changed the scheduled command to use Certbot's `--deploy-hook`, which Certbot documents as running only after a successful renewal.
- The original zero-downtime section started a second Portainer container against the same `portainer_data` volume and switched Nginx between the two instances. Portainer's architecture docs state that multiple Portainer Server instances managing the same clusters are not supported. I replaced this with the supported zero-downtime pattern: terminate TLS at Nginx and reload Nginx after certificate renewal while Portainer continues running behind the proxy on port `9000`.
- The original rollback example restored files into `/data/certs` inside the Portainer data volume. That path is not the documented server-certificate location. I corrected rollback to restore the bind-mounted `portainer.crt` and `portainer.key` files instead.
- The original readiness check relied on `curl https://localhost:9443/api/status | grep "Version"`. I changed it to a simple HTTPS success check on the Portainer root endpoint so the verification no longer depends on a specific API response body.

## Review Notes
- Zero downtime is only realistic when TLS is terminated by a reverse proxy such as Nginx. When Portainer itself presents the certificate via `--sslcert` and `--sslkey`, a Portainer restart is still required after the certificate files are updated.
- Portainer's Certbot guidance notes that Docker has symlink issues with Certbot's `live/` paths. If you bind-mount Certbot directories directly into the Portainer container, mount both the `live` and `archive` directories as documented.
