# Validation Summary: How to Audit Istio RBAC Policy Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio security and networking custom resources
- Kubernetes audit logging and resource metadata
- kubectl
- Google Kubernetes Engine audit logging
- Amazon EKS control plane audit logging
- OPA Gatekeeper constraints
- Prometheus alerting rules
- jq and shell scripting

## Sources Consulted
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- GKE audit logging documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/audit-logging
- GKE audit policy documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/audit-policy
- Amazon EKS control plane logs documentation: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- AWS CLI update-cluster-config reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-config.html
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper usage documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/

## Issues Found
- The opening audit logging statement said Kubernetes audit logs record every API request. This was too broad because audit coverage depends on the configured audit policy and backend. Changed it to say audit logs can record API requests.
- The GKE command used cluster logging flags and master authorized networks, which do not enable Kubernetes audit logs. Replaced it with accurate GKE guidance that Admin Activity audit logs are enabled by default and Data Access audit logs must be enabled through Cloud Audit Logs when needed.
- The watcher container attempted to parse multi-line `kubectl get --watch -o json` output one line at a time with `jq`, which would not reliably parse JSON objects. Changed the watcher to use `kubectl` custom columns and shell parsing.
- The watcher manifest referenced an undefined `istio-readonly` ClusterRole. Added a scoped ClusterRole for the watched Istio resources and bound the ServiceAccount to it.
- The watcher used `/bin/bash`; changed it to `/bin/sh` to avoid depending on Bash in a minimal kubectl image.
- The Gatekeeper text claimed the policy prevented direct `kubectl apply`, but the policy only checked labels. Updated the description to accurately say it requires a GitOps managed-by label.
- The Gatekeeper template declared a `managedBy` parameter but did not use it. Updated the Rego to require `app.kubernetes.io/managed-by` to match `input.parameters.managedBy`, including safe handling for missing labels.
- The compliance command comment claimed it listed all users and groups with write access to Istio security resources, but it only listed bindings whose role name matched `istio`. Updated the comment to describe it as a starting point for access review.

## Review Notes
The Prometheus alerts use Kubernetes API server request metrics with labels documented in the Kubernetes metrics reference. Availability of those metrics can vary in managed Kubernetes environments depending on how API server metrics are exposed and scraped.
