# Validation Summary: How to Use Docker with IPv6 Proxy Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker daemon proxy configuration
- Docker CLI/container proxy environment variables
- Docker Compose
- Docker Build / BuildKit
- IPv6
- systemd

## Sources Consulted
- Docker Docs: Daemon proxy configuration - https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Use a proxy server with the Docker CLI - https://docs.docker.com/engine/cli/proxy/
- Docker Docs: Build variables - https://docs.docker.com/build/building/variables/
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: `dockerd` reference - https://docs.docker.com/reference/cli/dockerd/
- Go package docs: `golang.org/x/net/http/httpproxy` - https://pkg.go.dev/golang.org/x/net/http/httpproxy
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax - https://www.rfc-editor.org/rfc/rfc3986.html

## Issues Found
- The `daemon.json` example was not valid JSON because it contained `//` comments. I removed the comments from the JSON block so it is copy-paste valid.
- The same `daemon.json` example mixed proxy settings with `ipv6`/`ip6tables` settings. That was misleading for a proxy-only example, and `ipv6` without `fixed-cidr-v6` is not a safe generic example for Docker 23.x through 27.x. I removed those keys and kept the supported `"proxies"` block only.
- The `daemon.json` method omitted the required daemon restart. I added `sudo systemctl restart docker`, which Docker documents as necessary after changing the file.
- The systemd verification command used `docker info | grep -i proxy`. I replaced it with `sudo systemctl show --property=Environment docker`, which is the verification method shown in Docker’s daemon proxy documentation for the systemd override approach.
- The container runtime examples used `alpine curl ...`, but the base `alpine` image does not include `curl` by default. I changed both examples to `alpine sh -c 'env | grep -i _PROXY'` so they reliably demonstrate that the proxy variables are present in the container.
- The build-time Dockerfile used `ARG` plus `ENV` to set proxy variables. Docker’s build documentation explicitly says proxy build arguments do not need to be declared or referenced in the Dockerfile, and referencing them causes the proxy configuration to end up in the build cache and image history. I removed the `ARG`/`ENV` proxy instructions and left the `docker build --build-arg ...` example.
- The IPv6 `curl` example used an invalid host literal (`fd00:docker::10`) and invalid URI syntax for a literal IPv6 address. RFC 3986 requires IPv6 literals in URIs to be enclosed in brackets. I changed the example to `http://[fd00::10]/api/`.
- The same IPv6 example used HTTPS against a placeholder literal address, which introduces certificate-validation ambiguity unrelated to proxy behavior. I changed it to HTTP so the example stays focused on `NO_PROXY` bypass behavior.

## Review Notes
- Docker documents that daemon proxy settings in `daemon.json` are ignored by Docker Desktop; this post is accurate for Docker Engine on Linux hosts but is not a Docker Desktop guide.
- Docker’s docs note there is no universal standard for proxy environment variable behavior across tools. The post’s advice to provide both uppercase and lowercase variants remains reasonable for compatibility.
