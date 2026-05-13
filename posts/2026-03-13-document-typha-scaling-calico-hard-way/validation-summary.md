# Validation Summary: Documenting Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico Typha
- Kubernetes Deployments
- Kubernetes PodDisruptionBudgets
- kubectl
- calicoctl
- Prometheus metrics

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico on-premises installation Typha replica guidance: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Felix configuration and calicoctl export example: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Project Calico Typha v3.32.0 source for connection rebalancing settings: https://github.com/projectcalico/calico/blob/v3.32.0/typha/pkg/config/config_params.go
- Project Calico Typha v3.32.0 source for dynamic connection-limit calculation: https://github.com/projectcalico/calico/blob/v3.32.0/typha/pkg/k8s/rebalance.go
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes manual Deployment scaling guide: https://kubernetes.io/docs/tasks/run-application/scale-deployment/
- Kubernetes PodDisruptionBudget guide: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The post used `max(2, ceil(node_count / 200))` as the standard Typha scaling formula. Calico recommends at least one Typha replica per 200 nodes, no more than 20 replicas, and a production minimum of three replicas. Updated the formula to `min(20, max(3, ceil(node_count / 200)))`.
- The rationale said reaching 600 nodes triggers a move from 3 to 4 replicas. With one replica per 200 nodes, 3 replicas still covers exactly 600 nodes. Changed the threshold to exceeding 600 nodes.
- The override example recommended rounding down to 2 replicas in a 2-AZ production cluster. That conflicts with Calico's production minimum of three replicas. Updated it to keep 3 replicas and spread them with anti-affinity.
- The post described `TYPHA_MAXCONNECTIONSLOWERLIMIT` as a per-pod cap calculated from node count. In Calico source, it is the lower bound used by Kubernetes connection rebalancing; the active limit may be raised based on nodes and Typha count. Reworded the section as a connection rebalancing guardrail.
- The configuration snapshot command removed selected YAML lines with `grep -v`, including parent `annotations:` lines without their child fields, which can produce misleading or invalid YAML. Removed the brittle filters and added `--export` to the `calicoctl get felixconfiguration` command, matching Calico documentation.
- The runbook scale-up trigger said to scale when the cluster reaches `current_replicas * 200` nodes. Updated it to scale when the cluster exceeds that value.
- The scale-down guidance could reduce production clusters below Calico's recommended minimum of three replicas. Added that production scale-downs should keep at least 3 replicas.
- The scale-down connection check used `new_replicas * (node_count / new_replicas) * 1.2`, which simplifies to `node_count * 1.2` and is not a per-pod threshold. Corrected it to `(node_count / new_replicas) * 1.2`.
- The change log example started production at 2 replicas and then described a scale-up to 3 at 210 nodes. Updated the example to start with 3 replicas and treat 210 nodes as still covered by the production minimum.
- The best-practices section implied a long change-log gap means the autoscaler is working. Updated it to avoid assuming autoscaling is configured.

## Review Notes
The `kubectl` binary was not installed in the review workspace, so kubectl syntax was checked against Kubernetes official documentation rather than local `--help` output. The post is now technically consistent with current Calico documentation and Calico v3.32.0 source behavior for Typha connection rebalancing.
