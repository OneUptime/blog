# Validation Summary: Customizing Typha High Availability in Calico the Hard Way

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Calico Typha
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes topology spread constraints
- Kubernetes PodDisruptionBudgets
- Kubernetes topology-aware routing
- Cluster Autoscaler safe-to-evict annotation

## Sources Consulted
- Calico documentation: Install Typha, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico documentation: Configuring Typha, https://docs.tigera.io/calico/latest/reference/typha/configuration
- Kubernetes documentation: Topology Aware Routing, https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes documentation: Pod Topology Spread Constraints, https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Specifying a Disruption Budget for your Application, https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: Assigning Pods to Nodes, https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Services, https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints, https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The Deployment snippet replaced the hard-way Typha Deployment without preserving required hard-way settings. Added `hostNetwork: true`, `priorityClassName: system-cluster-critical`, critical add-on toleration, Kubernetes datastore and connection rebalancing environment variables, Felix-Typha TLS environment variables, and the certificate volumes and mounts. These match Calico's hard-way Typha deployment pattern and Typha configuration reference.
- The topology-aware routing explanation said Felix agents would preferentially connect to same-zone Typha pods and that this ensured a zone failure would not cascade. Kubernetes documents this as a best-effort hinting mechanism that can fall back to cluster-wide routing, and it works best with at least 3 endpoints per zone. Updated the wording to reflect the fallback behavior and endpoint-count caveat.
- The Service annotation comment stated Kubernetes 1.24+. Kubernetes documents Topology Aware Routing as beta since v1.23 and notes the current `service.kubernetes.io/topology-mode: "Auto"` annotation. Removed the incorrect version parenthetical.
- The conclusion said rolling node drains always maintain at least one Typha pod per zone. A PDB enforces total availability for selected pods, not per-zone availability, and replacement pods may need to be scheduled. Updated the conclusion to say drains maintain enough Typha capacity while replacements are scheduled.

## Review Notes
- The corrected manifests were checked for YAML syntax with PyYAML. `kubectl` was not installed in this environment, so Kubernetes client-side schema dry-run validation could not be performed locally.
- The topology-aware routing annotation is valid, but for the 3-replica, 3-zone example it should be treated as an optimization rather than a guarantee because Kubernetes recommends at least 3 endpoints per zone for best results.
