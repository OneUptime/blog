# Validation Summary: How to Renew SSL Certificates in Portainer Without Downtime

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- TLS/SSL certificates
- Certbot / Let's Encrypt
- Nginx
- OpenSSL
- Bash

## Sources Consulted
- Portainer documentation, "Using your own SSL certificate with Portainer" https://docs.portainer.io/advanced/ssl
- Portainer documentation, "Deploying Portainer behind nginx reverse proxy" https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer documentation, "CLI configuration options" https://docs.portainer.io/advanced/cli
- Certbot documentation, "User Guide" https://eff-certbot.readthedocs.io/en/latest/using.html
- Docker documentation, "docker container restart" https://docs.docker.com/reference/cli/docker/container/restart/
- NGINX documentation, "Controlling nginx" https://nginx.org/en/docs/control.html
- OpenSSL documentation, "openssl-s_client" https://docs.openssl.org/master/man1/openssl-s_client/

## Issues Found
- The introduction described the workflow as "certificate hot-swapping" and gave a specific Portainer restart time. Portainer's documented certificate handling is based on configured certificate files or reverse-proxy termination, so I revised the wording to remove the unsupported hot-swap wording and the environment-specific timing claim.
- The Method 1 script performed privileged copies, permission changes, and a container restart without `sudo`, and it restarted Portainer even when `certbot renew` had not actually renewed the certificate. I added the necessary privileged commands and a before/after certificate-expiry check so the restart is skipped when no renewal occurred.
- The Method 2 example used `certbot renew --nginx`, which is narrower than necessary because Certbot stores renewal configuration for existing certificates. I changed it to `certbot renew --quiet` while keeping the Nginx reload step for zero-downtime TLS termination at the proxy.
- The Method 3 deploy hook restarted Portainer without first copying the renewed certificate and key into Portainer's certificate directory. I added the copy and permission steps so the hook actually updates the certificate Portainer uses before restart.
- The monitoring example did not explicitly send SNI. I added `-servername "$DOMAIN"` to make the OpenSSL check unambiguous for name-based virtual hosting.

## Review Notes
- The monitoring script assumes a Linux environment with GNU `date` (`date -d`) and a local `mail` command such as `mailutils` or `bsd-mailx`.
- Reverse-proxy deployments may also need Portainer's `--trusted-origins` option if Portainer reports `Origin invalid` behind the proxy, per Portainer's CLI documentation.
