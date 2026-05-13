# Validation Summary: How to Configure Secure Calico Metrics Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Felix Prometheus metrics
- Prometheus
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoints overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico Kubernetes node host endpoint guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Whisker flow logs guide: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl get / resource reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The original policy selected `k8s-app == 'calico-node'`, which would not reliably secure the Felix metrics endpoint because Felix metrics are exposed from the node host namespace. Changed the policy to target labeled Kubernetes node host endpoints with `selector: has(kubernetes-host)` and added the host endpoint prerequisite and setup commands.
- The original policy did not specify `protocol: TCP` on rules that match destination ports. Calico supports port matches in entity rules, and the official examples specify the transport protocol. Added `protocol: TCP` to the allow and deny rules for clarity and correctness.
- The deny rule included ports `9092` and `9093` while the snippet was specifically for Felix metrics on port `9091`. Calico documents Felix metrics as TCP 9091 by default; narrowed the deny rule to port `9091`.
- The implementation steps did not label the observability namespace used by `namespaceSelector: team == 'observability'`. Added a `kubectl label namespace monitoring team=observability --overwrite` command.
- The authorized curl check piped through `head`, making `$?` report the pipeline's final command status instead of reliably reporting the curl result. Changed the command to use `curl -fsS` and discard output so the status reflects the metrics request.
- The flow-log example referenced `/var/log/calico/flow-logs/*.log`, which is not the documented Calico Open Source flow-log access path. Replaced it with the documented Whisker port-forward flow for clusters with Whisker and Goldmane enabled.
- The policy verification command used `calicoctl get networkpolicies -n kube-system`, which would not return the non-namespaced `GlobalNetworkPolicy`. Changed it to `calicoctl get globalnetworkpolicy secure-calico-metrics -o yaml`.

## Review Notes
The examples still use placeholder pod names and node IPs, so readers must substitute values from their own cluster. Calico also supports TLS settings for Felix metrics through Felix configuration, which would be a useful future enhancement for a deeper security guide.
