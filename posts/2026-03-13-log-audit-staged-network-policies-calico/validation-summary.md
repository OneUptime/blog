# Validation Summary: How to Log and Audit Staged Network Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico StagedNetworkPolicy
- Calico StagedGlobalNetworkPolicy
- kubectl
- Calico Felix
- Calico Whisker flow logs

## Sources Consulted
- Calico staged policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics

## Issues Found
- The original YAML used `kind: NetworkPolicy`, which creates an enforced Calico policy, not a staged policy. Changed it to `kind: StagedNetworkPolicy`.
- The post described staged policies as enforcing or blocking traffic. Updated the language and architecture diagram to clarify that staged policies preview what would be allowed or denied without changing actual traffic flow.
- The original commands used `calicoctl` to apply and inspect staged policies. Calico documentation shows staged policy custom resources being managed with `kubectl`, and `calicoctl get` documentation does not list staged policy resources as valid resource types. Replaced those commands with `kubectl` commands for `stagednetworkpolicies.projectcalico.org` and `stagedglobalnetworkpolicies.projectcalico.org`.
- The post recommended checking a `felix_denied` metric as a policy hit counter. The Felix Prometheus metrics reference does not document that metric for Calico Open Source staged policy auditing. Replaced the step with a note to review Calico flow logs and the `policies.pending` field in Calico Whisker, matching the staged policy documentation.
- The troubleshooting section recommended `calicoctl apply --dry-run`, which is not shown in the official `calicoctl apply` options. Replaced it with `kubectl apply --dry-run=server`.
- The operational commands referenced a different policy name (`log-audit-policy`) than the YAML example. Updated them to use `log-audit-staged-policies`.
- The selector troubleshooting command used a placeholder that did not map cleanly to the Calico selector example. Replaced it with a Kubernetes label selector example for the labels used in the post.

## Review Notes
The post is now technically consistent with current Calico documentation for staged policy resources. The Calico docs note that staged policy impact is exposed through flow logs in Calico Whisker; future improvements could add environment-specific setup steps for enabling or accessing those flow logs.
