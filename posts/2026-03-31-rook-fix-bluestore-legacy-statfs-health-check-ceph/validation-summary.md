# Validation Summary: How to Fix BLUESTORE_LEGACY_STATFS Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (Nautilus 14.x, Reef 18.x)
- Rook (Kubernetes Ceph operator)
- BlueStore (Ceph OSD backend)
- Kubernetes (kubectl)
- ceph-bluestore-tool

## Sources Consulted
- Ceph official health-checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/#bluestore-legacy-statfs
- ceph-bluestore-tool man page: https://github.com/ceph/ceph/blob/main/doc/man/8/ceph-bluestore-tool.rst
- Ceph PR #30685: shallow fsck mode and legacy statfs auto repair (confirms auto-migration on mount added in v14.2.5)
- Ceph PR #30350: simplify per-pool-stat config options (confirms `repair` converts to per-pool stats)
- Ceph bug tracker #37652: legacy statfs record found (confirms `repair` is the recommended fix)
- Ceph v14.2.5 Nautilus release notes
- Rook issue #3552: OSD maintenance with legacy bluestore statfs

## Issues Found

1. **Deep scrub does not trigger statfs migration (Section: "Performing a Deep Scrub")**: The post incorrectly stated "A deep scrub forces BlueStore to recalculate object stats, which can trigger statfs migration." Deep scrub only recalculates/verifies object stats within the existing statfs format — it does not trigger the legacy-to-per-pool format migration. Migration only occurs on OSD startup (v14.2.5+) or via `ceph-bluestore-tool repair`. Fixed the section to clarify that deep scrub is a post-migration verification step, and added an explicit note that it does not trigger the migration.

2. **`ceph osd deep-scrub 0` uses non-canonical syntax**: While both `0` and `osd.0` are accepted by the Ceph CLI, the canonical documented form is `osd.0`. Changed to `ceph osd deep-scrub osd.0` and `ceph osd deep-scrub osd.1` to match official documentation conventions.

3. **Auto-migration version imprecision (Section: "Fixing via OSD Restart")**: The post stated the fix works for "Nautilus or later" but the auto-repair-on-mount feature was introduced in Nautilus v14.2.5 (PR #30685, November 2019), not the initial Nautilus release. Earlier Nautilus releases (v14.2.0–v14.2.4) require manual `ceph-bluestore-tool repair`. Added version precision to clarify this.

## Review Notes
- The `ceph-bluestore-tool repair --path /var/lib/ceph/osd/ceph-0` command is correct in both subcommand choice and argument order, confirmed against the official man page.
- The Rook kubectl commands for restarting OSD deployments and patching the CephCluster CR are correct.
- The `quay.io/ceph/ceph:v18.2.0` image tag references Ceph Reef, which is a valid and current release.
- The post could benefit from mentioning that for containerized/Rook deployments, running `ceph-bluestore-tool repair` requires exec-ing into the OSD container or using a debug pod, but this is a potential enhancement rather than a correctness issue.
