# Validation Summary: How to Store TLS Certificates as Podman Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman secrets
- Podman CLI
- TLS certificates and private keys
- Nginx TLS configuration
- Apache HTTP Server TLS configuration

## Sources Consulted
- Podman `podman secret create` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman `podman run --secret` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman secret rm` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-rm.1.html
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- NGINX Docker documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/
- Apache HTTP Server SSL/TLS how-to: https://httpd.apache.org/docs/current/ssl/ssl_howto.html
- Docker documentation for the Apache httpd official image: https://hub.docker.com/_/httpd

## Issues Found
- The post said Podman secrets are only accessible inside the running container. Podman secrets are stored by Podman on the host and mounted into containers granted access, so the wording was narrowed to avoid implying host-side inaccessibility.
- The Apache example mounted certificate secrets but did not mount or load an Apache configuration that enables TLS and references those paths. Added a mounted `httpd-ssl.conf`, loaded SSL support at startup, and included a minimal SSL virtual host configuration using `SSLCertificateFile` and `SSLCertificateKeyFile`.
- The full-chain Nginx example mounted chain, key, and DH parameter secrets but did not mount an Nginx configuration that could reference those files. Added a read-only `nginx-fullchain.conf` mount.
- The rotation example removed and recreated `tls_cert` and `tls_key`, but the earlier Nginx container used `nginx_cert` and `nginx_key`. It also restarted the existing container, which would not receive newly created secret data because Podman copies secrets into the container at creation time. Updated the example to replace the correct secrets and recreate the Nginx container.
- The summary claimed rotation ensures continuous secure communication without downtime. The provided commands stop and recreate a container, so the wording was corrected to say rotation keeps containers current after recreation or rolling replacement.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation instead of local `--help` output.
