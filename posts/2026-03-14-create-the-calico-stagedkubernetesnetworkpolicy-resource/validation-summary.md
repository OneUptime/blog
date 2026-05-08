# Validation Summary: Creating the Calico StagedKubernetesNetworkPolicy Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes NetworkPolicy
- Calico StagedKubernetesNetworkPolicy
- kubectl

## Sources Consulted
- Calico StagedKubernetesNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico staged network policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The original manifest used Calico NetworkPolicy fields (`selector`, `types`, rule `action`, `source`, and `destination`) plus a non-existent `stagedAction` field for StagedKubernetesNetworkPolicy. Updated the manifest to use Kubernetes NetworkPolicy-style fields (`podSelector`, `policyTypes`, `ingress.from`, and `ports`) as required by Calico's StagedKubernetesNetworkPolicy documentation.
- The field explanations described Calico selector syntax and staged actions rather than Kubernetes NetworkPolicy structure. Updated the explanations to describe `podSelector`, `policyTypes`, and Kubernetes-style ingress/egress rules.
- The post recommended `calicoctl apply` and `calicoctl get stagedkubernetesnetworkpolicy`, but current Calico CLI references do not list StagedKubernetesNetworkPolicy as a valid calicoctl-managed resource type. Replaced that guidance with `kubectl apply --dry-run=server` and kubectl verification commands.
- The `kubectl describe` command omitted the resource name and namespace. Updated it to describe the specific resource created by the tutorial.
- Troubleshooting guidance suggested checking the Calico API server and restarting `calico-node` pods. Replaced this with checks for the installed CRD and matching pod labels, which are more directly applicable to this CRD and avoid unnecessary restarts.
- The labels section used node labels and claimed they controlled which nodes were affected by specific resources. Updated it to use pod labels, which are what the sample StagedKubernetesNetworkPolicy selects.

## Review Notes
The corrected resource follows Calico's documented StagedKubernetesNetworkPolicy behavior: it is a staged version of Kubernetes NetworkPolicy, using the Calico API group and kind with a Kubernetes NetworkPolicy-compatible spec. The Calico node log namespace and label may vary by installation method, but the example is plausible for operator-based installs.
