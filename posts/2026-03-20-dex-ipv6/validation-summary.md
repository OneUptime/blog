# Validation Summary: How to Configure Dex with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dex
- OpenID Connect (OIDC)
- IPv6
- Python `ipaddress`
- Redis
- `curl`
- Kubernetes

## Sources Consulted
- Dex configuration documentation: https://dexidp.io/docs/configuration/
- Dex sample configuration (`config.yaml.dist`): https://raw.githubusercontent.com/dexidp/dex/master/config.yaml.dist
- Dex OpenID Connect overview and discovery example: https://dexidp.io/docs/openid-connect/
- Dex getting started guide: https://dexidp.io/docs/getting-started/
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Redis `INCR` command documentation: https://redis.io/docs/latest/commands/incr/
- Redis `EXPIRE` command documentation: https://redis.io/docs/latest/commands/expire/
- curl man page: https://curl.se/docs/manpage.html
- curl tutorial, IPv6 URL syntax: https://curl.se/docs/tutorial.html
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- Go `net` package documentation for bracketed IPv6 host:port syntax: https://go.dev/pkg/net/?m=old

## Issues Found
- The post claimed to show how to configure Dex with IPv6, but the original content only showed generic Python helpers. I added an actual Dex configuration snippet using `issuer` and `web.https` with bracketed IPv6 literals so the post now matches its title and description.
- The IPv6 sizing claim said a `/64` contains "trillions" of addresses. A `/64` actually contains `2^64` addresses, so I corrected the count and softened the guidance to describe prefix-based policy as an operational choice rather than a protocol requirement.
- The rate-limiting example did not normalize IPv4-mapped IPv6 addresses, which conflicted with the post’s own guidance. I updated it to reuse `normalize_ip()` before building the rate-limit key.
- The Redis rate-limiting example reset the TTL on every request by calling `EXPIRE` after every `INCR`. Redis documents that `EXPIRE` updates the timeout when called on an existing key, so the original code would keep extending the window indefinitely under steady traffic. I changed it to set the expiry only when the counter is first created.
- The testing section used `POST /auth/login` with JSON credentials, but Dex’s documented flow is OIDC browser-based and discovery-driven rather than a generic JSON login API. I replaced those commands with IPv6 checks against Dex’s discovery endpoint.
- The original `curl` examples used bracketed literal IPv6 URLs without `-g` / `--globoff`. curl documents that bracketed IPv6 literals in URLs require globbing to be disabled, so I added `-g`.
- The heading `Checking if an IP is IPv6` did not match the code beneath it, which normalizes addresses and checks CIDR membership. I renamed the heading to reflect what the code actually does.

## Review Notes
- The bracketed IPv6 Dex listen address (`"[::]:5556"`) is an inference from Dex’s documented `web.http` / `web.https` host:port configuration plus the standard IPv6 host:port syntax used by Go networking APIs.
- The post still includes Python/Redis examples that apply to surrounding services such as proxies, ingress controllers, or auth gateways rather than Dex itself. That is technically acceptable after clarifying the scope, but readers should not interpret those snippets as native Dex configuration options.
