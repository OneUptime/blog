# Validation Summary: How to Set Up Harvester Witness Node

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- etcd
- RKE2
- Longhorn

## Sources Consulted
- Harvester Witness Node: https://docs.harvesterhci.io/v1.7/advanced/witness/
- Harvester Configuration Reference: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Hardware and Network Requirements: https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester Host Management / Role Management: https://docs.harvesterhci.io/v1.7/host/
- Harvester ISO Installation: https://docs.harvesterhci.io/v1.7/install/
- Harvester StorageClass documentation: https://docs.harvesterhci.io/v1.4/advanced/storageclass/
- RKE2 Managing Server Roles: https://docs.rke2.io/install/server_roles
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- etcd cluster status checks: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- etcd hardware recommendations: https://etcd.io/docs/v3.3/op-guide/hardware/

## Issues Found
- The post described the witness node as running the Kubernetes API server and full control-plane behavior. I corrected this to match Harvester and RKE2 documentation: the witness is an etcd-only node and does not run the full control plane.
- The topology diagram and usage guidance implied a five-member etcd quorum across two datacenters. I corrected this to Harvester's documented `2 management nodes + 1 witness node` topology, which forms a three-member etcd quorum.
- The hardware requirements were understated (`4 cores`, `8 GB RAM`, `100 GB disk`). I updated them to Harvester's documented minimums for witness-node deployments.
- The installation YAML used unsupported keys and nesting (`harvester.mode`, `harvester.role`, `subnetMask`, `dnsNameservers` under the management interface). I replaced the snippet with the documented configuration structure using top-level `server_url` and `token`, plus `install.mode`, `install.role`, and `install.management_interface.subnet_mask`.
- The post instructed readers to convert a joined node into a witness using labels and taints. I removed that because Harvester documents that the witness role can only be assigned when the node joins the cluster.
- The expected `kubectl get nodes` output showed the witness node as `control-plane,etcd,master`. I corrected the expected role to `etcd`.
- The guide omitted the documented Longhorn limitation for `2 management + 1 witness` clusters with no workers. I added the requirement to use a default StorageClass with `2` replicas instead of the default `3`.
- The verification steps used deprecated or misleading checks (`/healthz`, `kubectl get componentstatuses`) and assumed local `kubectl` access on the witness node. I replaced those with `readyz` and `etcdctl endpoint health --cluster`, and moved operational commands to a management node or an already-configured workstation.

## Review Notes
- Witness-node support is available in Harvester as of v1.3.0.
- Harvester currently allows only one witness node per cluster.
- The default Longhorn replica count of `3` remains appropriate when the cluster includes worker nodes that can host replicas; the `2`-replica default is specifically needed for `2 management + 1 witness` clusters with no workers.
