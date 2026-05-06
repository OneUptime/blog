# Validation Summary: How to Set Up BGP Peering with Calico in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- RKE
- RKE2
- Calico
- BGP
- Kubernetes
- `kubectl`
- `calicoctl`
- Prometheus Operator
- `PrometheusRule`

## Sources Consulted
- Rancher CNI Providers documentation: https://ranchermanager.docs.rancher.com/v2.10/faq/container-network-interface-providers
- RKE2 Network Options documentation: https://docs.rke2.io/networking/basic_network_options
- Calico Configure BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico API server / kubectl management docs: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#logs
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus jobs and instances documentation: https://prometheus.io/docs/concepts/jobs_instances/
- Rancher Monitoring architecture: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher Monitoring enablement: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring

## Issues Found
- The original post did not actually configure Calico BGP peering. It used a placeholder `ConfigMap` with a fictitious `main-cni-plugin` and generic CNI JSON. I replaced that with supported Calico `BGPConfiguration` and `BGPPeer` resources.
- The prerequisites were too broad and implied any compatible CNI would work. I corrected them to require a Rancher-managed cluster that already uses Calico, the peer IP/ASN details, and TCP port `179` reachability.
- The architecture description was too generic and omitted Calico's actual BGP behavior. I updated it to reflect Calico's default node-to-node mesh and the need for a maintenance window when changing BGP topology.
- The verification commands were not valid for determining Calico BGP state. I replaced the kube-proxy, generic network policy, and node filesystem checks with Calico-specific `kubectl` queries and `calicoctl node status`.
- The original network-policy section was unrelated to BGP peering. I replaced it with the correct step to apply Calico BGP resources.
- The `calico-node -show-status` command is not a supported Calico status command. I replaced it with `calicoctl node status`, which Calico documents for checking BGP session state on a node.
- The monitoring section referenced generic network alerts rather than Calico health. I replaced it with a valid `PrometheusRule` example that alerts on Prometheus target health for `calico-node` and optional `calico-typha` scrape targets.
- The troubleshooting section focused on generic CNI and DNS checks instead of Calico BGP state. I updated it to review `BGPConfiguration`, `BGPPeer`, Calico pod health, Calico logs, and node-level BGP status.

## Review Notes
- The revised guide assumes Calico is already the active CNI. Selecting Calico for a new Rancher-managed cluster is a separate cluster provisioning step.
- The example `serviceClusterIPs` and `serviceLoadBalancerIPs` CIDRs must be changed to match the actual ranges in the target cluster before use.
- The `PrometheusRule` example assumes Rancher Monitoring / Prometheus Operator is installed and that the Prometheus `job` labels for Calico targets match the expressions in the rule.
- The Calico pod namespace can vary by installation method. The guide intentionally uses `<calico-namespace>` where log collection depends on that value.
