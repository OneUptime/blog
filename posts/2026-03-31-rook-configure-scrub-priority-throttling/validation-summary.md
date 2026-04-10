# Validation Summary: How to Configure Scrub Priority and Throttling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD scrubbing and throttling configuration)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec commands)
- Linux I/O scheduling (ioprio classes)

## Sources Consulted
- Ceph OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Configuration Guide: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Lowering Ceph Scrub I/O Priority (ceph.io blog): https://ceph.io/geen-categorie/lowering-ceph-scrub-io-priority/
- Linux ioprio_set(2) man page: https://man7.org/linux/man-pages/man2/ioprio_set.2.html
- Red Hat Ceph Storage 5 Scrubbing Options: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/configuration_guide/ceph-scrubbing-options_conf
- Ceph source (GitHub): https://github.com/ceph/ceph/blob/main/doc/rados/configuration/osd-config-ref.rst

## Issues Found

1. **Non-existent parameter `osd_deep_scrub_sleep`**: The post referenced `osd_deep_scrub_sleep` as a separate Ceph configuration parameter (in the table, commands, recommended profiles, and summary). This parameter does not exist in Ceph. Only `osd_scrub_sleep` exists, and it applies to both shallow and deep scrubs. Removed all references to `osd_deep_scrub_sleep` and clarified that `osd_scrub_sleep` covers both scrub types.

2. **Incorrect Linux ioprio class numeric mappings**: The comment stated `class_id 0=idle, 2=best-effort, 6=high`. The correct Linux ioprio classes are: 1=realtime, 2=best-effort, 3=idle. There is no class 6 or class named "high". Fixed the comment to show correct values and clarified that the Ceph parameter accepts string values (`idle`, `be`, `rt`).

3. **Wrong sort column in monitoring command**: `sort -k4` was used with `ceph osd perf`, but that command outputs only 3 columns (osd_id, commit_latency, apply_latency). Changed to `sort -k3` to sort by apply_latency.

4. **Misleading scope of ioprio settings**: The section implied `osd_disk_thread_ioprio_class` specifically controls scrub priority. It actually controls the I/O priority of the OSD disk thread generally, which handles scrubs and other background operations like snap trimming. Updated the section description to clarify this.

5. **Conservative profile adjustment**: Updated the conservative profile sleep value from 0.2 (shallow) + 1.0 (deep, non-existent param) to a single `osd_scrub_sleep` of 0.5, which provides meaningful throttling for both scrub types.

## Review Notes
- The `osd_disk_thread_ioprio_class` and `osd_disk_thread_ioprio_priority` settings only take effect when the Linux CFQ I/O scheduler is in use. Modern kernels (5.0+) default to mq-deadline or none (for NVMe), where these settings have no effect. A note about this was added to the command comments.
- When mClock scheduler is enabled in Ceph (default in Reef+), `osd_scrub_sleep` is ignored as mClock handles I/O scheduling internally. This is not mentioned in the post but could be relevant for newer Ceph deployments.
- The `osd_scrub_sleep` parameter defaults are correct (0 seconds), as are `osd_max_scrubs` (1), `osd_scrub_chunk_min` (5), and `osd_scrub_chunk_max` (25).
