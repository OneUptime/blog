# Validation Summary: How to Set Up Active-Passive Clusters with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization and HelmRelease APIs
- Kubernetes Deployments, Ingresses, CronJobs, and kubectl
- ExternalDNS
- Amazon Route 53 DNS failover and health checks
- AWS CLI Route 53 record changes

## Sources Consulted
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS AWS tutorial and routing policy documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS CRD source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/crd/
- ExternalDNS flags documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- Kubernetes kubectl scale documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes kubectl cordon documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Amazon Route 53 failover routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-failover.html
- Amazon Route 53 failover record values documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover.html
- Amazon Route 53 health check selection behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html

## Issues Found
- The repository layout omitted the `external-dns` and `dns-failover.yaml` files used later in the guide. Added them to the example tree so the structure matches the snippets.
- The passive Ingress patch used `external-dns.alpha.kubernetes.io/exclude`, which is not a documented ExternalDNS annotation. Replaced it with `external-dns.alpha.kubernetes.io/controller: standby`, which ExternalDNS documents as a way to ignore resources when the value differs from `dns-controller`.
- The ExternalDNS Helm values used deprecated/old `provider: aws` style and non-chart fields under `aws`. Updated the chart version to `1.20.x`, used `provider.name: aws`, configured `sources`, moved AWS options to `extraArgs`, and added `managedRecordTypes` for CRD-managed A records.
- The text implied `evaluateTargetHealth` configures Route 53 health checks. ExternalDNS and Route 53 docs state health checks must be created separately and then referenced. Updated the comments to make that explicit.
- The manual failover and failback loops used `kubectl scale "$deploy" --replicas=... -A`, but `kubectl scale` does not support `-A` for named resources. Reworked the loops to read namespace/name pairs and scale each Deployment with `-n`.
- The manual DNS updates would conflict with the Route 53 failover records if used at the same time. Added comments to skip those simple-record UPSERTs when using the failover-record configuration shown earlier.
- The CronJob used `curlimages/curl`, which does not provide `kubectl`, and stored failure state in `/tmp`, which would not persist across CronJob pods. Changed the image to one that includes Kubernetes tooling and changed the script to perform three checks inside one job run.
- The test command used `kubectl cordon --all`, but `kubectl cordon` supports node names or label selectors, not `--all`. Replaced it with a node list piped to `kubectl cordon` while preserving the intended kubeconfig.

## Review Notes
- The post is now technically consistent as a tutorial, but a production implementation should also include the omitted RBAC for `failover-controller`, a pinned watcher image digest, Route 53 health check creation, and clear ownership settings if multiple ExternalDNS instances manage the same hosted zone.
