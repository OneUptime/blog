# Validation Summary: How to Test Calico Tiered Policies with Real Traffic in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico policy tiers
- Kubernetes pods and namespaces
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico Open Source documentation: Policy tiers, https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source documentation: Tier resource, https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico Open Source documentation: NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: calicoctl apply, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Project Calico API package documentation: NetworkPolicySpec, https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The setup commands used the `test` namespace without creating it. Added `kubectl create namespace test`.
- The BusyBox source pod command passed `sleep 3600` as container args instead of an explicit command. Added `--command -- sleep 3600`, matching `kubectl run` command semantics.
- The traffic test could run before pods were ready. Added `kubectl wait --for=condition=Ready` for both test pods.
- The pod examples did not set labels, but Calico selectors are label-based. Added `app=test-source` and `app=test-dest` labels.
- The policy example did not explicitly create or use a tier. Added a `Tier` resource and set `spec.tier: security` on the Calico `NetworkPolicy`.
- The deny policy selected all endpoints in the namespace. Narrowed it to `app == 'test-dest'` so the test describes blocking ingress to the destination pod.
- The guide referenced `allow-rule.yaml` without showing its contents. Added a concrete allow policy that permits TCP/80 from `test-source` to `test-dest`.
- The allow policy needed to take precedence over the deny policy. Set the allow policy `order` to `50` and the deny policy `order` to `100`, consistent with Calico applying lower order values first.
- Replaced BusyBox `wget --timeout=5` with `wget -T 5` for better compatibility with BusyBox wget options.

## Review Notes
The guide remains a compact test workflow. In a future revision, it could mention cleanup commands and whether the user should apply the YAML snippets as `deny-rule.yaml` and `allow-rule.yaml`, but the technical policy behavior and commands are now consistent with the referenced documentation.
