# Validation Summary: How to Implement Security Scanning as PostSync Hook in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD resource hooks and sync waves
- Kubernetes Jobs, RBAC, ServiceAccounts, and NetworkPolicies
- Trivy container image scanning
- Kubescape Kubernetes framework scanning
- kube-bench CIS benchmark scanning
- Shell scripting with kubectl and jq

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Trivy image CLI reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/
- Trivy Kubernetes CLI help from `aquasec/trivy:0.49.0`
- Kubescape scanning documentation: https://kubescape.io/docs/scanning/
- Kubescape getting started documentation: https://kubescape.io/docs/getting-started/
- Kubescape CLI install documentation: https://kubescape.io/docs/install-cli/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kube-bench documentation and CLI help from `aquasec/kube-bench:v0.7.1`
- Bitnami kubectl container documentation: https://hub.docker.com/r/bitnami/kubectl

## Issues Found
- The Trivy Job used `kubectl`, but `aquasec/trivy:0.49.0` does not include `kubectl`. Added an `apk add --no-cache kubectl` step, verified against the Trivy image's Alpine base.
- The RBAC example only allowed pod and app-resource reads, but later examples also inspect NetworkPolicies, RBAC resources, and other workload objects. Expanded the Role to include the read permissions used by the examples.
- The Kubescape image tag `quay.io/kubescape/kubescape:v3.0` does not resolve, and the current `quay.io/kubescape/kubescape:latest` image is not the standalone CLI workflow shown. Replaced the example with `alpine:3.20` installing the Kubescape CLI via the official install script before running `kubescape scan framework nsa`.
- The NetworkPolicy example used `bitnami/kubectl:1.29`, which no longer resolves. Updated it to `bitnami/kubectl:latest`.
- The NetworkPolicy script used Python, but the current Bitnami kubectl image includes `jq`, not Python. Rewrote the JSON checks with `jq`.
- The root-user check only inspected container-level `securityContext` and missed pod-level settings. Updated it to evaluate both pod and container security contexts, and changed the pass message to avoid claiming it can prove image default users are non-root.
- The default-deny NetworkPolicy detection only checked `matchLabels` and could misclassify selectors that used `matchExpressions`. Updated the check to require an empty `podSelector`.
- The kube-bench section described the Job as cluster-level validation, but a single Job with hostPath mounts checks the node where it is scheduled. Changed the wording to node-level CIS validation.
- The reporting example captured Trivy's exit status without setting `--exit-code`, so vulnerability findings would not make `scan_exit` non-zero. Added `--exit-code 1`.
- The conclusion implied PostSync failure prevents issues from persisting in production. Since PostSync runs after resources are applied, changed the wording to say findings are surfaced immediately after deployment.

## Review Notes
The examples are now syntactically valid YAML and the referenced CLI flags were checked against current official docs or container help output. In a production implementation, teams should prefer prebuilt internal scanner images over installing tools during each Job run, and Kubescape framework scans may need broader read permissions depending on the selected framework and cluster scope.
