# Validation Summary: How to Use DNS Records for High Availability in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes API server
- DNS A records and TTLs
- BIND
- CoreDNS
- dnsmasq
- Pi-hole
- AWS Route 53

## Sources Consulted
- Talos Linux CLI reference for `talosctl gen config` and `--config-patch-control-plane`: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux machine configuration reference for `cluster.controlPlane.endpoint` and `cluster.apiServer.certSANs`: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos Linux troubleshooting documentation for Kubernetes API endpoints using DNS names with multiple A/AAAA records: https://docs.siderolabs.com/talos/v1.11/troubleshooting/troubleshooting
- CoreDNS `hosts` plugin documentation for inline host records and `ttl`: https://coredns.io/plugins/hosts/
- AWS CLI Route 53 `create-health-check` reference for `Type`, `Port`, `RequestInterval`, and `FailureThreshold`: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- AWS Route 53 multivalue answer routing documentation for per-resource health checks: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-multivalue.html
- AWS Route 53 multivalue record values documentation for health check behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-multivalue.html
- Kubernetes API health endpoints documentation for `/healthz`, `/livez`, and `/readyz`: https://kubernetes.io/docs/reference/using-api/health-checks/
- Go `net` package documentation for TCP dialing behavior with hostnames that resolve to multiple IP addresses: https://pkg.go.dev/net

## Issues Found
- The verification example used `curl -k https://k8s-api.example.com:6443/healthz`. Kubernetes documents `/healthz` as deprecated since v1.16, so this was changed to `/readyz`.
- The Route 53 health check example targeted `192.168.1.101`. AWS endpoint health checks must be able to reach the target endpoint, so the section now notes that Route 53 endpoint health checks require public, routable endpoints or an alternative such as CloudWatch metric-based health checks for private-only control planes.
- The Route 53 health check guidance implied that individual IP values in one record set could be removed by associating a health check with "the DNS record." AWS Route 53 health-based DNS responses require separate health-checkable record sets, such as multivalue answer records. The text now says to associate each health check with its own multivalue answer record.

## Review Notes
The DNS round-robin approach is technically valid for clients that retry alternate resolved addresses, and the Go networking library used by Kubernetes clients documents trying each resolved TCP address until one succeeds. This is still not equivalent to a load balancer because DNS has no inherent per-connection health awareness and resolver/client caching can delay failover.
