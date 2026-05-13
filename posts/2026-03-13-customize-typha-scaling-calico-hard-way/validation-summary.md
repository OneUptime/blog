# Validation Summary: Customizing Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Typha
- Kubernetes Deployments
- Kubernetes node affinity and pod anti-affinity
- Kubernetes topology spread constraints
- Kubernetes PodDisruptionBudget
- kubectl resource management

## Sources Consulted
- Calico documentation: Install Typha, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico documentation: Configuring Typha, https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico documentation: Typha overview, https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico documentation: Schedule Typha for scaling to well-known nodes, https://docs.tigera.io/calico/latest/network-policy/comms/reduce-nodes
- Kubernetes documentation: Assigning Pods to Nodes, https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints, https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Specifying a Disruption Budget for your Application, https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: kubectl set resources, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/

## Issues Found
- The introduction said the post covered HorizontalPodAutoscaler configuration, but the post does not include an HPA example or instructions. Changed this to "replica counts" to match the actual content.
- The infra-node example described pinning Typha to infrastructure nodes, but the manifest used `preferredDuringSchedulingIgnoredDuringExecution`, which is only a soft scheduling preference. Changed the node affinity to `requiredDuringSchedulingIgnoredDuringExecution` so the example actually pins Typha to nodes labeled `node-role=infra`.
- The Typha Deployment examples omitted `hostNetwork: true`. Calico's hard-way Typha documentation runs Typha as a host-networked pod because `calico/node` depends on Typha before pod networking is established. Added `hostNetwork: true` to both Deployment examples.

## Review Notes
The YAML snippets were syntax-checked after editing. `kubectl` is not installed in this environment, so command validation was performed against Kubernetes' official generated `kubectl set resources` reference instead of local CLI help.
