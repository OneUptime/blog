# Validation Summary: How to Set Up Docker Containers with SOCKS5 Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine and Docker daemon proxy configuration
- Docker Compose networking
- SOCKS5 proxying
- redsocks and iptables transparent proxying
- curl SOCKS proxy options
- Python requests SOCKS proxy support
- Node.js socks-proxy-agent
- OpenSSH dynamic port forwarding
- Docker BuildKit build arguments
- MicroSocks SOCKS5 server

## Sources Consulted
- Docker daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Docker CLI proxy configuration: https://docs.docker.com/engine/cli/proxy/
- Docker Compose service reference for `network_mode`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networking guide: https://docs.docker.com/compose/how-tos/networking/
- Docker `dockerd` reference for `host-gateway`: https://docs.docker.com/reference/cli/dockerd/
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker `run --help` and `build --help` local CLI output
- curl local `--help all` output for `--socks5` and `--socks5-hostname`
- RFC 1928, SOCKS Protocol Version 5: https://www.rfc-editor.org/rfc/rfc1928
- RFC 1929, Username/Password Authentication for SOCKS V5: https://www.rfc-editor.org/rfc/rfc1929
- Python requests advanced usage, SOCKS proxies: https://requests.readthedocs.io/en/stable/user/advanced/
- npm config documentation for proxy environment variables: https://docs.npmjs.com/cli/v7/using-npm/config/
- socks-proxy-agent package documentation: https://www.npmjs.com/package/socks-proxy-agent
- OpenSSH manual pages: https://www.openssh.org/manual.html
- MicroSocks upstream README: https://github.com/rofl0r/microsocks
- ncarlier/redsocks Docker Hub documentation: https://hub.docker.com/r/ncarlier/redsocks

## Issues Found
- The Docker daemon example used `ALL_PROXY`, but Docker's daemon proxy documentation lists `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` for daemon proxy behavior. Changed the daemon systemd drop-in to use `HTTP_PROXY` and `HTTPS_PROXY` with a `socks5h://` proxy URL.
- The redsocks sidecar example used `ncarlier/redsocks` with `PROXY_SERVER`, `PROXY_PORT`, and `PROXY_TYPE`, but the image documentation uses positional proxy arguments and host-network iptables behavior, not those environment variables. Replaced the snippet with an explicit Alpine-based sidecar command that installs redsocks and iptables, writes a redsocks configuration, and adds the transparent `OUTPUT` redirect rules in the shared network namespace.
- The text described `microsocks` and `dante` as SOCKS5-to-HTTP bridges. These are SOCKS server implementations, not generic SOCKS-to-HTTP bridge tools. Changed the wording to identify redsocks as the transparent TCP redirect tool used in the example.
- The BuildKit/npm example used `ALL_PROXY` and stated that npm respects it. npm's documented proxy environment variables are `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, and `https_proxy`. Updated the build command and Dockerfile snippet to pass `HTTP_PROXY` and `HTTPS_PROXY`.

## Review Notes
The examples remain Linux-oriented where they rely on systemd, iptables, and `NET_ADMIN`. Docker Desktop users may need Docker Desktop proxy settings or platform-specific networking adjustments.
