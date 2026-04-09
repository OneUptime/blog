# Validation Summary: How to Deploy Rook-Ceph on Harvester HCI

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Harvester HCI (SUSE open-source hyper-converged infrastructure)
- KubeVirt (VM management on Kubernetes)
- Longhorn (default Harvester storage backend)
- Helm (Kubernetes package manager)
- Kubernetes (container orchestration)

## Sources Consulted
- Rook Helm chart repository index at https://charts.rook.io/release
- Rook GitHub repository - CephCluster CRD examples (`deploy/examples/cluster.yaml`)
- Rook GitHub repository - CephObjectStore CRD examples (`deploy/examples/object.yaml`)
- Rook GitHub repository - Toolbox deployment (`deploy/examples/toolbox.yaml`)
- Rook GitHub repository - Helm chart `values.yaml` for `rook-ceph`
- Ceph container images on quay.io (`quay.io/ceph/ceph`)
- Harvester official documentation at https://docs.harvesterhci.io/
- Harvester GitHub repository at https://github.com/harvester/harvester
- KubeVirt official site at https://kubevirt.io/

## Issues Found

### 1. Incorrect capitalization of "KubeVirt"
- **What was wrong:** The post used "Kubevirt" in the Overview section.
- **What was changed:** Corrected to "KubeVirt" to match the official project name capitalization.
- **Why:** The official spelling uses a capital V (KubeVirt), as documented on kubevirt.io and in Harvester's own documentation.

### 2. Outdated Ceph container image version
- **What was wrong:** The CephCluster spec used `quay.io/ceph/ceph:v18.2.0` (Ceph Reef, released December 2023). Reef (v18) is no longer listed as a supported version in current Rook releases.
- **What was changed:** Updated to `quay.io/ceph/ceph:v19.2.0` (Ceph Squid), which is a currently supported release.
- **Why:** For a blog post dated March 2026, recommending Ceph Reef is significantly outdated and may not be compatible with current Rook operator versions. Squid (v19.2.x) is a well-tested, supported release.

### 3. Missing Rook toolbox deployment
- **What was wrong:** Step 6 referenced `deploy/rook-ceph-tools` for running `ceph -s`, but the toolbox deployment was never created. The rook-ceph-tools pod is not auto-created with a CephCluster; it must be deployed separately.
- **What was changed:** Added a `kubectl apply` command to deploy the official Rook toolbox before the verification commands.
- **Why:** Without deploying the toolbox first, the `kubectl exec` command in Step 6 would fail with a "not found" error.

## Review Notes
- The `--set nodeSelector."ceph-storage"=enabled` flag in Step 3 sets the nodeSelector on the Rook operator Deployment only, not on the Ceph daemons. This is acceptable because the CephCluster CR in Step 4 separately handles daemon placement via `spec.placement.all.nodeAffinity`. The two complement each other correctly.
- The post omits Linux and KVM from the Harvester technology stack description (official docs describe Harvester as built on "Linux, KVM, Kubernetes, KubeVirt, and Longhorn"). This is a simplification, not an error, as the post focuses on the Kubernetes-level components relevant to the deployment.
- The post does not cover creating a StorageClass or CephBlockPool for RBD, nor a CephFilesystem for CephFS, though both are mentioned in the summary as capabilities. This is acceptable for a focused tutorial but could be expanded in a follow-up.
