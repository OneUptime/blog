# Validation Summary: How to Validate Staged GlobalNetworkPolicy in Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico `projectcalico.org/v3` policy resources
- StagedGlobalNetworkPolicy
- kubectl
- Calico flow logs / Whisker

## Sources Consulted
- Calico staged policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico v3.30 StagedGlobalNetworkPolicy CRD: https://raw.githubusercontent.com/projectcalico/calico/v3.30.0/libcalico-go/config/crd/crd.projectcalico.org_stagedglobalnetworkpolicies.yaml

## Issues Found
- The YAML example used `kind: NetworkPolicy` with a namespace, which creates an enforced namespaced Calico policy rather than a staged global policy. Changed it to `kind: StagedGlobalNetworkPolicy`, removed `metadata.namespace`, and added a `namespaceSelector` to scope the global policy to the `production` namespace.
- The ingress rule matched destination ports without specifying a protocol. Added `protocol: TCP`, because Calico port matches require a protocol that supports ports.
- The post described staged policy as enforcing traffic and checking active denied counters. Updated the implementation notes and architecture diagram to state that staged policies preview impact without changing traffic flow, and pointed readers to Calico flow logs / Whisker `policies.pending` output.
- The commands used `calicoctl get networkpolicy` and `calicoctl delete networkpolicy`, which target enforced namespaced Calico policies rather than staged global policies. Replaced them with `kubectl` commands for `stagedglobalnetworkpolicy`.
- The troubleshooting section recommended `calicoctl apply --dry-run`, which is not a documented `calicoctl apply` option. Replaced it with `kubectl apply --dry-run=server -f ...`.
- The prerequisite claimed Calico v3.26+ support for StagedGlobalNetworkPolicy. Updated it to Calico v3.30+ based on the Calico v3.30 staged global policy CRD and current official staged policy documentation.

## Review Notes
The corrected post is accurate for clusters with the Calico API server enabled for `projectcalico.org/v3` resources. Older Calico installations or installations without the API server may require different management workflows.
