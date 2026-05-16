# Validation Summary: How to Deploy with kubectl apply on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Deployments, Services, ConfigMaps, Secrets, Namespaces, Ingress)
- kubectl (apply, diff, rollout, create secret, get)
- talosctl (kubeconfig)
- cert-manager (annotation reference)
- NGINX Ingress Controller (ingressClassName reference)

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- kubectl apply docs: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#apply
- Declarative management with configuration files: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/
- Deployment API (apps/v1): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- Ingress API (networking.k8s.io/v1): https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/
- Service API (v1): https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/
- Pod Security Context: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- kubectl rollout: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout
- kubectl diff / dry-run: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#diff
- Talos Linux docs (talosctl kubeconfig): https://www.talos.dev/v1.7/reference/cli/#talosctl-kubeconfig
- Talos Linux filesystem & containerd notes: https://www.talos.dev/v1.7/learn-more/architecture/
- cert-manager ingress annotations: https://cert-manager.io/docs/usage/ingress/

## Issues Found
No technical issues found.

All technical content verified:
- `talosctl kubeconfig --nodes <ip>` syntax is correct.
- `kubectl apply -f` usage with files, directories, and URLs is correct.
- The Deployment, Service, ConfigMap, Namespace, and Ingress manifests are syntactically valid and use current GA API versions (`apps/v1`, `v1`, `networking.k8s.io/v1`).
- Pod and container `securityContext` fields (`runAsNonRoot`, `runAsUser`, `fsGroup`, `allowPrivilegeEscalation`, `readOnlyRootFilesystem`, `capabilities.drop`) are correctly named and structured.
- Probe configuration (`httpGet`, `initialDelaySeconds`, `periodSeconds`) with named port (`http`) is valid.
- `Service.spec.ports[].targetPort` may reference a named container port — correct.
- `--dry-run=client` and `--dry-run=server` flag values are correct (the old boolean `--dry-run` was deprecated in v1.18).
- `kubectl diff -f` is a real, supported command.
- `kubectl rollout status|history|undo` including `--to-revision=N` is correct.
- `kubectl apply --prune -l <selector>` is valid current syntax.
- `kubectl create secret generic ... --from-literal` and `--from-file=<key>=<path>` syntax is correct.
- Ingress `ingressClassName: nginx` and `cert-manager.io/cluster-issuer` annotation match the documented usage.
- The Talos-specific notes (restricted filesystem, containerd without exposed Docker socket) accurately reflect Talos Linux's design.

## Review Notes
- `kubectl apply --prune -l <selector>` still works and is documented, but newer Kubernetes versions are introducing `--applyset` as the longer-term replacement (alpha since v1.27, beta in later releases). The current `--prune -l` usage in the post remains functional and is the more widely supported form today, so no change was made.
- The `hostPath` example uses `/var/run` as an illustration of an "approved" Talos path. Talos exposes a curated set of writable host paths (mostly under `/var` and `/run`); `/var/run` works, but readers should consult the Talos docs for the specific path they intend to mount. The post correctly cautions that "only specific paths are available."
- The Deployment manifest uses `app.kubernetes.io/name` as the selector while the multi-document example uses the simpler `app: my-app`. Both are valid; this is a stylistic choice rather than an error.
