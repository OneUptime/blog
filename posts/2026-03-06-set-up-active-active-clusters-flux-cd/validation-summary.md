# Validation Summary: How to Set Up Active-Active Clusters with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Deployments, Services, Ingress, ConfigMaps, and HorizontalPodAutoscaler
- Kustomize and Flux Kustomization resources
- HelmRelease resources
- ExternalDNS with AWS Route53
- PrometheusRule monitoring
- AWS Aurora Global Database and ElastiCache Global Datastore concepts

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux bootstrap CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS AWS Route53 tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS CRD source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/crd/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS AWS provider source constants: https://github.com/kubernetes-sigs/external-dns/blob/master/provider/aws/aws.go
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The Mermaid architecture diagram reused node IDs as subgraph IDs, which can break rendering. Updated it to connect the load balancer and Git repository to resources inside distinct cluster subgraphs.
- The global load balancing subsection was titled "AWS Global Accelerator with Route53" but the configuration shown used ExternalDNS-managed Route53 records, not Global Accelerator. Renamed the heading to match the implementation.
- The ExternalDNS Helm values used the deprecated top-level `provider: aws` format and an old chart version. Updated the snippet to the current chart style with `provider.name`, `extraArgs.aws-zone-type`, and chart version `1.20.x`.
- The ExternalDNS HelmRelease did not enable the `crd` source even though the post uses `DNSEndpoint` resources. Added `crd` to the chart `sources` list.
- The health-check Ingress referenced a `health-endpoint` Service that was not defined. Added the missing Service manifest.
- The DNS weight patch commands used a merge patch that would replace the whole `endpoints` list and drop required fields such as `recordType`, `targets`, and `setIdentifier`. Replaced them with JSON Patch commands that only update the weight value and explicitly target Cluster A's kubeconfig.

## Review Notes
The remaining examples are valid as illustrative GitOps patterns, but a production implementation should still define the referenced `HelmRepository` resources, IAM permissions, Route53 health checks, ingress controllers, and cluster-specific root Kustomization wiring outside the snippets shown here.
