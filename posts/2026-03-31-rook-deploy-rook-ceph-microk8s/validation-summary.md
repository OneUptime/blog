# Validation Summary: How to Deploy Rook-Ceph on MicroK8s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage operator)
- Ceph (distributed storage, Reef v18.2.0)
- MicroK8s (Canonical snap-packaged Kubernetes)
- Helm 3 (Kubernetes package manager)
- CSI (Container Storage Interface) drivers

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/
- Rook Helm chart values (csi.kubeletDirPath): https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Rook CephBlockPool and StorageClass examples: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- MicroK8s documentation on snap paths: https://microk8s.io/docs
- MicroK8s add-ons reference: https://microk8s.io/docs/addons
- Validated against sibling post (SUSE Rancher deploy) for StorageClass parameter consistency

## Issues Found

### 1. Missing CSI secret parameters in StorageClass (Step 5)
**What was wrong:** The StorageClass definition was missing required CSI secret references (`csi.storage.k8s.io/provisioner-secret-name`, `provisioner-secret-namespace`, `controller-expand-secret-name`, `controller-expand-secret-namespace`, `node-stage-secret-name`, `node-stage-secret-namespace`). Without these parameters, the CSI driver cannot authenticate with Ceph, causing PVC provisioning and volume expansion to fail.

**What was changed:** Added the six required CSI secret parameter entries to the StorageClass `parameters` block, referencing the `rook-csi-rbd-provisioner` and `rook-csi-rbd-node` secrets that the Rook operator auto-creates in the `rook-ceph` namespace.

**Why:** These parameters are required per the Rook documentation and official StorageClass examples. The sibling Rancher deploy post correctly includes them.

### 2. Incorrect DaemonSet name in troubleshooting section
**What was wrong:** The troubleshooting command referenced `ds/rook-ceph-csi-rbdplugin`, but the Rook operator creates CSI DaemonSets with fixed names (not prefixed by the Helm release name). The correct DaemonSet name is `csi-rbdplugin`.

**What was changed:** Changed `ds/rook-ceph-csi-rbdplugin` to `ds/csi-rbdplugin` in the log inspection command.

**Why:** The Rook operator creates CSI DaemonSets directly (not via Helm templates), so they use fixed names like `csi-rbdplugin` regardless of the Helm release name.

## Review Notes
- The guide enables the `storage` add-on in Step 1 and then immediately suggests disabling it. Users who plan to use Rook as the default storage could skip enabling `storage` entirely. This is not technically incorrect since the text frames it as optional.
- Step 4 references `deploy/rook-ceph-tools` for running `ceph status`, but the toolbox deployment is not shown in this guide. Readers would need to deploy the Rook toolbox separately (e.g., from the Rook examples `toolbox.yaml`). The command syntax itself is correct.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` (Reef) is valid. Users should check for newer patch releases in the v18.2.x series.
- The snap paths (`/var/snap/microk8s/common/var/lib/kubelet` and `/var/snap/microk8s/common/run/containerd.sock`) are correct for standard MicroK8s snap installations.
