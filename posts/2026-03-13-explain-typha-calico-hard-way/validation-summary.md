# Validation Summary: How to Explain Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Typha
- Calico Felix / calico-node
- Kubernetes API server watches
- Kubernetes RBAC
- Prometheus metrics
- mTLS

## Sources Consulted
- Calico Open Source Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Open Source Calico the hard way - Install Typha: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source Calico the hard way - Install calico/node: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Open Source component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source on-premises installation guidance for Typha replica sizing: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises

## Issues Found
- The post overstated Typha's update coalescing behavior by claiming that five rapid NetworkPolicy updates would always result in only the final state being delivered and one iptables reprogram. The official docs describe Typha as caching datastore state, deduplicating events, and filtering irrelevant updates, but they do not guarantee that all rapid relevant updates collapse into one final Felix update. Reworded the section to match the documented behavior.
- The hard-way connection example used `TyphaAddr = typha-service.calico-system.svc.cluster.local:5473`. In the current hard-way documentation, `calico/node` is configured with `FELIX_TYPHAK8SSERVICENAME=calico-typha`, and the default Typha lookup namespace is `kube-system`. Updated the snippet accordingly.
- The metrics command used the operator-style `calico-system` namespace and port `9093`, and it grepped a cumulative counter. The current hard-way flow deploys Typha in `kube-system`, while the Typha metrics reference documents port `9091` as the default and notes that Typha metrics are disabled by default. Updated the command to use `kube-system`, port `9091`, and `typha_connections_streaming` for active client connections, with wording that it applies when Typha metrics are enabled.
- The deployment check used `calico-system`, but the hard-way Typha Deployment is created in `kube-system`. Updated the command.
- The sizing statement said 1-3 replicas are sufficient for clusters up to 3000 nodes. Calico guidance recommends at least one replica per 200 nodes, no more than 20 replicas, and at least three replicas in production. Updated the wording to reflect documented guidance.

## Review Notes
The CDN and message-broker analogies are acceptable as teaching analogies, but Typha is more precisely a caching datastore proxy that maintains datastore state and fans out updates to clients such as Felix and confd. Metrics ports and namespaces can differ in operator, manifest, and provider-specific installations, so future posts should state the installation mode when showing Typha commands.
