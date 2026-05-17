# Validation Summary: How to Configure Horizontal Pod Autoscaler on Talos

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Horizontal Pod Autoscaler (HPA)
- Kubernetes Metrics Server
- `autoscaling/v2` API
- kubectl
- nginx (sample workload)
- busybox (load generator)

## Sources Consulted
- Kubernetes HPA documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- Metrics Server repository and installation: https://github.com/kubernetes-sigs/metrics-server
- Metrics Server FAQ (incl. `--kubelet-insecure-tls`): https://github.com/kubernetes-sigs/metrics-server/blob/master/FAQ.md
- kubectl autoscale reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#autoscale
- kube-controller-manager `--horizontal-pod-autoscaler-sync-period` (default 15s): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Talos Linux Kubernetes documentation: https://www.talos.dev/latest/kubernetes-guides/

## Issues Found
No technical issues found.

All commands, YAML manifests, and explanations were verified against current official Kubernetes and Metrics Server documentation:

- `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml` is the official installation method.
- The `--kubelet-insecure-tls` flag is a valid Metrics Server argument, commonly needed when kubelets use self-signed certificates (which is the default on Talos).
- The JSON patch for adding the flag uses correct JSON Patch syntax targeting `containers/0/args/-` (append).
- `autoscaling/v2` is the correct stable API group/version (since Kubernetes 1.23).
- The `behavior` block (with `scaleUp`/`scaleDown`, `stabilizationWindowSeconds`, `policies`, and `selectPolicy`) matches the v2 API schema.
- The statement that the HPA picks the highest desired replica count across multiple metrics is correct, as is the implication that this satisfies all metric targets.
- Default HPA sync period of 15 seconds matches the kube-controller-manager default.
- The `k8s-app=metrics-server` label selector used with `kubectl logs` matches the labels in the official manifest.
- Resource units (`100m`, `200m`, `128Mi`, `200Mi`) and `AverageValue`/`Utilization` target types are valid.
- Load test using `busybox:1.36` with a `wget` loop targeting `webapp.default.svc.cluster.local` is a valid pattern.

## Review Notes
- The post is broadly accurate and largely Kubernetes-agnostic; the only Talos-specific content is the note that Metrics Server is not pre-installed and the `--kubelet-insecure-tls` consideration. Both are correct.
- The description mentions "custom metrics" in the lede, but the post itself only covers Resource (CPU/memory) metrics. This is a minor mismatch in scope advertising rather than a technical error, so it was left as-is.
- The simplified statement "Scales up when average CPU exceeds 50%, scales down when it drops below" omits the HPA's tolerance (default ~10%), but this is a reasonable simplification for an introductory guide and not technically wrong.
- Memory-based scaling caveat is well-stated.
- Readers on newer Kubernetes versions may also consider `containerResource` metrics (per-container utilization) and configurable tolerance per scaling direction (beta in newer releases), but these are out of scope for this introductory post.
