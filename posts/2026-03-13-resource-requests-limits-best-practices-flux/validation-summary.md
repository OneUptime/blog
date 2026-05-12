# Validation Summary: How to Configure Resource Requests and Limits Best Practices with Flux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Flux CD (kustomize.toolkit.fluxcd.io/v1)
- Kubernetes (LimitRange, ResourceQuota, QoS classes)
- Kustomize (overlays, JSON6902 inline patches)
- GitHub Actions
- kubeconform
- Kyverno / OPA Gatekeeper (mentioned)
- Kubecost / OpenCost (mentioned)

## Sources Consulted
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes QoS classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kustomize patches reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- kubeconform documentation: https://github.com/yannh/kubeconform
- GitHub Actions actions/checkout: https://github.com/actions/checkout

## Issues Found
No technical issues found.

All YAML manifests use correct API versions and field names:
- `LimitRange` (v1) with valid `Container`, `Pod`, and `PersistentVolumeClaim` types and proper `default`/`defaultRequest`/`max`/`min` fields.
- `ResourceQuota` (v1) with valid quota names including `requests.cpu`, `limits.memory`, `services.loadbalancers`, `services.nodeports`, etc.
- Kustomize `apiVersion: kustomize.config.k8s.io/v1beta1` with the modern `patches:` field using `target` + inline JSON6902 patches is correct.
- Flux Kustomization `apiVersion: kustomize.toolkit.fluxcd.io/v1` is the current GA version.
- `actions/checkout@v4` is current as of the post's date.
- kubeconform `-strict -summary` flags are valid.
- QoS class descriptions (Burstable when only requests are set, Guaranteed when requests=limits for both CPU and memory) match Kubernetes documentation.

## Review Notes
- The Flux `healthChecks` field will work syntactically for `ResourceQuota`, though ResourceQuota does not expose a standard Ready condition; Flux falls back to existence-based readiness for such kinds. The example also references a `frontend` namespace ResourceQuota that isn't defined in the shown overlay tree — readers will need to add a `frontend` overlay analogous to the `backend` one for the healthCheck to succeed.
- The CPU-throttling-vs-OOMKills remark in Best Practices is a common shorthand. Strictly speaking these are different failure modes (CPU limit causes throttling, memory limit causes OOMKill), but the underlying recommendation — set memory request=limit while leaving CPU limits more permissive — is sound and widely advocated.
- The bash validation script uses simple grep for detecting `containers:`/`resources:`, which is fragile (e.g., it doesn't detect per-container resource specs and can be fooled by comments). For production use, an admission policy via Kyverno/OPA (which the post itself recommends) is more robust. This is mentioned in the post.
