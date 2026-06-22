# Validation Summary: How to Set Up Pod Security Standards (PSS) in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Pod Security Standards
- Pod Security Admission
- Pod securityContext and container securityContext
- Kubernetes audit policy
- kubectl
- Helm
- Prometheus / kube-state-metrics

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace label enforcement guide: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes built-in Pod Security Admission configuration guide: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes audit logging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes kube-apiserver audit configuration reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Bitnami NGINX Helm chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/nginx/values.yaml

## Issues Found
- Corrected the Baseline profile description. The post said NET_RAW is allowed and hostPath volumes are blocked except for safe types. Current Kubernetes PSS Baseline allows only a limited set of added capabilities such as NET_BIND_SERVICE and disallows hostPath volumes.
- Corrected the Restricted profile description. The post implied read-only root filesystems are required by PSS and that multiple safe capabilities can be added back. Restricted requires dropping ALL capabilities and only permits adding NET_BIND_SERVICE; read-only root filesystems are recommended but not a PSS requirement.
- Replaced `kubectl version --short` with `kubectl version` because the `--short` flag has been removed from current kubectl releases.
- Updated the Kubernetes 1.22 note. Pod Security Admission was alpha in 1.22 and not generally available, so the previous wording that users on 1.22 or earlier are simply still using PodSecurityPolicies was too broad.
- Fixed the audit policy example. `namespaces: ["*"]` is not how audit policy selects all namespaces; an empty namespaces list or omitted field matches every namespace. The comments and explanatory text now accurately say the policy logs pod create/update requests so Pod Security audit annotations are captured.
- Fixed the troubleshooting commands for rejected pods. A pod rejected by admission does not exist to be described, so the guidance now points users to controller events and ReplicaSet details.
- Updated the Helm example for the current Bitnami NGINX chart, using the OCI chart reference and the chart's documented `containerSecurityContext.*` values.

## Review Notes
The Kubernetes YAML snippets parsed successfully with PyYAML. `kubectl` and `helm` were not installed in the local environment, so CLI behavior was verified against official Kubernetes documentation and current chart documentation instead of local command output.
