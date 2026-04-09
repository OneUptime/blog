# Validation Summary: How to Deploy Rook-Ceph on Google GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Rook operator for Ceph storage)
- Ceph v18.2.0 (Reef release)
- Google Kubernetes Engine (GKE)
- Google Compute Engine Persistent Disks
- Helm
- gcloud CLI
- kubectl

## Sources Consulted
- Rook documentation: https://rook.io/docs/rook/latest/Getting-Started/quickstart/
- Rook Ceph CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph Helm chart values: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook example manifests: https://github.com/rook/rook/tree/master/deploy/examples
- Google Cloud `gcloud compute disks create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/disks/create
- Google Cloud `gcloud compute instances attach-disk` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/attach-disk
- Google Cloud `gcloud compute firewall-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Ceph port reference: https://docs.ceph.com/en/reef/rados/configuration/network-config-ref/

## Issues Found
1. **Missing Rook toolbox deployment (Step 6):** The post ran `kubectl exec` against `deploy/rook-ceph-tools` without first deploying the toolbox. Added the `kubectl apply` command to deploy the toolbox from the Rook examples before the exec command.

2. **Missing CephBlockPool and StorageClass (Step 6):** The post created a test PVC without first creating the required CephBlockPool and StorageClass resources. Without these, the PVC would remain Pending. Added commands to apply `pool.yaml` and `storageclass.yaml` from the Rook examples.

3. **Incorrect PVC name (Step 6):** The post used `kubectl get pvc test-pvc`, but the Rook example PVC at `deploy/examples/csi/rbd/pvc.yaml` defines a PVC named `rbd-pvc`. Changed to `kubectl get pvc rbd-pvc`.

## Review Notes
- The `--device-name=sdb` flag in `gcloud compute instances attach-disk` sets the GCE device name (creating a symlink at `/dev/disk/by-id/google-sdb`), but does not guarantee the device appears as `/dev/sdb` in the guest OS. In practice, the first additional disk attached to a GCE instance typically does appear as `/dev/sdb`, so the `deviceFilter: "^sdb$"` in the CephCluster spec will work in the common case. For production deployments, using `/dev/disk/by-id/` paths via `devicePathFilter` would be more reliable.
- Step 5's firewall rules may be unnecessary in default GKE setups, since GKE auto-creates firewall rules allowing all intra-node communication. However, the rules are valid and useful if the default rules have been modified or in custom VPC configurations.
- The placeholder instance names (`gke-my-cluster-default-pool-node-$i`) and network tags (`gke-my-cluster`) are simplified for illustration. Actual GKE instance names and tags include hash suffixes (e.g., `gke-my-cluster-default-pool-a1b2c3d4-wxyz`). Readers should substitute their actual values.
- Ceph v18.2.0 (Reef) is a valid and current release at the time of review.
