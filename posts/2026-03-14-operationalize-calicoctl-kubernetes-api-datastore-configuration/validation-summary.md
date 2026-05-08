# Validation Summary: Operationalizing Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes API datastore
- Calico GlobalNetworkPolicy and NetworkPolicy resources
- GitHub Actions
- Bash automation
- GitOps workflows

## Sources Consulted
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico service rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico install and configure calicoctl documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install and https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd

## Issues Found
- The DNS allow policy used a destination pod selector for `kube-dns`. Updated it to use Calico's Kubernetes service rule syntax with `destination.services.name: kube-dns` and `namespace: kube-system`, matching the official Calico DNS service policy example.
- The default-deny GlobalNetworkPolicy had no explicit `order`, while the allow-DNS policy used `order: 100`. Added `order: 1000` so the allow policy is evaluated before the deny policy.
- The GitHub Actions deployment job installed `kubectl` but did not configure cluster credentials. Added a kubeconfig setup step using a base64-encoded `KUBECONFIG_DATA` secret.
- The pipeline applied `calico-config/policies/namespaced/` without recursion even though the example tree stores policies in nested namespace directories. Added `--recursive` to the namespaced policy apply command.
- The backup script used `calicoctl get networkpolicies` and `calicoctl get networksets` without `--all-namespaces`, which would miss resources outside the default namespace. Added `--all-namespaces` handling for those namespaced resource types.
- The backup script said it backed up all Calico resources but listed only a subset. Clarified the wording and added common missing configuration resources such as `bgpfilters`, `clusterinformations`, `kubecontrollersconfigurations`, and `tiers`.
- The wrapper script used `calicoctl apply --dry-run -o yaml`, but `calicoctl apply` does not document `--dry-run` or `-o` output flags. Replaced it with `calicoctl get -f "$file" -o yaml` to fetch the current cluster state for comparison.

## Review Notes
- `calicoctl validate` works offline and is appropriate for CI validation, but production pipelines should still run connectivity or policy behavior tests after applying changes.
- Current Calico documentation recommends matching the `calicoctl` version to the cluster's Calico version. The post's fixed v3.27.0 download is valid for v3.27 clusters, but teams should update it when their cluster version changes.
