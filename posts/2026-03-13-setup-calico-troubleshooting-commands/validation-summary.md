# Validation Summary: How to Set Up Calico Troubleshooting Commands Step by Step

## Status
validated

## Post Type
Reference / Tutorial — a curated command reference for diagnosing Calico clusters, organized by component (Felix, BGP, IPAM, policy, operator health), plus an install snippet and a quick diagnostic shell script.

## Technologies Covered
- Calico (Project Calico, v3.x)
- Tigera Operator (Installation, TigeraStatus CRDs)
- calicoctl (v3.x CLI)
- kubectl
- BGP (BIRD inside calico-node)
- Calico IPAM
- Calico NetworkPolicy / GlobalNetworkPolicy CRDs
- Bash

## Sources Consulted
- Project Calico documentation — calicoctl install and usage: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- calicoctl command reference (node, ipam, get): https://docs.tigera.io/calico/latest/reference/calicoctl/
- Tigera Operator API reference (Installation CRD, variant field): https://docs.tigera.io/calico/latest/reference/installation/api
- Calico ClusterInformation CRD (calicoVersion field): https://docs.tigera.io/calico/latest/reference/resources/clusterinfo
- Calico releases on GitHub: https://github.com/projectcalico/calico/releases
- TigeraStatus resource documentation: https://docs.tigera.io/calico/latest/operations/operator-migration

## Issues Found
- **Wrong field used to detect Calico version.** The original Step 1 script used `kubectl get installation default -o jsonpath='{.spec.variant}'` to populate `CALICO_VERSION`. On the Tigera Operator's `Installation` CRD, `.spec.variant` returns the product variant string (`Calico` or `TigeraSecureEnterprise`), not a version. As a result, the curl URL would resolve to `.../download/Calico/calicoctl-linux-amd64` and fail (or, if the kubectl call failed entirely, silently fall through to the `v3.27.0` default). Fixed by switching to `kubectl get clusterinformation default -o jsonpath='{.spec.calicoVersion}'`, which is the documented Calico resource that exposes the running cluster's Calico version (e.g. `v3.27.0`).

## Review Notes
- `calicoctl node status` only works from inside a `calico-node` container because it reads the BIRD control socket. The post's quick-diagnostic script already calls this out via its `|| echo "calicoctl node status requires exec to calico-node pod"` fallback, which is correct guidance.
- The `calico-system` namespace assumed throughout the post is correct when Calico is installed via the Tigera Operator. Users running the (older) manifest-based install would instead have components in `kube-system`; if the post is widely linked it may be worth adding a one-liner about that, but it is not a technical error in the current post.
- The default fallback version `v3.27.0` is reasonable as of mid-2026 but will drift; readers should still verify the latest release on GitHub before installing.
- `calicoctl ipam check` is a non-destructive read; `calicoctl ipam release` (not used here) would be the destructive counterpart — worth noting in a future expansion.
