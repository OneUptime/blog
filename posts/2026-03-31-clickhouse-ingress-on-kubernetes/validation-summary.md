# Validation Summary: How to Configure ClickHouse Ingress on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface on 8123, native TCP on 9000)
- Kubernetes Ingress (`networking.k8s.io/v1`)
- ingress-nginx (NGINX Ingress Controller)
- cert-manager (`cert-manager.io/v1` Certificate)
- Let's Encrypt (ClusterIssuer)
- htpasswd / Kubernetes Secrets (basic auth)
- Kubernetes Service (LoadBalancer type)
- TCP services ConfigMap (NGINX `--tcp-services-configmap`)

## Sources Consulted
- ClickHouse interfaces documentation: https://clickhouse.com/docs/en/interfaces/http and https://clickhouse.com/docs/en/interfaces/tcp (port defaults 8123 and 9000)
- Kubernetes Ingress reference: https://kubernetes.io/docs/concepts/services-networking/ingress/ (`networking.k8s.io/v1`, `pathType`, `ingressClassName`)
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/ (verified `proxy-body-size`, `proxy-read-timeout`, `proxy-send-timeout`, `auth-type`, `auth-secret`, `auth-realm`, `whitelist-source-range`, `limit-rps`, `limit-connections`)
- ingress-nginx exposing TCP/UDP services: https://kubernetes.github.io/ingress-nginx/user-guide/exposing-tcp-udp-services/ (ConfigMap format `"<port>": "<namespace>/<service>:<port>"`)
- cert-manager Certificate API: https://cert-manager.io/docs/usage/certificate/ (`cert-manager.io/v1`, `secretName`, `issuerRef`, `dnsNames`)
- Apache `htpasswd` man page (`-c` creates new password file)

## Issues Found
No technical issues found. All API versions, annotation names, ConfigMap formats, port numbers, and CLI flags are current and correct. The Ingress, Certificate, Service, and ConfigMap manifests are syntactically valid and would deploy as described.

## Review Notes
- The phrase "NGINX TCP pass-through" is used colloquially. Strictly speaking, the ConfigMap-based mechanism described (`--tcp-services-configmap`) is L4 TCP proxying through ingress-nginx, not SSL pass-through (which is a separate `ssl-passthrough` feature). The example shown is correct for the proxying use case, just worth noting the terminology is loose.
- `proxy-body-size: "500m"` allows 500 MB request bodies — appropriate for large ClickHouse INSERTs but readers should size this to their workload.
- The `whitelist-source-range` annotation is the long-standing name still supported by ingress-nginx; no deprecation at time of review.
- The TCP `LoadBalancer` service example does not configure TLS — for the native protocol, TLS would need to be enabled inside ClickHouse itself (port 9440) since L4 LoadBalancers don't terminate TLS. Out of scope for this post but worth flagging for future expansion.
