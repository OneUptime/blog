# Validation Summary: How to Configure Prometheus to Scrape IPv6 Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus service discovery
- Prometheus relabeling
- Kubernetes service discovery in Prometheus
- IPv6
- curl

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus Kubernetes SD source (`api_server` parsing): https://github.com/prometheus/prometheus/blob/main/discovery/kubernetes/kubernetes.go
- Prometheus pod discovery source (`net.JoinHostPort` for pod target addresses): https://github.com/prometheus/prometheus/blob/main/discovery/kubernetes/pod.go
- RFC 3986 URI syntax: https://datatracker.ietf.org/doc/html/rfc3986/
- curl URL syntax reference: https://curl.se/docs/url-syntax.html

## Issues Found
- The Kubernetes `api_server` example used `2001:db8:k8s::1`, which is not a valid IPv6 literal because `k8s` is not hexadecimal. It was corrected to a valid documentation-prefix IPv6 address.
- The Kubernetes relabel rule was broken: it only captured the pod IP, then tried to reuse that same capture as both host and port (`[$1]:${1}`), which would not produce a valid `__address__`. It was corrected to rebuild `__address__` from `__meta_kubernetes_pod_ip` and `__meta_kubernetes_pod_container_port_number`, with brackets around the IPv6 host.
- The Prometheus query verification command embedded a raw PromQL selector directly in the URL. Prometheus documents that series selectors in query parameters need URL encoding, and the original command also risked curl globbing issues because of `{}`. It was changed to `curl -G --data-urlencode ...`.
- The final standards reference cited RFC 2732 as the URI syntax reference. RFC 3986 is the current generic URI syntax standard that defines bracketed IPv6 literals, so the reference and wording were updated accordingly.

## Review Notes
- Prometheus already generates correctly bracketed `__address__` values for discovered pod targets with declared container ports by using host-and-port joining internally. Manual `__address__` relabeling is only needed when overriding the discovered address.
- The `api_server` field in `kubernetes_sd_configs` is parsed as a URL in Prometheus source. When Prometheus runs in-cluster and default Kubernetes credentials are sufficient, the field can be omitted entirely.
