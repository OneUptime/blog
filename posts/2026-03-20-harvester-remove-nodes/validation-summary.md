# Validation Summary: How to Remove Nodes from Harvester Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- Longhorn
- KubeVirt
- RKE2
- etcd

## Sources Consulted
- Harvester Host Management: https://docs.harvesterhci.io/v1.7/host/
- Harvester Witness Node: https://docs.harvesterhci.io/v1.7/advanced/witness/
- Longhorn Node Maintenance and Kubernetes Upgrade Guide: https://longhorn.io/docs/1.11.0/maintenance/maintenance/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- KubeVirt API reference (`VirtualMachineInstanceStatus.nodeName`): https://kubevirt.io/api-reference/v1.7.1/definitions.html
- RKE2 uninstall documentation: https://docs.rke2.io/install/uninstall

## Issues Found
- The post claimed you must keep an odd number of cluster nodes for quorum. Harvester’s quorum requirement is for odd-numbered etcd membership, not total node count, so the wording was corrected.
- The minimum-size guidance was too broad. Harvester specifically requires adding a node before removing a control-plane node from a cluster with three control-plane nodes and no workers, so that caveat was added.
- The `kubectl get nodes | wc -l` check was misleading because it counted headers and did not reflect Harvester’s documented role-based removal rules. It was replaced with a role-aware cluster review step.
- The VMI commands used `--field-selector spec.nodeName` against a custom resource. That is not documented as a selectable field, so the checks were changed to use `status.nodeName` in `custom-columns` output instead.
- The post documented enabling Harvester Maintenance Mode via a node annotation. Harvester’s official docs document Maintenance Mode through the UI, so the unsupported CLI path was removed.
- The post stated that Harvester would live-migrate all VMs. Harvester documents that only live-migratable VMs are evacuated automatically and non-migratable VMs may need manual shutdown, so that language was corrected.
- The manual drain example did not match Harvester’s documented fallback flow. It was replaced with Harvester’s published `kubectl drain` command and flags for the two-control-plane-node scenario.
- The Longhorn replica evacuation section used undocumented patch commands and a broken `watch ... | jq` pipeline. It was replaced with the documented Longhorn UI workflow from Harvester’s node-removal guide.
- The node-removal section instructed readers to manually delete the Kubernetes node, Longhorn node, and etcd member. Harvester’s documented process is to uninstall RKE2 on the target node, shut it down, and then delete the host from the Harvester UI, so the unsupported manual etcd removal flow was removed.
- The cleanup section used the wrong SSH user and uninstall path for Harvester nodes and suggested manual `rm -rf` cleanup. It was corrected to Harvester’s documented root login and `/opt/rke2/bin/rke2-uninstall.sh` flow.
- The verification step used `kubectl get componentstatuses`, which relies on a deprecated Kubernetes API. It was replaced with the supported `/readyz` health check flow.
- The conclusion overstated that replica evacuation guarantees three replicas on remaining nodes. Longhorn can leave volumes degraded when the cluster lacks capacity, so the conclusion was corrected to match documented behavior.

## Review Notes
- The corrected flow aligns with Harvester v1.7 documentation, which is the latest stable documentation available on April 30, 2026.
- The post still assumes a standard Harvester cluster with management and worker nodes. Witness-node clusters have extra storage replica caveats and may require a replica count of 2 instead of 3.
- Some remaining inspection commands read Longhorn CRDs directly for visibility, but the operational steps now follow the officially documented Harvester and Longhorn procedures.
- The commands were reviewed against official documentation and API references in this workspace, but they were not executed against a live Harvester cluster here.
