# Validation Summary: How to Troubleshoot Controller Leader Election Failures in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes
- Kubernetes Lease API
- kubectl
- Kubernetes RBAC

## Sources Consulted
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux source-controller source code: https://github.com/fluxcd/source-controller/blob/main/main.go
- Kubernetes Leases documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes Coordinated Leader Election documentation: https://kubernetes.io/docs/concepts/cluster-administration/coordinated-leader-election/
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The Flux Lease examples used `source-controller`, but current Flux leader election Lease names use the `*-controller-leader-election` pattern. Updated the source-controller examples to `source-controller-leader-election`.
- The default lease duration was described as typically 15 seconds. Current Flux controller options document a default leader election lease duration of 35 seconds. Updated the text accordingly.
- The API server health check used `kubectl get componentstatuses`, which relies on the deprecated ComponentStatus API. Replaced it with `kubectl get --raw='/readyz?verbose'`, matching current Kubernetes API health endpoint guidance.
- The node debug command omitted an image. Updated it to `kubectl debug node/<node-name> -it --image=busybox -- date`, matching kubectl debug syntax.
- The RBAC YAML showed a Role but no RoleBinding, so applying it would not grant permissions to the source-controller service account. Added the corresponding RoleBinding.
- The Flux leader election flag names used `--leader-elect-*`, but current Flux controllers use `--leader-election-*`. Updated the patch command and used values that keep `lease duration > renew deadline > retry period`.

## Review Notes
- The guide is technically relevant and contains commands and configuration snippets, so it was reviewed as a technical troubleshooting guide.
- The post focuses on source-controller examples; the same Lease naming and flag patterns apply to the other Flux controllers, with the controller name changed as appropriate.
