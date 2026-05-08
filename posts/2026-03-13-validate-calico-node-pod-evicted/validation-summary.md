# Validation Summary: How to Validate Resolution of Calico Node Pod Eviction

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Calico
- calicoctl
- kubectl
- jq
- Linux disk usage checks

## Sources Consulted
- Kubernetes documentation: Node-pressure Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Guaranteed Scheduling For Critical Add-On Pods - https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl reference: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: kubectl wait - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp

## Issues Found
- The post stated that without `system-node-critical`, `calico-node` "will be evicted again on the next pressure event." Kubernetes documentation says priority is used to determine node-pressure eviction order and critical add-on priority helps keep critical components available, but it does not guarantee a non-static pod can never be evicted. Updated the wording to say priority is critical because Kubernetes uses pod priority when deciding node-pressure eviction order.
- The BGP validation command used plain `calicoctl node status`, which checks the local Calico node instance. Updated it to run through SSH on the recovered node with `sudo calicoctl node status`, matching Calico documentation examples and ensuring the validation targets the affected node.
- The conclusion repeated the overly absolute recurrence-prevention claim. Updated it to say the priority class check reduces recurrence risk.

## Review Notes
- The `kubectl get pods --field-selector spec.nodeName=<node>` command is valid because `spec.nodeName` is a supported Pod field selector.
- The `kubectl run` command uses a valid `--overrides` JSON snippet to set `spec.nodeName`; this bypasses normal scheduler placement, which is acceptable for a targeted validation pod but should be used deliberately.
- The `kubectl wait pod/evict-test --for=condition=Ready --timeout=60s` command is valid per the current kubectl reference.
- The Calico BGP validation applies only when Calico is using BGP. Clusters using VXLAN, IPIP without BGP peering, or other dataplane modes may need a different route/connectivity validation.
