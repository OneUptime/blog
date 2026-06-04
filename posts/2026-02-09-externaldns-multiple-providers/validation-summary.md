# Validation Summary: How to Set Up ExternalDNS with Multiple Providers Simultaneously

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services, Ingresses, Deployments, RBAC, Secrets
- ExternalDNS
- AWS Route53
- Google Cloud DNS
- Cloudflare DNS
- Prometheus Operator ServiceMonitor and PrometheusRule

## Sources Consulted
- ExternalDNS flags documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS AWS tutorial and deployment examples: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS service source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- ExternalDNS monitoring documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/monitoring/
- ExternalDNS available metrics documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/monitoring/metrics/
- ExternalDNS GitHub releases: https://github.com/kubernetes-sigs/external-dns/releases
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Google Cloud DNS authentication documentation: https://docs.cloud.google.com/dns/docs/authentication

## Issues Found
- Updated ExternalDNS container images from `v0.14.0` to `v0.21.0`, matching the current upstream release referenced by the official release notes and docs.
- Updated service-source RBAC from legacy `endpoints` access to `discovery.k8s.io` `endpointslices`, matching current ExternalDNS examples for Kubernetes service watching.
- Fixed the internal `ClusterIP` service example. A normal `ClusterIP` service with only `hostname` and `externalIPs` was not a reliable current ExternalDNS pattern; the example now uses `external-dns.alpha.kubernetes.io/target` and valid service ports/selectors.
- Added required `apps/v1` Deployment selectors and matching template labels to standalone Deployment snippets so copied examples are valid Kubernetes manifests.
- Added missing images to shorter ExternalDNS Deployment snippets so they are complete enough to run.
- Corrected the namespace filtering description from "label selectors" to "namespace filters" because the examples use `--namespace`.
- Changed the Prometheus alert expression from a raw counter comparison to `rate(external_dns_registry_errors_total[5m]) > 0`, so it alerts on recent registry errors instead of firing forever after any historical error.
- Standardized Cloudflare capitalization.

## Review Notes
- The post is technically valid after the fixes. In production, readers should still prefer managed cloud identities such as IRSA or Workload Identity over static credentials, as the post already recommends.
