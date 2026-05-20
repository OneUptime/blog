# Validation Summary: How to Implement Geo-Based Routing with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes Secrets, Deployments, liveness probes, and AppProject resources
- Kustomize overlays and JSON 6902 patches
- AWS Route 53 geolocation records and health checks
- Terraform AWS provider for Route 53 records
- Cloudflare Load Balancing geo steering
- Prometheus Operator PrometheusRule resources and PromQL

## Sources Consulted
- Argo CD declarative cluster setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD ApplicationSet Cluster generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Project specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- AWS Route 53 geolocation routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html
- AWS Route 53 geolocation record values and health check behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-geo.html
- Terraform AWS provider aws_route53_record resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Cloudflare Load Balancing geo steering: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/geo-steering/
- Cloudflare Load Balancer Regions API: https://developers.cloudflare.com/load-balancing/reference/region-mapping-api/
- Cloudflare Load Balancers API reference: https://developers.cloudflare.com/api/resources/load_balancers/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting and recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The AWS Route 53 Terraform example was fenced as `yaml`, even though the snippet is HCL. Changed the code fence to `hcl`.
- The health check section said failed regions should route to the "next closest healthy cluster." Route 53 geolocation records look for a larger associated geographic record, while Cloudflare geo steering follows configured pool/fallback order. Updated the wording to "configured healthy fallback" to match provider behavior.
- The AppProject snippet comment implied `clusterResourceBlacklist` denies deployment to non-EU clusters. Argo CD enforces that through the `destinations` allowlist in this example. Updated the comment to point to the destinations allowlist.
- The summary said geo routing always serves the closest cluster and that health checks fail over generically. Updated wording to "appropriate regional cluster" and "configured healthy fallbacks" for technical precision.

## Review Notes
- The Prometheus latency alert is syntactically valid, but a production rule would usually aggregate histogram buckets with `sum by (region, le)` before `histogram_quantile` to alert on regional latency rather than individual time series.
- The Kustomize examples replace the full container `env` list. This is valid JSON 6902 behavior, but future revisions could use more targeted patches or ConfigMaps/Secrets for maintainability.
