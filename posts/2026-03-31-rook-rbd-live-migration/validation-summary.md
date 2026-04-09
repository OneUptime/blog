# Validation Summary: How to Perform RBD Live Migration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes Ceph operator)
- Ceph RBD (RADOS Block Device)
- RBD live migration (prepare-execute-commit workflow)
- Kubernetes PersistentVolumes with CSI

## Sources Consulted
- Ceph official documentation: RBD Image Live-Migration (https://docs.ceph.com/en/latest/rbd/rbd-live-migration/)
- Ceph man page: rbd(8) (https://docs.ceph.com/en/latest/man/8/rbd/)
- Ceph source repository: doc/rbd/rbd-live-migration.rst (https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-live-migration.rst)
- Kubernetes documentation: PersistentVolumes (https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

## Issues Found

1. **Incorrect status command (`rbd migration status` does not exist):** The blog used `rbd migration status` in Steps 2 and 3. The `rbd migration` command only has four subcommands: prepare, execute, commit, and abort. The correct command to check migration status is `rbd status <target-image>`. Fixed both occurrences to use `rbd status`.

2. **Status checked on source image instead of target:** In Step 2, the status was checked against `replicapool/myimage` (the source). After prepare, the source image is moved to RBD trash, and the target image (`fast-pool/myimage`) should be used for all subsequent commands including status checks. Fixed to use the target image.

3. **Incorrect sample status output format:** The sample outputs did not match actual `rbd status` output. Real output includes a `Watchers:` section and a `Migration:` section with indented fields. The progress indicator is shown as part of the state field (e.g., `executing (65% complete)`), not as a separate `executed: 65%` field. Fixed both sample outputs to match the documented format.

4. **Understated prepare requirement:** The blog said "source image must be unmounted or in read-only mode for prep." The actual requirement per Ceph docs is stronger: "All clients using the source image must be stopped prior to preparing a live-migration." Fixed the parenthetical to accurately reflect this requirement.

5. **Invalid `kubectl patch` command for PV CSI attributes:** The blog suggested using `kubectl patch pv` to update `spec.csi.volumeAttributes.pool`. However, the `spec.csi` section of a Kubernetes PersistentVolume is immutable after creation, so this patch would fail. Replaced with a correct workflow: export the PV to YAML, edit the pool value, delete the old PV, and recreate it.

## Review Notes
- The `ceph osd pool create fast-pool 32 replicated` command uses a hardcoded pg_num of 32. Modern Ceph versions (Nautilus+) enable pg-autoscaling by default, so the pg_num argument is often unnecessary. The command is still syntactically valid but readers may want to rely on autoscaling instead.
- The post correctly identifies the three-phase workflow (prepare-execute-commit) and accurately describes abort behavior.
- The import-only migration mode (for cross-cluster or external sources) is not covered, which is fine for the scope of this tutorial.
