# Validation Summary: Understanding Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Typha
- Felix
- Kubernetes Services and EndpointSlices
- Kubernetes CLI (`kubectl`)
- Prometheus metrics

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico "Install Typha" hard-way documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico on-premises installation scaling guidance: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Project Calico Typha discovery source: https://github.com/projectcalico/calico/blob/master/typha/pkg/discovery/discovery.go
- Project Calico Typha Kubernetes rebalancing source: https://github.com/projectcalico/calico/blob/master/typha/pkg/k8s/rebalance.go
- Project Calico Typha Prometheus metric source: https://github.com/projectcalico/calico/blob/master/typha/pkg/syncserver/sync_server.go
- Project Calico Typha snapshot metric source: https://github.com/projectcalico/calico/blob/master/typha/pkg/syncserver/snap_precalc.go

## Issues Found
- The post described Felix as resolving Typha through DNS round-robin and receiving one pod IP. Updated this to describe Felix discovering ready Typha Service endpoints and choosing from a shuffled endpoint list, which matches Calico's Typha discovery code.
- The post said `TYPHA_MAXCONNECTIONSLOWERLIMIT` acts as a hard cap that redirects new Felix clients. Updated this to explain Kubernetes-aware connection rebalancing with `TYPHA_CONNECTIONREBALANCINGMODE=kubernetes`, where Typha calculates a target and gradually drops excess established connections so clients reconnect elsewhere. Clarified that `TYPHA_MAXCONNECTIONSLOWERLIMIT` is the floor for the calculated target.
- The Prometheus examples used `typha_connections_accepted_total` and `typha_snapshots_generated_total`, but Calico documents and registers the metric names as `typha_connections_accepted` and `typha_snapshots_generated`. Updated the commands and best-practice metric names.
- The snapshot example implied one generated snapshot per reconnecting Felix client. Calico can reuse generated binary snapshots for multiple clients, so the text now notes that snapshots may be reused and adds `typha_snapshots_reused` to the monitoring recommendation.
- The metrics commands assumed port 9093 without stating the prerequisite. Added a note that Typha Prometheus metrics must be enabled on port 9093 for those commands to work.

## Review Notes
The Calico docs recommend at least one Typha replica per 200 nodes and no more than 20 replicas; the post's `max(2, ceil(node_count / 200))` formula is a reasonable high-availability adaptation, but operators should still verify sizing against their deployment mode, Calico version, and actual resource usage.
