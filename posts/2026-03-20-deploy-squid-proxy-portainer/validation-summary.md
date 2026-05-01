# Validation Summary: How to Deploy Squid Proxy Cache via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Squid
- Portainer
- Docker
- Docker Compose / Compose Specification
- HTTP proxying
- HTTP caching
- Python Requests

## Sources Consulted
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Canonical Docker Hub page for `ubuntu/squid`: https://hub.docker.com/r/ubuntu/squid
- Squid config directive docs, `acl`: https://www.squid-cache.org/Doc/config/acl/
- Squid config directive docs, `http_access`: https://www.squid-cache.org/Doc/config/http_access/
- Squid wiki, Order Is Important: https://wiki.squid-cache.org/SquidFaq/OrderIsImportant
- Squid wiki, Access Controls in Squid: https://wiki.squid-cache.org/SquidFaq/SquidAcl
- Squid wiki, common security pitfalls: https://wiki.squid-cache.org/SquidFaq/SecurityPitfalls
- Squid wiki, The Cache Manager: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid wiki, Feature: HTTPS: https://wiki.squid-cache.org/Features/HTTPS
- Squid wiki, Squid on Ubuntu: https://wiki.squid-cache.org/KnowledgeBase/Ubuntu
- Squid config directive docs, `auth_param`: https://www.squid-cache.org/Doc/config/auth_param/
- Squid wiki, Authenticate with a NCSA httpd-style passwords file: https://wiki.squid-cache.org/ConfigExamples/Authenticate/Ncsa
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, `docker image pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs, Use a proxy server with the Docker CLI: https://docs.docker.com/engine/cli/proxy/
- Docker Docs, Daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Apache HTTP Server Docs, `htpasswd`: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- Apache HTTP Server Docs, Password Formats: https://httpd.apache.org/docs/2.4/en/misc/password_encryptions.html
- Requests documentation, Advanced Usage / Proxies: https://requests.readthedocs.io/en/stable/user/advanced/

## Issues Found
- The original `http_access` rules allowed local clients before the `CONNECT` restriction. Squid evaluates access rules in order, so I moved safe-port and CONNECT-deny rules ahead of the allow rules and added the standard `Safe_ports` ACLs to prevent unsafe outbound ports.
- The original configuration did not restrict Cache Manager access separately, so clients matching `localnet` could reach manager URLs. I added the standard localhost-only manager rules and updated the manager example to run from inside the container so it matches those ACLs.
- The stack used `ubuntu/squid:latest`. Canonical currently documents `latest` as an alias for `6.6-24.04_beta`; I pinned the image to that exact tag so the guide stays reproducible and does not drift to a future major version.
- The Compose example used the obsolete top-level `version: "3.8"` key. Current Compose documentation marks that field as obsolete, so I removed it.
- The application proxy examples mixed shell and Python code in one `bash` block. I split them into separate language-appropriate blocks.
- The Docker example used `docker pull --env HTTP_PROXY=...`, which is not a valid `docker pull` usage. Docker documents proxy flags for `docker run` and `docker build`, while image pulls use Docker daemon proxy configuration. I replaced the example with a valid `docker run` proxy example.
- The authentication command tried to run `htpasswd` inside `ubuntu/squid` without mounting the host path, so it would not create the host password file. I replaced it with an Apache-compatible MD5 (`$apr1$`) password-file command using `openssl`, which Apache documents as compatible with `htpasswd` output.
- The authentication snippet was incomplete: it omitted `auth_param basic children`, placed `http_access allow authenticated` in a way that would not work with the rest of the file, and did not account for the existing `deny all`. I replaced it with a complete access block that actually enforces authentication for `localnet`.
- The post did not make the password file available inside the container. I added the `/opt/squid/passwords` bind mount to the stack.
- The post implied Squid would cache ordinary HTTPS traffic. Squid forwards HTTPS through CONNECT tunnels by default, but it cannot cache the encrypted HTTP messages inside those tunnels unless TLS interception/SSL Bump is configured. I corrected the conclusion to reflect that.
- The authentication step did not tell readers to apply the config change. I added a `squid -k reconfigure` command to reload the updated configuration.

## Review Notes
- `ubuntu/squid:latest` is documented by Canonical as an alias today, but aliases can move over time. Pinning the exact tag is safer for a tutorial that depends on specific container behavior such as `squidclient`.
- The guide hardcodes public DNS servers in `dns_nameservers`. That is valid, but some environments may prefer using their local resolver policy instead.
- Docker was not installed in this workspace, so I validated Docker-specific behavior against upstream Docker and image documentation rather than executing the stack locally.
