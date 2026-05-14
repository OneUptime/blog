# Validation Summary: How to Handle Cluster Failover with Flux CD GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- ExternalDNS
- AWS Route 53 DNS failover
- Kubernetes CronJob
- Kubernetes HorizontalPodAutoscaler
- PagerDuty notifications

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- ExternalDNS AWS tutorial and Route 53 annotations: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Helm chart values: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Horizontal Pod Autoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The ExternalDNS health endpoint Service comment said ExternalDNS would create a health-checked DNS record. ExternalDNS creates DNS records and can associate existing Route 53 health checks, but it does not create the health checks. Updated the comment to describe the DNS record accurately.
- The ExternalDNS Helm values used the deprecated top-level `provider: aws` form. Updated it to `provider.name: aws`, matching the current chart values.
- The ExternalDNS snippet mentioned low TTL behavior but did not set a TTL. Added `external-dns.alpha.kubernetes.io/ttl: "60"` to the application Ingress examples.
- The Route 53 health check association needed clarification that the health check ID must already exist. Added a comment next to `external-dns.alpha.kubernetes.io/aws-health-check-id`.
- The troubleshooting command selected pods with `app=cluster-health-monitor`, but the CronJob pod template did not define that label. Added the matching pod label.
- The Flux notification resources used `notification.toolkit.fluxcd.io/v1` for Provider and Alert, but current Flux Provider/Alert resources are documented under `v1beta3`. Updated both resources to `notification.toolkit.fluxcd.io/v1beta3`.
- The PagerDuty notification Provider used `type: generic` with the PagerDuty enqueue endpoint. Updated it to Flux's `type: pagerduty`, `address: https://events.pagerduty.com`, and `channel` for the routing key.
- The Alert used deprecated `.spec.summary`. Replaced it with `.spec.eventMetadata.summary`.

## Review Notes
- The local environment did not have `flux` or `kubectl` installed, so CLI syntax was checked against official documentation rather than local `--help` output.
- The examples remain illustrative and assume supporting resources exist, including the ExternalDNS HelmRepository, Route 53 health checks, Git credentials, failover monitor image, metrics-server for HPA metrics, and replicated data stores for stateful workloads.
