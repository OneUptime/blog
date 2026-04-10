# Validation Summary: How to Configure CSI Image Versions in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph operator
- Kubernetes CSI (Container Storage Interface)
- Helm package manager
- CSI sidecar containers (provisioner, attacher, resizer, snapshotter, node-driver-registrar)
- CephCSI plugin
- kubectl

## Sources Consulted
- Rook-Ceph Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Kubernetes CSI sidecar container documentation: https://kubernetes-csi.github.io/docs/sidecar-containers.html
- Cross-referenced with validated Rook blog posts in this repository (rook-custom-csi-images, rook-plugin-provisioner-replicas-csi-helm, rook-configure-csi-resource-limits-helm)

## Issues Found

### 1. Incorrect Helm values nesting structure
- **What was wrong:** The post used `csi.csiDriverImages.<component>.image` and `csi.csiDriverImages.<component>.tag` as the Helm values structure. The actual Rook Helm chart uses a flat structure directly under `csi:` — e.g., `csi.provisioner.repository` and `csi.provisioner.tag`.
- **What was changed:** Removed the `csiDriverImages` nesting level from all YAML examples. Components are now directly under `csi:`.
- **Why:** The `csiDriverImages` key does not exist in the Rook-Ceph Helm chart. Using this structure would result in the overrides being silently ignored during `helm upgrade`.

### 2. Wrong field name for image repository
- **What was wrong:** The post used `image:` as the key for the container image repository path.
- **What was changed:** Replaced `image:` with `repository:` in all YAML examples.
- **Why:** The Rook Helm chart values.yaml uses `repository` (not `image`) for the image registry/path field.

### 3. Wrong key name for CephCSI plugin
- **What was wrong:** The post used `plugin:` as the key for the CephCSI image.
- **What was changed:** Replaced `plugin:` with `cephcsi:` in all YAML examples.
- **Why:** The Rook Helm chart uses `csi.cephcsi.repository` and `csi.cephcsi.tag` for the CephCSI plugin image.

### 4. Non-existent sidecar listed in table
- **What was wrong:** The sidecar table included `csi-omap-generator` as a managed sidecar.
- **What was changed:** Removed the `csi-omap-generator` row from the table.
- **Why:** The omap-generator functionality was integrated into the CephCSI plugin itself in Rook v1.8+ and is no longer deployed as a separate sidecar container.

### 5. Suboptimal helm show values grep command
- **What was wrong:** `grep -A3 "tag:" | head -60` would match many unrelated `tag:` fields and produce noisy output.
- **What was changed:** Changed to `grep -A1 "repository:"` which directly shows image repositories and their associated tags.
- **Why:** Grepping for `repository:` is more targeted and produces cleaner output showing the image paths alongside their tags.

## Review Notes
- The example image versions (e.g., csi-provisioner v3.6.4, csi-attacher v4.4.0) are older but valid releases. Since the post is about demonstrating how to pin versions, not recommending specific versions, this is acceptable.
- The `imagePullSecrets` top-level placement is correct for the Rook Helm chart.
- The `helm upgrade` and `kubectl get pod` verification commands are correct.
- The compatibility notes section provides sound advice about checking the Rook documentation before overriding defaults.
