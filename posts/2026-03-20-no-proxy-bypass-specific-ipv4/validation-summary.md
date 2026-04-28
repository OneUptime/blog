# Validation Summary: How to Bypass Proxy for Specific IPv4 Addresses Using no_proxy

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux environment variables (`no_proxy` / `NO_PROXY`)
- curl (CIDR support since 7.86.0)
- wget (`~/.wgetrc`)
- Python `requests` library
- Git (URL-specific HTTP proxy config)
- Docker daemon proxy (systemd drop-in override)
- Kubernetes (service/pod CIDRs, cluster DNS suffixes)
- Cloud metadata endpoints (AWS, GCP, Azure - `169.254.169.254`)
- RFC 1918 private IPv4 ranges and CIDR notation

## Sources Consulted
- curl release notes / changelog: https://curl.se/changes.html (CIDR support added in 7.86.0, October 26, 2022)
- curl man page: https://curl.se/docs/manpage.html (NO_PROXY behavior, `*` wildcard semantics)
- GNU Wget manual: https://www.gnu.org/software/wget/manual/wget.html (no_proxy = comma-separated domain extensions; no CIDR support)
- Python requests advanced usage docs: https://docs.python-requests.org/en/latest/user/advanced/ (env var support; per-request `proxies={'http': None, 'https': None}` bypass)
- git-config docs: https://git-scm.com/docs/git-config (`http.<url>.*` URL-specific configuration; empty string disables proxy)
- Docker daemon proxy docs: https://docs.docker.com/engine/daemon/proxy/ (systemd drop-in mechanism; leading-dot subdomain matching)
- kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/ (default `--service-cidr 10.96.0.0/12`)
- Flannel project: https://github.com/flannel-io/flannel (default Network `10.244.0.0/16`)
- AWS / GCP / Azure IMDS documentation (cloud metadata endpoint at `169.254.169.254`)

## Issues Found
No technical issues found. Every verifiable claim — curl 7.86 CIDR support, wget's lack of CIDR support, the cloud metadata IP, Python `requests` env-var/per-request behavior, Git URL-specific proxy syntax, the kubeadm default service CIDR (`10.96.0.0/12`), the Flannel default pod CIDR (`10.244.0.0/16`), `*` as a wildcard in curl, leading-dot subdomain matching, and the Docker systemd drop-in mechanism — checks out against official documentation. No edits made to README.md.

## Review Notes
- The systemd drop-in filename `proxy.conf` works fine (any `*.conf` in `/etc/systemd/system/docker.service.d/` is honored), but Docker's official example uses `http-proxy.conf`. Both are correct; this is not an error, just a stylistic divergence from the canonical example.
- Adding both `169.254.169.254` and `169.254.169.254/32` to `no_proxy` is redundant (a /32 represents a single host), but not incorrect.
- Behavior of leading-dot vs. no-dot host suffixes in `no_proxy` differs subtly across tools (curl, Go's net/http, Python requests, etc.). The post's introduction acknowledges that "different tools parse `no_proxy` differently," which appropriately frames the tool-specific examples.
- The "no_proxy with Wildcards" section contains a minor grammatical awkwardness ("entire bypasses proxy for everything") that is not a technical error and was therefore left unchanged per review scope.
