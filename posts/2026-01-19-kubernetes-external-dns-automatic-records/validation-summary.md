# Validation Summary: How to Set Up Kubernetes External DNS for Automatic DNS Records

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Services, Ingress, RBAC, Deployments, Gateway API, and ServiceMonitor resources
- ExternalDNS
- Helm and the Bitnami ExternalDNS chart
- AWS Route53 and EKS IRSA
- Google Cloud DNS
- Azure DNS
- Cloudflare DNS
- Prometheus metrics and alerting

## Sources Consulted
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Azure tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/azure/
- ExternalDNS GKE / Google Cloud DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/v0.14.2/tutorials/cloudflare/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS flags documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS metrics documentation: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/monitoring/metrics.md
- ExternalDNS official Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- Bitnami ExternalDNS chart values: https://github.com/bitnami/charts/blob/main/bitnami/external-dns/values.yaml
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/

## Issues Found
- The Route53 IAM policy omitted `route53:ListTagsForResources` from the hosted-zone permissions. Added it and grouped `route53:ListResourceRecordSets` with hosted-zone resources to match the current ExternalDNS AWS tutorial.
- The Bitnami Helm values used a top-level `zoneType`, but Bitnami documents this under `aws.zoneType`. Moved the value into the existing `aws:` block.
- The full AWS manifest pinned ExternalDNS `v0.14.0`, while the current AWS tutorial requires ExternalDNS `>=0.15.0` and currently documents `v0.21.0`. Updated the image tag to `v0.21.0`.
- The RBAC example used stale or incomplete permissions for the selected sources. Updated it to include `discovery.k8s.io/endpointslices`, use `networking.k8s.io` ingress permissions, include Gateway API `gateways` and `httproutes`, and add namespace list/watch permissions needed by Gateway route sources.
- The GCP commands used inconsistent project placeholders (`my-project` and `my-gcp-project`). Standardized them to `my-gcp-project`.
- The Azure service principal example granted DNS-zone permissions but omitted Reader access on the containing resource group, which ExternalDNS documents as necessary. Added the Reader role assignment command.
- The Gateway API example put a hostname annotation on the `Gateway`, but ExternalDNS Gateway API route sources read hostname-related annotations from Route resources, not the Gateway. Removed the ineffective Gateway annotation and left the `HTTPRoute.spec.hostnames` example.
- The internal DNS Service example placed Service annotations under `spec`, used a non-existent per-Service `aws-zone-type` annotation, and used the deprecated AWS internal-load-balancer annotation. Moved annotations to metadata, used `external-dns.alpha.kubernetes.io/internal-hostname`, added a note to run the controller with `--aws-zone-type=private` for private Route53 zones, and changed the AWS load balancer annotation to `service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"`.
- The ServiceMonitor example selected a Service that was not defined in the snippet. Added a matching Kubernetes Service with a `metrics` port.

## Review Notes
- The post intentionally uses the Bitnami Helm chart, whose values still support `provider: aws`; this differs from the newer official ExternalDNS chart, where `provider.name` is preferred.
- ExternalDNS documentation now presents `external-dns.kubernetes.io/...` as the default annotation prefix, while many examples and existing deployments still use `external-dns.alpha.kubernetes.io/...`. The post's alpha-prefixed annotations were left unchanged because they remain common and are represented in ExternalDNS examples.
