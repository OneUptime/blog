# Validation Summary: How to Implement Multi-Region Canary Deployments Across Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes CronJob
- Argo Rollouts
- Argo Rollouts kubectl plugin
- Argo CD ApplicationSet
- ExternalDNS
- Amazon Route 53
- Prometheus / PromQL

## Sources Consulted
- Argo Rollouts canary strategy documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts kubectl plugin documentation: https://argoproj.github.io/argo-rollouts/features/kubectl-plugin/
- Argo Rollouts status command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_status/
- Argo Rollouts Prometheus analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/
- Argo Rollouts controller metrics documentation: https://argoproj.github.io/argo-rollouts/features/controller-metrics/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet generators documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- ExternalDNS CRD source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/crd/
- ExternalDNS AWS tutorial / routing policies: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS source code for AWS provider-specific keys: https://github.com/kubernetes-sigs/external-dns/blob/master/provider/aws/aws.go
- ExternalDNS source code for DNSEndpoint fields and target validation: https://github.com/kubernetes-sigs/external-dns/blob/master/endpoint/endpoint.go
- Amazon Route 53 GeoLocation API reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_GeoLocation.html
- Amazon Route 53 weighted routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The ExternalDNS DNSEndpoint example used `A` records with DNS hostnames as targets and put multiple regional targets under one geolocation endpoint. Changed the records to `CNAME`, one target per geolocation record, and added `setIdentifier` values so Route 53 can distinguish records with the same name and type under routing policies.
- The ExternalDNS provider-specific key used `aws/route53/geolocation-continent-code`, which is not the current AWS provider key. Changed it to `aws/geolocation-continent-code`.
- The ApplicationSet example used `destination.server: '{{cluster}}'` while the list values were cluster names, not Kubernetes API server URLs. Changed it to `destination.name: '{{cluster}}'`.
- The rollout script ran `kubectl argo rollouts status` twice and grepped for `Healthy`. Changed it to use the status command's exit status from the watched command, matching the documented behavior that it returns success only when healthy.
- The Argo Rollouts Prometheus AnalysisTemplate used `successCondition: result < ...`; Prometheus provider results are vectors. Changed conditions to `result[0] < ...`.
- The rollout metric example used `argo_rollouts_info`, but the documented metric is `rollout_info`. Updated the metric name.
- The regional success-rate PromQL did not aggregate away the `status` label, which could produce incorrect vector matching. Changed it to divide `sum by (region)` success rates by `sum by (region)` total rates.
- The CronJob examples described local deployment times but did not set `.spec.timeZone`. Added IANA time zones and local 2 AM schedules using the Kubernetes CronJob `timeZone` field.

## Review Notes
- The Argo Rollouts canary example does not configure a traffic router. This is valid, but without traffic management Argo Rollouts approximates canary weight by scaling ReplicaSets rather than controlling exact request routing.
- The CronJob examples assume the container has usable Kubernetes credentials and contexts available at runtime; production setups should provide those through service accounts or mounted kubeconfig.
