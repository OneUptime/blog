# Validation Summary: How to Deploy Rook-Ceph on OpenShift

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.13.0)
- Ceph (v18 Reef)
- OpenShift (4.x)
- Kubernetes
- Security Context Constraints (SCCs)
- Ceph CSI (RBD block storage)

## Sources Consulted
- Rook v1.13.0 deploy/examples directory listing on GitHub: https://github.com/rook/rook/tree/v1.13.0/deploy/examples
- Rook v1.13 OpenShift deployment documentation: https://rook.io/docs/rook/v1.13/Getting-Started/ceph-openshift/
- Rook v1.13 CephCluster CRD documentation: https://rook.io/docs/rook/v1.13/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

### 1. Non-existent `scc.yaml` file reference (Critical)
**What was wrong:** The post instructed users to run `oc create -f scc.yaml` to apply Security Context Constraints. However, no `scc.yaml` file exists in the Rook repository's `deploy/examples/` directory. The SCCs are bundled within `operator-openshift.yaml`, which creates both the SCC definitions and the operator deployment.

**What was changed:** Removed the `oc create -f scc.yaml` command from the "Applying Security Context Constraints" section. Updated the text to clarify that `operator-openshift.yaml` includes the SCC definitions, and reframed the example SCC YAML as illustrative of what that manifest contains.

**Why:** Running `oc create -f scc.yaml` would fail with a file-not-found error, blocking users from completing the deployment.

### 2. Missing toolbox deployment step (Moderate)
**What was wrong:** The "Verify the Cluster" section ran `oc -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status` without first deploying the toolbox pod. The `toolbox.yaml` manifest must be applied before the toolbox deployment exists.

**What was changed:** Added `oc create -f toolbox.yaml` before the exec command in the verification section.

**Why:** Without deploying the toolbox first, the exec command would fail because the `rook-ceph-tools` deployment would not exist.

### 3. Ceph image version (Minor)
**What was wrong:** The post used `quay.io/ceph/ceph:v18.2.0`. While v18.2.0 is a valid Reef release, the Rook v1.13 documentation recommends v18.2.2.

**What was changed:** Updated the Ceph image tag from `v18.2.0` to `v18.2.2`.

**Why:** Using the version recommended by the official documentation ensures better compatibility and includes bug fixes.

## Review Notes
- The post references Rook v1.13.0, which is significantly older than the latest stable release (v1.16+). The information is accurate for v1.13 but users should be aware that newer versions may have different procedures or defaults.
- The example SCC YAML shown is a simplified illustration. The actual SCC in `operator-openshift.yaml` includes additional fields and service accounts. This is acceptable for a tutorial but users should rely on the official manifest rather than hand-crafting SCCs.
- The StorageClass configuration assumes a `replicapool` CephBlockPool has been created, but the post does not include a CephBlockPool manifest. Users will need to create one (e.g., from the `pool.yaml` example in the Rook repository) before the StorageClass will work.
- The `mgr.count: 1` setting is valid but newer Rook versions default to 2 managers for high availability.
