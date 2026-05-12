# Validation Summary: How to Set Up Calico on Kubernetes Upgrades Step by Step

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Calico (Project Calico CNI)
- Tigera Operator
- Kubernetes
- kubectl
- ImageSet (operator.tigera.io/v1)
- TigeraStatus

## Sources Consulted
- Tigera Calico upgrade docs: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Tigera Calico ImageSet docs: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Tigera Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera Operator GitHub repo: https://github.com/tigera/operator
- Kubernetes kubectl version flag deprecation: https://github.com/kubernetes/kubernetes/issues/122455
- Project Calico release manifests: https://github.com/projectcalico/calico

## Issues Found

1. **`kubectl version --short` is no longer supported.** The `--short` flag was deprecated and then removed in kubectl v1.28. The pre-upgrade checklist used it, which would now produce `error: unknown flag: --short`. Replaced with `kubectl version -o json` parsed for `gitVersion`, which works on all current kubectl versions and yields the same value.

2. **Operator image tag does not equal the Calico version.** Method 1 originally ran `kubectl set image deploy/tigera-operator tigera-operator=quay.io/tigera/operator:${CALICO_VERSION}` with `CALICO_VERSION=v3.28.0`. The `quay.io/tigera/operator` image uses an independent versioning scheme (e.g. `v1.34.x`) — there is no `v3.28.0` tag for the operator image, so the command would never schedule a valid pod. Replaced with the Tigera-recommended approach of applying the matched `operator-crds.yaml` and `tigera-operator.yaml` manifests from the Calico release on GitHub, which embed the correct operator image tag for that Calico release.

3. **`Installation` CR has no `spec.version` field.** Method 2 originally ran `kubectl patch installation default --type=merge -p '{"spec":{"version":"v3.28.0"}}'`. The `operator.tigera.io/v1 Installation` schema does not expose a `version` field; this patch would be rejected by the API server (or silently set an unknown field that the operator ignores). The operator drives Calico version from the operator deployment itself; the ImageSet is discovered by its name (`calico-<version>`). Replaced the patch with applying the matching `tigera-operator.yaml` manifest, and added a comment explaining the operator auto-discovers the ImageSet by name.

## Review Notes

- Calico v3.28.0 is used as the example target version. It was released in mid-2024 and is now several minor releases behind. The post's commands are templated on `${CALICO_VERSION}` so a reader can substitute the version they want; left the example version as the author wrote it.
- `kubectl run --restart=Never` in the post-upgrade DNS test still works on current kubectl; `--restart=Never` is a deprecated no-op (kubectl run only creates Pods) but is silently accepted. Left as-is.
- The mermaid flow describes operator behavior accurately: Typha is updated before calico-node, and calico-node performs a rolling update with one node updated at a time controlled by the DaemonSet's update strategy.
- The post does not cover the operator-CRD upgrade step separately for Method 2; in practice, applying the new `tigera-operator.yaml` typically also requires the new CRDs. If the reader hits CRD schema errors mid-upgrade, they may need to also apply `operator-crds.yaml` (which Method 1 now does explicitly).
