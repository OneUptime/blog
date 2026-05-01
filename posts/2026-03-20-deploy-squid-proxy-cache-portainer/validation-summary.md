# Validation Summary: How to Deploy Squid Proxy Cache via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Squid proxy cache
- Portainer stacks
- Docker Engine
- Docker Compose / Compose Specification
- Docker daemon proxy configuration
- Docker registry mirrors

## Sources Consulted
- Docker daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Docker Compose `version` top-level element status: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker registry pull-through cache / mirror behavior: https://distribution.github.io/distribution/recipes/mirror/
- Docker registry configuration reference: https://distribution.github.io/distribution/about/configuration/
- Squid `acl` directive reference: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_port` directive reference: https://www.squid-cache.org/Doc/config/http_port/
- Squid `ssl_bump` directive reference: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid `cache_dir` directive reference: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid explicit SSL Bump example: https://wiki.squid-cache.org/ConfigExamples/Intercept/SslBumpExplicit
- Canonical `ubuntu/squid` image tags: https://hub.docker.com/r/ubuntu/squid/tags
- Ubuntu package metadata for `squid-openssl`: https://packages.ubuntu.com/noble/squid-openssl
- Ubuntu package search results for `squidclient`: https://packages.ubuntu.com/search?keywords=squidclient

## Issues Found
- The image tag `ubuntu/squid:5.7-22.04_beta` was invalid for the current Canonical image tags. I replaced it with a current published tag, `ubuntu/squid:6.6-24.04_edge`.
- The Compose file used the obsolete top-level `version` field. I removed it to match the current Compose Specification.
- The Squid ACL example defined `Safe_ports` but did not enforce them, and it did not allow localhost cache-manager access needed for local monitoring. I added the standard `http_access` checks for manager access, unsafe ports, CONNECT restrictions, and localhost access.
- The ACLs allowed destination port `8443` as safe, but only permitted CONNECT on `443`. I added `8443` to `SSL_ports` so the access rules are internally consistent.
- The `NO_PROXY` example used `*.internal.example.com`, which is less portable across proxy consumers. I changed it to `.internal.example.com`.
- The Docker daemon systemd drop-in was labeled as JSON even though it is a systemd unit fragment, and the surrounding text incorrectly said this applies proxy settings to all containers. I changed the block to `ini`, corrected the description to daemon-originated traffic, and noted that Docker must be restarted.
- The `daemon.json` proxy example used the wrong schema (`default` with `httpProxy`/`httpsProxy`/`noProxy`), which is Docker client config syntax rather than Docker daemon config syntax. I replaced it with the documented daemon keys: `http-proxy`, `https-proxy`, and `no-proxy`.
- The registry section incorrectly implied that pointing Docker at Squid gives registry pull-through caching. I corrected the section to distinguish Docker Hub pull-through caching via `registry-mirrors` from outbound proxying via Squid.
- The JSON snippet contained a `//` comment, which is invalid JSON. I removed the comment so the snippet is syntactically correct.
- The monitoring example used `squidclient` from the Portainer console, but `squidclient` is a separate Ubuntu package and is not guaranteed to be present in the image. I replaced it with a log-based HIT/MISS inspection command.
- The SSL Bump example used `https_port ... intercept ssl-bump`, which is for interception mode rather than an explicit forward proxy receiving CONNECT requests. I updated it to `http_port ... ssl-bump`, switched to current `tls-cert=` syntax, and clarified that SSL Bump requires an OpenSSL-capable Squid build plus certificate database initialization and client trust of the Squid CA.
- The summary overstated Squid’s value for caching container image pulls by itself. I corrected it to say Squid is useful for repetitive HTTP downloads and that container image pull-through caching should be paired with a registry mirror.

## Review Notes
- The forward-proxy and caching guidance is now technically sound for a basic Squid deployment via Portainer.
- The SSL Bump section remains advanced and environment-specific. It requires a Squid build compiled with OpenSSL/`ssl_bump` support; a generic Squid container image should not be assumed to support this automatically.
- Docker `registry-mirrors` provides pull-through caching for Docker Hub; it is not a general solution for mirroring arbitrary upstream registries.
