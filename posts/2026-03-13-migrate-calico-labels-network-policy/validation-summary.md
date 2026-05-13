# Validation Summary: How to Migrate Existing Rules to Calico Label-Based Network Policies

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes labels and namespace selectors
- `kubectl`
- `calicoctl`
- `jq`

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The Kubernetes NetworkPolicy example was missing the required `spec.podSelector`. Added `podSelector: {}` so the policy is valid and applies to all pods in the namespace.
- The Kubernetes NetworkPolicy example did not set `metadata.namespace`, while the later delete command removes the policy from `production`. Added `namespace: production` for consistency.
- The namespace selector used `name: monitoring`, which is not the standard automatic Kubernetes namespace name label. Changed it to `kubernetes.io/metadata.name: monitoring`.
- The source Kubernetes policy allowed all ports while the replacement Calico policy allowed only ports `9090`, `9091`, and `8080`. Added matching TCP ports to the Kubernetes policy so the migration example preserves the intended access.
- The inventory command only checked ingress rules for namespace selectors and IP blocks. Updated the `jq` filter to check both ingress and egress rule sources/destinations.
- The Calico replacement policy selected `team == 'monitoring'` without a `namespaceSelector`. In a namespaced Calico NetworkPolicy, that would only match sources in the policy namespace. Added `source.namespaceSelector: projectcalico.org/name == 'monitoring'` so it correctly matches labeled pods in the `monitoring` namespace.
- The Calico replacement policy matched destination ports without specifying a protocol. Added `protocol: TCP` to match the Kubernetes policy example and the HTTP verification command.
- The label application comment said it labeled all pods directly, but the command patches Deployment pod templates. Updated the comment to reflect what the command actually changes.
- The target label comment referenced `app=prometheus`, but the labeling command did not apply that label and the Calico policy did not use it. Updated the comment to match the labels applied by the command.

## Review Notes
The `kubectl patch` command updates Deployment pod templates; in a live migration, operators should confirm the resulting rollout and verify that every relevant workload controller type, not only Deployments, has the required labels before deleting the old policy.
