# Validation Summary: How to Update the Calico GlobalNetworkSet Resource Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico GlobalNetworkSet
- Calico GlobalNetworkPolicy and NetworkPolicy
- Kubernetes
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl replace documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico calico/node configuration documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The pre-change audit only checked GlobalNetworkPolicy resources. Calico documentation states that GlobalNetworkSets can also be matched by NetworkPolicy rules whose `namespaceSelector` includes `global()`. Added a `calicoctl get networkpolicy --all-namespaces -o yaml` check.
- The post described `calicoctl replace` as an atomic update. The official documentation describes it as replacing resources from a file or stdin, failing when a resource does not exist, and replacing multiple resources in order. Updated the section title and wording to avoid overstating atomicity, and added the requirement to provide the complete resource spec.
- The troubleshooting section called `calico-node -felix-live` a Felix sync-status check. Official Calico documentation describes Felix readiness and liveness health endpoints. Updated the wording to liveness status.

## Review Notes
The examples use documentation-reserved IP ranges, which is appropriate for illustrative manifests and connectivity-test examples. The `kubectl run`, `kubectl exec`, `calicoctl get`, `calicoctl apply`, and `calicoctl replace` command forms were checked against current official references and are syntactically valid.
