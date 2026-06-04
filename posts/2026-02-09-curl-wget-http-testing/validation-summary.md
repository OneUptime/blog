# Validation Summary: How to Use curl and wget for HTTP Endpoint Testing in Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl exec
- Kubernetes Services and DNS
- curl
- GNU Wget
- HTTP and HTTPS
- TLS certificates
- Bash scripting
- jq
- openssl

## Sources Consulted
- curl official man page: https://curl.se/docs/manpage.html
- GNU Wget official manual: https://www.gnu.org/software/wget/manual/wget.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Debug Services task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Local CLI checks: `curl --help all`, `curl --version`, and `wget --help`

## Issues Found
- The trace example used `curl -v --trace-ascii /dev/stdout`, but curl documents `--trace-ascii` as mutually exclusive with verbose mode and the local curl build warns that trace overrides verbose. Changed the command to `curl --trace-ascii - ...`, which uses curl's documented stdout target.
- The Wget header example said `wget saves headers with -S`, but GNU Wget documents `-S` / `--server-response` as printing server response headers. Updated the comment to say it prints headers.
- The load-balancing section implied even distribution is required. Kubernetes Service routing can be affected by session affinity, traffic policies, implementation defaults, and endpoint readiness, so this was softened to focus on persistent single-backend responses or unexpected skew.
- The `curl --dns-servers` example did not mention that the option depends on curl being built with c-ares support. Added that caveat.
- The Wget proxy examples used `http_proxy=proxy:8080`; GNU Wget documents proxy variables as URLs. Changed them to `http_proxy=http://proxy:8080`.
- The conclusion said curl and wget are always available in standard container images. Many minimal container images do not include them, so this was changed to say they are available in many utility images or easily added.

## Review Notes
- The examples assume the referenced files (`headers.txt`, `data.json`, and `document.pdf`) and tools (`curl`, `wget`, `jq`, `openssl`) exist inside the target container. In production clusters, a dedicated debug image or ephemeral debug container is often cleaner than installing tools in application images.
- Several Wget examples rely on GNU Wget behavior and flags. BusyBox Wget, common in minimal images, may support a smaller option set.
