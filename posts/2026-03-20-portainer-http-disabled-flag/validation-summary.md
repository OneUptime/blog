# Validation Summary: How to Use the --http-disabled Flag for HTTPS-Only Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Community Edition
- Docker
- Docker Compose
- HTTPS / TLS
- OpenSSL
- Let's Encrypt / Certbot
- Nginx reverse proxy
- Portainer Edge Agent

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Using your own SSL certificate with Portainer: https://docs.portainer.io/advanced/ssl
- Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- The Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- Using Portainer with reverse proxies: https://docs.portainer.io/advanced/reverse-proxy
- Deploying Portainer behind nginx reverse proxy: https://docs.portainer.io/sts/advanced-topics/reverse-proxy/nginx
- Deprecated and removed features: https://docs.portainer.io/advanced/deprecated
- OpenSSL `req` documentation: https://docs.openssl.org/1.1.1/man1/req/
- GNU Bash Reference Manual: https://www.gnu.org/software/bash/manual/bash.html

## Issues Found
- The introduction described Portainer as exposing both 9000 and 9443 by default. Current Portainer docs state HTTPS on 9443 is enabled by default from CE 2.9 / BE 2.10, while HTTP on 9000 is optional if you publish it. I corrected the introduction and version prerequisite.
- The self-signed certificate example generated a certificate with only a CN. Modern TLS clients validate the Subject Alternative Name, so I added `-addext "subjectAltName = DNS:portainer.yourdomain.com"`.
- The "copy existing certificate" example copied files with arbitrary names, but later commands expected `/certs/portainer.crt` and `/certs/portainer.key`. I updated the copy commands to use those filenames.
- The `docker run` examples used inline comments after line-continuation backslashes. In Bash this breaks the continued command, so I removed the inline comments and kept the commands syntactically valid.
- The post used the deprecated `--ssl` flag even though Portainer enables HTTPS by default in the versions covered. I removed `--ssl` from the `docker run`, Compose, and Edge Agent examples.
- The Let's Encrypt example mounted only the `live/` directory. Portainer's SSL docs note Certbot symlinks require mounting both `live/` and `archive/`, so I corrected the volume mounts and certificate paths.
- The verification step relied on grepping container logs for HTTP/HTTPS strings, which is not a reliable validation of the flag. I replaced it with a `docker inspect` check for `--http-disabled`.
- The reverse-proxy explanation said Portainer runs with HTTP only. That was too broad; the actual requirement is that HTTP remains enabled so the proxy can reach port 9000. I corrected the explanation.
- The certificate validation example assumed `/opt/portainer/certs/ca.crt` exists and applies generally. I scoped that command to private CA / self-signed deployments and added `-servername` to the `openssl s_client` example for correct SNI handling.

## Review Notes
- Portainer's documentation is internally inconsistent about certificate flags: the SSL setup guide still documents `--sslcert` / `--sslkey`, while the deprecation page says they are deprecated in favor of `--tlscert` / `--tlskey`. I left the post on `--sslcert` / `--sslkey` because Portainer's current certificate-installation guide still uses them.
- The reverse-proxy example is technically sound for same-host or trusted private-network deployments. If Portainer is placed behind a proxy on a different host/network, the unencrypted hop between proxy and Portainer should be reconsidered.
