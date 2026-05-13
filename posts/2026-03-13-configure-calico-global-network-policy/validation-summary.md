# Validation Summary: How to Configure Calico GlobalNetworkPolicy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- kubectl
- Felix Prometheus metrics

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs

## Issues Found
- The verification section used `grep felix_denied` as a policy hit counter check, but the Calico Open Source Felix metrics reference does not document a `felix_denied` metric. Replaced it with `felix_active_local_policies`, a documented Felix metric that can confirm Felix has active policies when metrics are enabled.
- The verification section suggested grepping `/var/log/calico/felix.log` for `DENY` as flow log review. Felix's log file is a component log, and Calico Open Source flow logs are exposed through the flow logs API and Whisker rather than by grepping Felix logs. Removed that command and replaced it with a direct `calicoctl get globalnetworkpolicy ... -o yaml` check of the stored policy.

## Review Notes
The GlobalNetworkPolicy manifest uses the current `projectcalico.org/v3` API and documented fields including `order`, `selector`, `ingress`, `egress`, and `types`. `calicoctl apply -f` and `calicoctl get globalnetworkpolicy -o wide` are documented command forms. The policy selects all endpoints, so it should be tested carefully in staging because unmatched ingress and egress traffic for selected endpoints will be denied by Calico policy evaluation.
