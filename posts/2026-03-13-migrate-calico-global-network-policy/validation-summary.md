# Validation Summary: How to Migrate Existing Rules to Calico GlobalNetworkPolicy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes network policy enforcement
- calicoctl
- kubectl
- Felix metrics and policy logs

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico log rules guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The verification section referenced `felix_denied` as a policy hit counter, but the official Felix metrics reference does not document a `felix_denied` metric. Changed the command to check the documented `felix_active_local_policies` metric instead.
- The verification section suggested reading denied policy flow logs from `/var/log/calico/felix.log`. Calico policy log output depends on the data plane; for iptables-based deployments, the official docs describe kernel/syslog output and examples containing `calico-packet`. Changed the command to use `journalctl -k -f | grep calico-packet`.

## Review Notes
The GlobalNetworkPolicy manifest uses the current `projectcalico.org/v3` API and valid fields for Calico v3.26+. The `calicoctl apply`, `calicoctl get globalnetworkpolicies -o wide`, and `kubectl exec` commands are syntactically valid. In production, broad selectors such as `all()` should be staged carefully because GlobalNetworkPolicy is cluster-scoped and can select workloads across namespaces and host endpoints.
