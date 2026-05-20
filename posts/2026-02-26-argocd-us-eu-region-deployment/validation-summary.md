# Validation Summary: How to Deploy to US and EU Regions with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet and Progressive Syncs
- GitOps
- Kubernetes Deployments, Secrets, HorizontalPodAutoscalers, and NetworkPolicies
- Kustomize overlays, generators, and patches
- Prometheus Operator PrometheusRule resources
- PromQL histogram queries
- AWS US and EU regions
- GDPR-oriented deployment controls

## Sources Consulted
- Argo CD declarative cluster setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet Progressive Syncs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus histogram and summary best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus `histogram_quantile()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- AWS Regions documentation: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html
- IANA Language Subtag Registry: https://www.iana.org/assignments/language-subtag-registry

## Issues Found
- The US and EU Kustomize overlays used `configMapGenerator.behavior: replace` even though the base did not define an existing `region-config` ConfigMap. Kustomize requires `replace` to target an existing generated or declared resource, so I removed `behavior: replace` from both overlays.
- The EU `gdpr/consent-service.yaml` example was described as a sidecar patch but listed under `resources`, which would create an invalid duplicate Deployment resource instead of patching the base Deployment. I moved it into the `patches` list.
- The EU overlay text said it included everything from the US overlay. The actual structure uses the same base with a separate EU overlay, so I corrected that sentence.
- The EU NetworkPolicy was introduced later in the post but was not listed in the EU overlay structure or `resources`, so it would not be deployed by that overlay. I added `network-policy-gdpr.yaml` to both places.
- The `eu-west-1` example used `Europe/London` as the timezone. AWS documents `eu-west-1` as Europe (Ireland), so I changed the timezone value to `Europe/Dublin`.
- The ApplicationSet example used `RollingSync` together with `syncPolicy.automated`. Argo CD documents that RollingSync disables autosync on generated Applications and requires Progressive Syncs to be enabled, so I removed `syncPolicy.automated` and added that caveat before the example.
- The NetworkPolicy comments said US endpoints were explicitly blocked, but the policy actually works as an egress allowlist where non-matching destinations are denied by default. I corrected the comments.
- The latency alert averaged summary quantiles, which Prometheus documents as not aggregatable. I changed the query to calculate p99 latency from histogram buckets with `histogram_quantile()` and `rate()`.

## Review Notes
The GDPR-related environment variables and annotations are application-specific examples rather than Kubernetes- or Argo CD-enforced controls. They are acceptable as illustrative configuration, but real compliance would also require application behavior, cloud IAM/KMS policy, storage configuration, audit controls, and legal review outside of these manifests.
