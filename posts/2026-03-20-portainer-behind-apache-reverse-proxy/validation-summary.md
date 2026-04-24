# Validation Summary: How to Set Up Portainer Behind Apache Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker
- Apache HTTP Server 2.4
- Apache reverse proxying
- WebSocket proxying
- TLS/HTTPS termination
- UFW

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE install with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer issue on `--trusted-origins` behavior and release availability: https://github.com/portainer/portainer/issues/12748
- Apache `mod_proxy_wstunnel` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_wstunnel.html
- Apache `mod_headers` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_headers.html
- Apache `mod_ssl` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Docker `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker `docker container port` reference: https://docs.docker.com/reference/cli/docker/container/port/

## Issues Found
- The original `docker run` example did not publish port `9000`, but the Apache config proxies `http://127.0.0.1:9000/`. I added `-p 127.0.0.1:9000:9000` so Apache can actually reach Portainer, and bound it to localhost to avoid exposing the backend publicly.
- The original `--trusted-origins` value used a full `https://...` URL. Portainer's documentation and the Portainer-maintained workaround example describe this setting as a domain list and show values like `portainer.mydomain.com`. I changed the command and troubleshooting text to use `portainer.example.com`.
- The Apache vhost used `SSLCertificateChainFile`, which Apache documents as deprecated and obsolete since version 2.4.8. I removed it and changed `SSLCertificateFile` to a full-chain certificate path.
- The prerequisites omitted `mod_headers` even though the configuration uses `RequestHeader`. I added `mod_headers` to keep the prerequisites accurate.
- The troubleshooting section checked inside-container sockets instead of the published host port Apache depends on. I replaced that check with `docker port portainer 9000`, which directly verifies the port mapping used by the proxy.

## Review Notes
- The post is now technically correct for a current Portainer deployment, but `--trusted-origins` is only available in newer Portainer releases. Portainer introduced it on July 2, 2025 in `2.27.9` LTS and `2.31.3` STS.
- The WebSocket proxy section remains valid. Apache 2.4.47 and later can also handle protocol upgrades through `mod_proxy_http`, but the existing `mod_proxy_wstunnel` pattern is still supported.
