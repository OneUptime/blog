# Validation Summary: How to Handle Data Residency Requirements with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD cluster secrets, AppProjects, resource tracking, custom resource actions, and REST API
- Kubernetes StorageClass, PersistentVolumeClaim, NetworkPolicy, and CronJob resources
- AWS EBS CSI driver storage parameters
- Kyverno ClusterPolicy validation rules
- Prometheus Operator PrometheusRule alerts
- Python requests-based auditing
- Data residency and compliance controls

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD resource actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Amazon EKS StorageClass documentation for EBS CSI parameters: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno match/exclude resource selection documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- PrometheusRule API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.13/html/monitoring_apis/prometheusrule-monitoring-coreos-com-v1

## Issues Found
- The NetworkPolicy section claimed policies prevent data from leaving a jurisdiction and used a hardcoded public AWS CIDR labeled as EU endpoints with an incorrect US exclusion. Updated the wording to "restrict data egress paths" and changed the example to internal VPC/PrivateLink endpoint CIDRs, which better matches Kubernetes NetworkPolicy's L3/L4 enforcement model.
- The Kyverno examples used deprecated `spec.validationFailureAction: enforce` with the wrong casing. Moved enforcement to each rule's `validate.failureAction: Enforce`, matching current Kyverno documentation.
- The compliance auditor Python example was invoked by a CronJob but had no entry point and referenced undefined methods. Added the Argo CD REST API application list call, region extraction, ConfigMap reference check helper, UTC timestamp handling, and a `__main__` entry point.
- The Argo CD server environment variable lacked a URL scheme for `requests`. Updated it to `https://argocd-server.argocd.svc`.
- The Deployment custom resource action would override built-in Deployment actions by default. Added `mergeBuiltinActions: true` so the custom compliance action is additive.

## Review Notes
- The Prometheus metric `network_policy_denied_total` is CNI/exporter-specific rather than a Kubernetes standard metric; operators should replace it with the deny/drop metric exposed by their networking provider.
- The compliance examples are technically plausible controls, but legal residency requirements still need jurisdiction-specific review and cannot be proven by Kubernetes manifests alone.
