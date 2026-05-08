# Validation Summary: Zero Trust Security with Calico GlobalNetworkPolicy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- calicoctl
- kubectl
- Felix Prometheus metrics

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component logs: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The verification section used `grep felix_denied`, but Calico Open Source Felix metrics documentation does not list a `felix_denied` metric. I changed the command to check `felix_active_local_policies`, which is an officially documented Felix metric for active local policies.
- The verification section suggested `tail -f /var/log/calico/felix.log | grep "DENY"` as a flow-log review command. The policy does not include a `Log` action, and Calico component log guidance recommends viewing calico/node logs with `kubectl logs`. I changed the command to `kubectl logs -n calico-system <calico-node-pod>`.

## Review Notes
- The GlobalNetworkPolicy API version, kind, `order`, `selector`, `ingress`, `egress`, rule `action`, `protocol`, `destination.ports`, and `types` fields are valid for the documented Calico API.
- `calicoctl apply -f` and `calicoctl get globalnetworkpolicies -o wide` are valid command forms according to the calicoctl reference.
- The broad `selector: all()` pattern can affect workload and host endpoints. Calico's own default-deny guidance recommends testing in staging and carefully scoping production global default-deny policies, especially around system namespaces.
