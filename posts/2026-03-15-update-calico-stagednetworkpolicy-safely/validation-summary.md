# Validation Summary: How to Update the Calico StagedNetworkPolicy Resource Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Enterprise
- Calico StagedNetworkPolicy
- Calico NetworkPolicy syntax
- calicoctl
- Kubernetes kubectl label selectors
- YAML

## Sources Consulted
- Calico StagedNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico Enterprise calicoctl get reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Enterprise calicoctl validate reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/validate
- Calico staged network policies guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico selector reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoq/selectors
- Calico projectcalico.org/v3 Go API reference: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The introduction referred to validating changes with dry-runs. The official `calicoctl apply` reference does not list a dry-run option, so this was changed to "validating the updated resource" to match supported Calico validation workflows.

## Review Notes
The `StagedNetworkPolicy` examples use the correct `projectcalico.org/v3` API group, kind, `stagedAction: Set`, rule actions, ordered ingress rules, numeric ports, and Calico selector syntax. Kubernetes label selector examples use Kubernetes selector syntax intentionally before translating the policy selector to Calico syntax.
