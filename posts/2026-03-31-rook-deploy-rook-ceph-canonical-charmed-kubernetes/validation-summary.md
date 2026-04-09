# Validation Summary: How to Deploy Rook-Ceph on Canonical Charmed Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage operator)
- Ceph (distributed storage system, Reef v18.2.0)
- Canonical Charmed Kubernetes (Juju-managed Kubernetes)
- Juju (application modeling tool)
- Helm (Kubernetes package manager)
- Kubernetes CSI (Container Storage Interface)

## Sources Consulted
- Juju 3.x CLI reference for `exec` vs `run` semantics: https://documentation.ubuntu.com/juju/3.6/reference/juju-cli/list-of-juju-cli-commands/exec/
- Juju 3.x `run` command (charm actions only): https://documentation.ubuntu.com/juju/3.6/reference/juju-cli/list-of-juju-cli-commands/run/
- Charmed Kubernetes kubeconfig export documentation: https://ubuntu.com/kubernetes/charmed-k8s/docs/operations
- Rook-Ceph StorageClass example (with required CSI secret parameters): https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Rook-Ceph CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook-Ceph Dashboard documentation: https://rook.io/docs/rook/v1.14/Storage-Configuration/Monitoring/ceph-dashboard/
- Juju storage pools documentation: https://juju.is/docs/juju/storage-support
- Charmed Kubernetes inclusive naming (kubernetes-control-plane): https://ubuntu.com/kubernetes/docs/inclusive-naming

## Issues Found

### 1. Incorrect Juju command for shell execution (High severity)
**What was wrong:** The post used `juju run --unit` to execute shell commands (e.g., `lsblk`, `wipefs`, `cat`). In Juju 3.x, `juju run` is exclusively for charm actions (it replaced `juju run-action`). Using `juju run --unit ... -- "lsblk"` would fail on Juju 3.x.
**What was changed:** Replaced `juju run --unit` with `juju exec --unit` for disk preparation commands in Step 2. Replaced the kubeconfig export command in Step 1 with the canonical `juju ssh kubernetes-control-plane/leader -- cat config` as documented in the official Charmed Kubernetes docs.
**Why:** `juju exec` is the Juju 3.x equivalent of the old `juju run` for arbitrary shell commands. `juju ssh` is the officially documented method for kubeconfig retrieval.

### 2. StorageClass missing required CSI secret parameters (High severity)
**What was wrong:** The StorageClass definition was missing six required CSI secret parameters (`provisioner-secret-name`, `provisioner-secret-namespace`, `controller-expand-secret-name`, `controller-expand-secret-namespace`, `node-stage-secret-name`, `node-stage-secret-namespace`). Without these, PVC provisioning and node mounting would fail because the CSI driver cannot authenticate with Ceph.
**What was changed:** Added all six required CSI secret parameters to the StorageClass manifest with their standard Rook-Ceph values.
**Why:** These parameters are mandatory per the official Rook StorageClass example and are needed for the RBD CSI driver to function.

### 3. Incorrect Juju storage integration pattern (Medium severity)
**What was wrong:** The post showed `juju config my-app storage-class=rook-ceph-block` as the way to use the storage class with Juju applications. There is no standard `storage-class` config key across Juju charms — this command would only work if a specific charm happened to expose that config option.
**What was changed:** Replaced with the standard Juju pattern: creating a storage pool with `juju create-storage-pool` and deploying with `--storage` flag.
**Why:** This is the documented and portable way to use Kubernetes storage classes with Juju-deployed applications.

### 4. Description inconsistency (Low severity)
**What was wrong:** The post description mentioned "snap-based paths" but the content correctly states Charmed Kubernetes uses standard kubelet paths.
**What was changed:** Updated description to remove the "snap-based paths" reference.
**Why:** The description should accurately reflect the post content.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v18.2.0` exists and works but is outdated. The latest Reef release is v18.2.8. Version v18.2.0 had known issues including a continuous reconcile loop bug (rook/rook#12944). A future update to at least v18.2.4 would be advisable.
- The monitoring URL (`https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/service-monitor.yaml`) is valid and `master` is the correct default branch for the Rook repository. For production use, pinning to a release branch (e.g., `release-1.16`) would be more stable.
- The dashboard port-forward command using port 7000 is correct given that `dashboard.ssl: false` is set in the CephCluster spec. With SSL enabled (default), the port would be 8443 instead.
- The `mgr.count: 1` setting is valid but provides no manager redundancy. For production clusters, `count: 2` is recommended.
- Charmed Kubernetes deploys Kubernetes components as snaps with confinement, which could affect CSI plugin paths. The default `kubeletDirPath` of `/var/lib/kubelet` typically works because the snap maps this path, but users should be aware of potential snap confinement issues if they encounter CSI mounting problems.
