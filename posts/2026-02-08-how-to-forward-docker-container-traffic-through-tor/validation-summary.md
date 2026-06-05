# Validation Summary: How to Forward Docker Container Traffic Through Tor

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Tor and torrc configuration
- SOCKS5 and SOCKS5 hostname proxying
- iptables transparent proxying
- Python requests
- Docker Hub dperson/torproxy image

## Sources Consulted
- Docker container run reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Tor torrc manual: https://manpages.debian.org/unstable/tor/torrc.5.en.html
- Tor control protocol specification: https://spec.torproject.org/control-spec/commands.html
- Tor control protocol implementation notes: https://spec.torproject.org/control-spec/implementation-notes.html
- curl manual for `socks5h://` and `--socks5-hostname`
- Requests advanced proxy documentation: https://requests.readthedocs.io/en/stable/user/advanced/
- dperson/torproxy Docker Hub documentation: https://hub.docker.com/r/dperson/torproxy

## Issues Found
- The transparent proxy section configured Tor's `TransPort` and `DNSPort` but did not include the iptables NAT rules needed to intercept traffic. Added NAT rules, `NET_ADMIN`, and an app-container example that shares the proxy container's network namespace so the rules apply.
- The network namespace section incorrectly claimed that `--network container:tor-gateway` automatically routes all traffic through Tor. Updated it to explain that namespace sharing only makes the SOCKS proxy available at `127.0.0.1:9050` unless transparent proxy rules are added.
- The Tor control-port examples used unauthenticated `AUTHENTICATE` commands while showing `HashedControlPassword`. Updated the examples to authenticate with the configured password and use `printf` instead of relying on shell-specific `echo -e` behavior.
- The exit-node rotation section implied that Tor automatically changes exit IPs and that `NEWNYM` forces a new exit IP. Revised the wording to say Tor builds new circuits automatically and `NEWNYM` asks Tor to use clean circuits for new connections.
- The monitoring section referenced `/var/lib/tor/notices.log`, but the referenced container image logs notices to stderr. Replaced it with `docker logs --tail 20 tor-proxy`.

## Review Notes
The SOCKS proxy examples, Docker network usage, `socks5h://` DNS behavior, Python `requests[socks]` example, and Docker Compose snippets are technically sound. The `dperson/torproxy` image is usable for this guide, but it has not been updated recently; a future revision could consider pinning an image digest or using a locally maintained Tor image.
