# Validation Summary: How to Configure GitLab Container Registry with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitLab Self-Managed container registry
- GitLab Omnibus configuration
- GitLab Docker container deployments
- Docker Compose networking and port publishing
- IPv6 networking and AAAA DNS records
- TLS certificates with OpenSSL and Certbot
- Docker CLI authentication
- GitLab CI/CD container image builds

## Sources Consulted
- GitLab container registry administration: https://docs.gitlab.com/administration/packages/container_registry/
- GitLab container registry troubleshooting: https://docs.gitlab.com/administration/packages/container_registry_troubleshooting/
- GitLab NGINX settings: https://docs.gitlab.com/omnibus/settings/nginx/
- Install GitLab in a Docker container: https://docs.gitlab.com/install/docker/installation/
- Configure GitLab running in a Docker container: https://docs.gitlab.com/install/docker/configuration/
- Authenticate with the container registry: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- Build and push container images to the container registry: https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker port publishing and mapping: https://docs.docker.com/engine/network/port-publishing/
- Docker `login` CLI reference: https://docs.docker.com/reference/cli/docker/login/
- Certbot command reference: https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- OpenSSL `req` command reference: https://docs.openssl.org/3.1/man1/openssl-req/
- Let's Encrypt IP address certificate updates: https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability.html

## Issues Found
- The Omnibus example mixed a separate registry hostname with `registry_nginx['listen_port'] = 5050`, which would make the client-facing registry port inconsistent with `docker login registry.example.com`. I removed the incorrect port override and aligned the example with GitLab's documented separate-domain configuration on HTTPS.
- The Omnibus example used `nginx['listen_https_port']`, which is not the documented GitLab NGINX setting for this case. I removed that key and kept the configuration on `external_url`, `registry_external_url`, and valid `listen_addresses` entries.
- The NGINX IPv6 listener examples used `::` directly. I corrected them to GitLab's documented `"[::]"` form and used the documented service-specific `registry_nginx['listen_addresses']` example.
- The Docker Compose example used invalid port mappings such as `'[::]:80:80'` and `'[::]:5050:5050'`. Docker's current documentation shows that omitting a host IP publishes on all interfaces, and IPv6 host addresses in Compose port mappings use a different syntax. I removed the invalid entries.
- The Docker Compose example also exposed port `5050` even though the article used a separate registry hostname with no `:5050` in the external URL or Docker commands. I removed the unnecessary port mapping so the example matches the rest of the post.
- The sample IPv6 subnet `2001:db8:gitlab::/80` was syntactically invalid. I replaced it with a valid documentation prefix subnet.
- The TLS section only wrote an OpenSSL configuration file and never generated a certificate. I added a working `openssl req -x509` command and clarified that the Certbot example is for hostname certificates.
- The authentication examples used `docker login -p`, which is still accepted but is not the current recommended non-interactive pattern. I updated both the CLI example and the GitLab CI example to use `--password-stdin`, matching Docker and GitLab documentation.
- The CI example used floating `docker:24` tags while GitLab's current examples pin specific Docker image versions. I updated the sample to `docker:24.0.5-cli` and `docker:24.0.5-dind`.
- The troubleshooting example sent a handcrafted Basic auth header directly to `/v2/`, which is not the normal documented registry auth flow. I replaced it with a simpler IPv6 reachability check and corrected the listener checks to the registry's documented HTTPS and internal ports.

## Review Notes
- The Compose example still uses `gitlab/gitlab-ce:latest`. GitLab's Docker installation docs recommend pinning a specific GitLab version in production and using `latest` only for testing.
- Docker documents IPv6 container networking support for Linux hosts. Operators following the Compose section need Docker Engine running on Linux.
- The production Certbot example in the post requests certificates for the registry and GitLab hostnames. If a deployment specifically requires a publicly trusted certificate whose SAN contains the literal IPv6 address, current Let's Encrypt support exists but follows a different IP-address certificate flow than the hostname-based example shown here.
