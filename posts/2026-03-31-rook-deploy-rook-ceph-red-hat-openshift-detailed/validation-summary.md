# Validation Summary: How to Deploy Rook-Ceph on Red Hat OpenShift (Detailed)

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system, Reef v18.2.x)
- Red Hat OpenShift Container Platform (OCP 4.x)
- OpenShift Security Context Constraints (SCCs)
- Kubernetes Pod Security Admission
- OLM (Operator Lifecycle Manager) / OperatorHub
- Ceph CSI drivers (RBD)

## Sources Consulted
- Rook official OpenShift documentation: https://rook.io/docs/rook/latest/Getting-Started/ceph-openshift/
- Rook operator-openshift.yaml on GitHub: https://github.com/rook/rook/blob/master/deploy/examples/operator-openshift.yaml
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CSI drivers documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- OpenShift OLM documentation (OperatorGroup): https://docs.openshift.com/container-platform/4.14/operators/understanding/olm/olm-understanding-operatorgroups.html
- OpenShift SCC documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/authentication_and_authorization/managing-pod-security-policies
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Cross-referenced with validated sibling posts: `rook-how-to-deploy-rook-ceph-on-openshift` and `rook-how-to-troubleshoot-openshift-specific-issues-with-rook`

## Issues Found

### 1. Incorrect step ordering — namespace created after operator install
- **What was wrong:** Step 2 installed the Rook operator via OperatorHub into the `rook-ceph` namespace, but Step 3 created that namespace. The namespace must exist before any resources can be deployed into it.
- **What was changed:** Swapped Steps 2 and 3 so that namespace creation (with Pod Security Admission labels) is now Step 2, and OperatorHub installation is Step 3.
- **Why:** Applying a Subscription to a non-existent namespace would fail. The namespace and its security labels must be in place first.

### 2. Incorrect service account name `rook-ceph-operator`
- **What was wrong:** The SCC binding used `system:serviceaccount:rook-ceph:rook-ceph-operator`. The official Rook `operator-openshift.yaml` uses `rook-ceph-system` as the operator service account name.
- **What was changed:** Replaced `rook-ceph-operator` with `rook-ceph-system`.
- **Why:** Granting the SCC to the wrong service account name means the operator pods would not receive the required privileges.

### 3. Non-existent service account `rook-ceph-default`
- **What was wrong:** The SCC binding referenced `system:serviceaccount:rook-ceph:rook-ceph-default`, which is not a standard Rook service account. This was confirmed by cross-referencing with the official `operator-openshift.yaml` and the validated troubleshooting post.
- **What was changed:** Replaced `rook-ceph-default` with `rook-ceph-cmd-reporter`, which is a real Rook service account that requires privileged access for crash collection and command reporting.
- **Why:** An SCC grant to a non-existent service account has no effect, potentially leaving crash collector pods unable to run.

### 4. Invalid CephCluster CRD field `security.kms.enabled`
- **What was wrong:** The CephCluster spec included `security.kms.enabled: false`. The `kms` section in the CephCluster CRD does not have an `enabled` boolean — KMS is enabled by providing `connectionDetails` and `tokenSecretName`. This field would be rejected by CRD validation or silently ignored.
- **What was changed:** Removed the entire `security` block since KMS is simply not configured by omitting it.
- **Why:** Including an invalid field could cause a CRD validation error or confuse readers into thinking KMS has an explicit toggle.

### 5. Missing CephBlockPool resource
- **What was wrong:** The StorageClass referenced `pool: replicapool`, but no CephBlockPool named `replicapool` was ever created in the guide. Without this pool, PVC provisioning would fail with a "pool not found" error.
- **What was changed:** Added a CephBlockPool resource definition (with `failureDomain: host` and `replicated.size: 3`) to Step 5, before the StorageClass creation.
- **Why:** The StorageClass cannot provision volumes without the underlying Ceph pool existing.

### 6. Missing OperatorGroup for CLI installation
- **What was wrong:** The CLI installation path only included a Subscription resource. OLM requires an OperatorGroup in the target namespace before it will process a Subscription. Without it, the operator installation silently stalls.
- **What was changed:** Added an OperatorGroup YAML manifest and its `oc apply` command before the Subscription in the CLI installation section.
- **Why:** The OperatorGroup is a prerequisite for OLM to install an operator into a specific namespace. The web console creates this automatically, but the CLI path must do it explicitly.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v18.2.0` is valid but is the initial Reef release. Readers deploying today should consider using a newer point release (e.g., v18.2.4) for bug fixes. This is not an error but worth noting.
- The `mgr.count: 2` setting is good practice for HA but differs from the sibling OpenShift post which uses `count: 1`. Both are valid configurations.
- The `deviceFilter: "^vd[b-z]$"` targets virtio disks specifically. Readers on bare-metal or other virtualization platforms may need to adjust this (e.g., `^sd[b-z]` for SCSI, `^nvme[0-9]` for NVMe).
- The post does not mention deploying the Ceph toolbox, which is required before the `ceph status` verification command in Step 6 will work. This is a minor gap but does not constitute a technical error in the existing content.
