# Validation Summary: Using the Calico BGPPeer Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGPPeer resources
- BGP routing
- calicoctl
- kubectl
- Typha
- Felix
- Calico IPAM

## Sources Consulted
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics monitoring documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico troubleshooting and diagnostics documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The node inspection command used `kubectl get node ... | grep projectcalico`, which does not reliably show Calico node BGP configuration. Changed it to `calicoctl get node <node-name> -o yaml`.
- The scale guidance recommended increasing unspecified reconciliation intervals. Replaced it with CalicoNodeStatus-specific guidance, because Calico documents API server impact from broad or high-frequency CalicoNodeStatus collection.
- The BGPPeer watch command used a non-canonical resource form. Changed it to `kubectl get bgppeers.projectcalico.org -w`.
- The Felix health endpoint text tied liveness/readiness checks to Prometheus metrics. Corrected it to require the Felix health port, and changed the curl target to localhost because Felix health defaults to binding on localhost.
- The `calicoctl node status` comment implied cluster-wide health. Clarified that it checks status on the node being checked.
- The troubleshooting text referenced aggressive reconciliation intervals. Updated it to reference CalicoNodeStatus update frequency and scope.
- The CRD review command claimed to show CRD versions but only prints CRD names and created timestamps. Changed the comment to say it reviews installed Calico CRDs.
- The RBAC check combined `kubectl auth can-i --list` with a specific resource check. Replaced it with a direct `kubectl auth can-i update bgppeers.projectcalico.org` command.
- The events command was described as reviewing recent Calico resource changes. Corrected it to say it reviews recent Calico system events.
- The capacity planning text said to use the Calico metrics endpoint for IPAM utilization. Changed it to `calicoctl ipam show`, which is the documented command for IPAM usage.

## Review Notes
The post assumes `calico-system`, which is standard for operator-based Calico installations. Manifest-based installations may use `kube-system` for some components, so readers should adjust namespaces to match their deployment.
