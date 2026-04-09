# Validation Summary: How to Deploy the Ceph Toolbox Pod in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph orchestrator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Ceph CLI tools (ceph, rados, rbd, radosgw-admin)

## Sources Consulted
- Official Rook toolbox manifest: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph CLI documentation for `ceph status`, `ceph osd status`, `ceph osd pool ls detail`, and `ceph health detail`

## Issues Found

### 1. Manual YAML referenced nonexistent `toolbox.sh` script
**What was wrong:** The manual toolbox deployment YAML used `command: ["/bin/bash"]` with `args: ["-m", "-c", "/usr/local/bin/toolbox.sh"]`. The `toolbox.sh` script does not exist in the base `quay.io/ceph/ceph` container image — it was only available in the older `rook/ceph` toolbox image. The official Rook manifest itself notes: "Replicate the script from toolbox.sh inline so the ceph image can be run directly, instead of requiring the rook toolbox."

**What was changed:** Replaced the command/args with an inline shell script that configures Ceph monitor endpoints and the keyring, matching the approach used in the official Rook toolbox manifest.

### 2. Outdated container image tag
**What was wrong:** The manual YAML used `quay.io/ceph/ceph:v18` (Ceph Reef). The current official Rook toolbox manifest uses `quay.io/ceph/ceph:v19` (Ceph Squid).

**What was changed:** Updated the image tag from `v18` to `v19`.

### 3. Missing security context
**What was wrong:** The manual YAML had no security context. The official manifest runs as non-root (UID/GID 2016) with all Linux capabilities dropped.

**What was changed:** Added `securityContext` with `runAsNonRoot: true`, `runAsUser: 2016`, `runAsGroup: 2016`, and `capabilities: drop: ["ALL"]`.

### 4. Secret handling via env var instead of volume mount
**What was wrong:** The manual YAML passed `ROOK_CEPH_SECRET` as an environment variable from the `rook-ceph-mon` secret. The current official approach mounts the secret as a file at `/var/lib/rook-ceph-mon/secret.keyring` and reads it from there (with env var fallback for backward compatibility).

**What was changed:** Removed the `ROOK_CEPH_SECRET` env var. Added a `ceph-admin-secret` volume mounting the `rook-ceph-mon` secret's `ceph-secret` key as `secret.keyring`. The inline script reads from the file with env var fallback.

### 5. Missing serviceAccountName and tty
**What was wrong:** The manual YAML did not specify a service account or enable tty. The official manifest uses `serviceAccountName: rook-ceph-default` and `tty: true`.

**What was changed:** Added `serviceAccountName: rook-ceph-default` and `tty: true`.

## Review Notes
- The official toolbox manifest URL (`https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml`) is correct — Rook uses `master` as its default branch.
- All Ceph CLI commands in the post (`ceph status`, `ceph osd status`, `ceph osd pool ls detail`, `ceph health detail`) are syntactically correct and valid.
- All `kubectl` commands use correct syntax and the standard `rook-ceph` namespace.
- The official manifest also includes a `rook-config-override` ConfigMap volume for custom Ceph configuration. This was omitted from the blog's simplified manual manifest, which is acceptable for a basic tutorial.
