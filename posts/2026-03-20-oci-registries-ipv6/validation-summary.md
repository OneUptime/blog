# Validation Summary: How to Configure OCI Registries over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Distribution (registry:2)
- Docker daemon (`insecure-registries`, daemon.json)
- OpenSSL (x509 cert generation with `subjectAltName`)
- Harbor (harbor.yml, docker-compose IPv6 networks)
- containerd (config.toml registry mirrors/configs)
- Kubernetes (imagePullSecrets, Pod spec, kubectl)
- Skopeo (image copy between registries)
- IPv6 addressing (RFC 3849 documentation prefix, bracket notation per RFC 3986)
- curl, ss (verification tools)

## Sources Consulted
- Docker Distribution config reference: https://distribution.github.io/distribution/about/configuration/
- Docker daemon configuration: https://docs.docker.com/engine/reference/commandline/dockerd/
- containerd CRI registry configuration: https://github.com/containerd/containerd/blob/main/docs/cri/registry.md and https://github.com/containerd/containerd/blob/main/docs/hosts.md
- Harbor installation/configuration: https://goharbor.io/docs/latest/install-config/configure-yml-file/
- Skopeo documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- kubectl create secret docker-registry: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation)
- RFC 3986 (URI generic syntax — bracket notation for IPv6 in URIs)
- OpenSSL `req` man page (`-addext` for X.509 v3 extensions)

## Issues Found
- The post used invalid IPv6 placeholders containing non-hex characters: `[2001:db8::registry]`, `[2001:db8::source]`, `[2001:db8::dest]`, `[2001:db8::harbor]`, and `fd00:harbor::/64`. IPv6 hextets only allow `0-9` and `a-f`, so words like `registry`, `source`, `dest`, and `harbor` cannot appear in a valid address. These would fail in the `openssl ... -addext "subjectAltName=IP:..."` argument (which requires a parseable IP), in `docker push/pull` (which parse the host as an IPv6 literal when bracketed), and in `curl -6 http://[...]:5000/...`. Replaced all instances with valid documentation-prefix addresses (`2001:db8::1`, `2001:db8::2`) per RFC 3849, and `fd00:harbor::/64` with `fd00:1::/64`.
- The `skopeo copy "docker://nginx:latest" ...` example was changed to the explicit canonical form `docker://docker.io/library/nginx:latest` to avoid relying on default-namespace resolution and to make the example unambiguous.

## Review Notes
- The containerd configuration example uses the legacy `[plugins."io.containerd.grpc.v1.cri".registry.mirrors]` / `.registry.configs` blocks. These have been deprecated since containerd 1.5 in favor of `config_path = "/etc/containerd/certs.d"` with per-host `hosts.toml` files, and support is removed in containerd 2.0. The shown form still works for containerd 1.x users on most current Kubernetes nodes; a future revision could mention the `hosts.toml` migration path.
- The note on Harbor IPv6 literal hostnames is appropriately hedged. In practice, Harbor's installer expects a hostname that maps cleanly to a generated certificate CN/SAN, and using a DNS name with an `AAAA` record is the supported route.
- The `curl -6` examples assume the registry is reachable over plain HTTP. For TLS-protected registries, readers will need `-k` or a properly trusted CA, but the existing TLS section already shows the cert setup.
- `docker run -p "[::]:5000:5000"` correctly publishes on the IPv6 wildcard; on dual-stack hosts with `net.ipv6.bindv6only=0` (the Linux default), this also accepts IPv4 traffic via 4-in-6 mapped addresses.
