# Validation Summary: How to Configure Prometheus Target Discovery with Kubernetes Service Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Kubernetes service discovery
- Prometheus relabeling
- Kubernetes Pods, Services, Nodes, Endpoints, EndpointSlices, and Ingress
- Kubernetes API authentication with service account tokens

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The post stated that Prometheus supports five Kubernetes service discovery roles. Current Prometheus documentation lists six roles: `node`, `service`, `pod`, `endpoints`, `endpointslice`, and `ingress`. Updated the role count and added the `ingress` role.
- The pod discovery relabeling example rewrote `__address__` to only the annotated port, producing an invalid scrape address like `8080`. Updated the relabeling rule to preserve the discovered pod host and replace only the port.
- The service discovery section described scraping "through service endpoints" and annotated the service with target port `8080` while the Service exposed port `80`. Prometheus `role: service` discovers service DNS names and service ports, so the text and annotation were corrected to use the service port.
- A node discovery comment said node internal IPs were being mapped, but the relabel rule only mapped node labels. Updated the comment to match the rule.
- Several relabel `regex: true` values were unquoted. Quoted them as `"true"` so they are clearly string regexes in Prometheus configuration.
- The performance section incorrectly implied Kubernetes discovery refreshes on `scrape_interval` and showed `own_namespace: false` as a way to exclude system namespaces. Updated the note to say `scrape_interval` controls scraping, Kubernetes discovery stays synchronized through the Kubernetes API, and `own_namespace: true` limits discovery to Prometheus's namespace.
- The debug logging example used invalid `global.log_level` YAML. Prometheus debug logging is configured with the `--log.level=debug` command-line flag, so the example was corrected.
- The complete configuration claimed to include all discovery roles, but it included only pod, service, and node jobs. Updated the wording to "common discovery roles."

## Review Notes
- The examples assume Prometheus has Kubernetes RBAC permissions to list/watch the relevant resources and, for node proxy scraping through the API server, permission to access node proxy endpoints.
- Kubernetes Endpoints are deprecated as of Kubernetes v1.33; the post already recommends EndpointSlices for larger clusters, which aligns with current Kubernetes and Prometheus documentation.
