# Validation Summary: Zero Trust Security for Calico Metrics Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Kubernetes
- Prometheus metrics
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoint overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The original `GlobalNetworkPolicy` selected `k8s-app == 'calico-node'`, which matches Kubernetes workload labels rather than the host endpoint that receives traffic for a node-local Felix metrics listener. Added a `HostEndpoint` example and changed the policy selector to match that host endpoint label.
- The original allow rules used a broad namespace label and a separate unconstrained Prometheus pod selector. Changed the allow rule to require Prometheus pods in the `monitoring` namespace using Calico's documented `projectcalico.org/name` namespace label.
- The policy rules matched destination ports without declaring `protocol: TCP`. Added the protocol to make the port matches explicit and consistent with Calico examples.
- The deny rule included ports `9092` and `9093` while the post only documented Felix metrics on `9091`. Narrowed the deny rule to `9091` to avoid implying unrelated Calico metric ports.
- The authorized curl command piped the `kubectl exec` output to `head`, making `$?` reflect the pipeline result rather than a clear access check. Moved the pipeline inside the remote shell and used `curl -fsS`.
- The unauthorized curl command printed a raw exit code expectation. Replaced it with an `if` check that reports whether access was blocked.
- The verification section referenced `/var/log/calico/flow-logs/*.log`, which is not a standard Calico Open Source verification path. Replaced it with host endpoint and global policy inspection commands.
- The policy verification command used `calicoctl get networkpolicies -n kube-system`, but Calico global network policies are listed separately and are not namespaced. Changed it to `calicoctl get globalnetworkpolicies`.

## Review Notes
The example assumes Felix Prometheus metrics have already been enabled and are reachable on the node IP and port `9091`. Operators should replace the example node name, interface name, expected IP, Prometheus workload name, and labels with values from their own cluster.
