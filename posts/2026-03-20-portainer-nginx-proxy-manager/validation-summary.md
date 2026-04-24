# Validation Summary: How to Deploy Portainer and Nginx Proxy Manager Together

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker
- Docker Compose
- Portainer CE
- Nginx Proxy Manager
- MariaDB
- Let's Encrypt
- Reverse proxying
- HTTPS / TLS

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `compose ps` reference: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker `container logs` reference (`docker logs` alias): https://docs.docker.com/reference/cli/docker/container/logs/
- Portainer CE install on Docker (Linux): https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy with nginx: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Portainer reverse proxy overview: https://docs.portainer.io/advanced/reverse-proxy
- Nginx Proxy Manager setup instructions: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager advanced configuration: https://nginxproxymanager.com/advanced-config/
- Nginx Proxy Manager FAQ: https://nginxproxymanager.com/faq/
- Let's Encrypt certificate chains and intermediates: https://letsencrypt.org/certificates/
- Local CLI help used to verify command flags: `curl --help all`
- Local CLI help used to verify certificate inspection flags: `openssl x509 -help`

## Issues Found
- The compose example used the top-level `version: "3.8"` field. I removed it because current Docker Compose documentation marks `version` as obsolete and only informational.
- The prerequisites said ports 80, 443, and 81 all needed to be accessible. I corrected this to require public access to 80 and 443 plus administrative access to 81, because the post later correctly advises not exposing the NPM admin port to the internet.
- The certificate verification example expected a specific Let's Encrypt issuer CN (`R10`). I changed this to a generic Let's Encrypt issuer check because Let's Encrypt rotates intermediates and the issuer CN can vary.
- The NPM admin hardening section recommended putting NPM behind an NPM access list with password protection. I corrected this because NPM's own FAQ documents that adding username/password ACLs in front of apps like NPM itself can break login due to `Authorization` header conflicts. I also changed the suggested upstream target to `npm:81` instead of `127.0.0.1:81`.

## Review Notes
- The Portainer proxy target on internal port `9000` is still supported by current Portainer reverse-proxy documentation and Nginx Proxy Manager's Docker-network example, so I left that part unchanged. Current Portainer installation docs still emphasize `9443` for direct host access.
- The post uses `latest` image tags. That is technically valid, but it means future readers may get newer behavior than the article was reviewed against.
