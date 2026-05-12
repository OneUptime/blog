# Validation Summary: How to Secure Calico on Kubernetes Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico (v3.28.0)
- Kubernetes NetworkPolicy and Calico GlobalNetworkPolicy
- calicoctl
- kubectl
- cosign (image signature verification)
- Trivy (CVE scanning)
- GitOps / change management workflow

## Sources Consulted
- Calico documentation: Upgrade Calico installed with the operator, https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: ImageSet resource, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: GlobalNetworkPolicy, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: NetworkPolicy, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico release notes, https://github.com/projectcalico/calico/releases (v3.28.0 confirmed)
- Sigstore Cosign documentation: cosign verify, https://docs.sigstore.dev/cosign/verifying/verify/
- Aqua Trivy documentation: Image scanning and severity flags, https://aquasecurity.github.io/trivy/latest/docs/target/container_image/
- Kubernetes documentation: kubectl wait, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: Pod lifecycle (Pod phase Failed vs Succeeded), https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
- The post-upgrade validation used `kubectl wait pod/sec-test-blocked --for=condition=completed`. `Completed` is not a Pod condition documented by Kubernetes (the standard Pod conditions are `PodScheduled`, `Initialized`, `ContainersReady`, and `Ready`), so the wait would always fail regardless of whether the policy was actually enforcing. That made the test echo "EXPECTED: External access blocked by policy" even when nothing was being verified. Changed the wait to `--for=jsonpath='{.status.phase}'=Failed`, so the pod's actual terminal phase is checked: if the policy blocks the egress, the wget exits non-zero, the pod enters phase `Failed`, and the wait succeeds. Added an `UNEXPECTED` branch for the case where the connection was not blocked.

## Review Notes
- Calico component image names (`cni`, `node`, `kube-controllers`, `typha`) and version `v3.28.0` are valid; v3.28.0 was a real Calico release in 2024.
- The `grep "^- " .../gnps.yaml | wc -l` heuristic to count GlobalNetworkPolicies is fragile (it depends on the exact YAML serialization of `items:`). A more robust alternative would be `calicoctl get gnp -o json | jq '.items | length'` or `yq '.items | length'`. Left as-is because it works against current `calicoctl -o yaml` output and matches the post's intentionally simple shell style.
- The `cosign verify --key cosign.pub` syntax is correct for both Cosign v1.x and v2.x. For keyless verification users would instead use `--certificate-identity` and `--certificate-oidc-issuer`, but the key-based example here is valid.
- `trivy image --severity CRITICAL,HIGH --exit-code 1` is correct; note that `--exit-code` returns non-zero only when vulnerabilities of the specified severity are found, which matches the intent.
- The change management template is illustrative and not technically verifiable, but the steps are consistent with how Calico operator upgrades via ImageSet are typically managed in GitOps.
