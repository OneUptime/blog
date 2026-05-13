# Validation Summary: How to Migrate Existing Rules to External IP Policies in Calico

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico NetworkSet and GlobalNetworkSet
- Kubernetes NetworkPolicy
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Use external IPs or networks rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico documentation: NetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: GlobalNetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: NetworkSet resource: https://docs.tigera.io/calico/latest/reference/resources/networkset
- Calico documentation: GlobalNetworkSet resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes documentation: kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes documentation: kubectl delete: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The introduction referred to "External IP Policies" as if it were a distinct Calico resource type. Calico documents this feature as external IP/CIDR matching in NetworkPolicy and GlobalNetworkPolicy rules, optionally with NetworkSet or GlobalNetworkSet resources. Updated the wording to "External IP rules" while preserving the post's intent.
- The inventory command only backed up Kubernetes NetworkPolicy and Calico namespaced NetworkPolicy resources. External IP policy migrations may also depend on GlobalNetworkPolicy, NetworkSet, and GlobalNetworkSet resources. Added calicoctl commands to include those resources in the backup.
- The replacement policy example used `source.selector: app == 'authorized'`, which matches Calico endpoints or network sets by label and does not directly match an external IP range. Updated the example to use `source.nets` with an example CIDR, matching Calico's documented external IP policy syntax.

## Review Notes
- The `kubectl` and `calicoctl` command flags used in the post are current and supported.
- Calico documentation notes that NAT can affect whether workload policy sees the original external source IP. This is worth considering for production migrations, especially for ingress through Kubernetes Services.
