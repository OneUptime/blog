# Validation Summary: How to Roll Back Safely After Using calicoctl apply

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Calico network policy resources
- Bash
- Python / PyYAML

## Sources Consulted
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy

## Issues Found
- The helper scripts used Python's `yaml` module but did not list PyYAML as a prerequisite. Added Python 3 with PyYAML to the prerequisites.
- The snapshot script claimed to snapshot all resource types but omitted several documented calicoctl resource types, including IPReservation, BGPFilter, WorkloadEndpoint, KubeControllersConfiguration, ClusterInformation, Node, Profile, and Tier. Added those resource types to the snapshot list and full rollback order.
- The safe-apply script did not account for namespaced Calico resources when capturing a pre-apply snapshot. Added namespace extraction and `-n` handling for NetworkPolicy, NetworkSet, and WorkloadEndpoint.
- The Python one-liners interpolated the resource file path into Python source. Changed them to pass the file path through `sys.argv` so paths with spaces are handled correctly.
- The full rollback section implied that applying saved resources fully restores cluster state. Added a clarification that applying a snapshot does not delete Calico resources created after the snapshot.

## Review Notes
The commands and options reviewed are current in the latest Calico documentation. The post still intentionally presents lightweight operational scripts; production rollback automation should also track newly created resources and test restore behavior in a non-production cluster.
