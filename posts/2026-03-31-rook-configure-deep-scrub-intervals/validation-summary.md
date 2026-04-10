# Validation Summary: How to Configure Deep Scrubbing Intervals in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD deep scrubbing configuration)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for Rook toolbox access)

## Sources Consulted
- Ceph OSD Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph OSD Config Reference (Latest): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph CLI man page (ceph(8)): https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Red Hat Ceph Storage 6 Scrubbing Options: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/configuration_guide/ceph-scrubbing-options_conf
- Ceph source code (src/common/options.cc) and PR #6550 for randomize ratio default

## Issues Found
1. **Incorrect default for `osd_deep_scrub_randomize_ratio`**: The post stated the default was 0.5, but the actual default is 0.15. The value 0.5 is the default for the similarly-named but different parameter `osd_scrub_interval_randomize_ratio`. Also improved the description from "Randomization to prevent thundering herd" to "Ratio of shallow scrubs randomly promoted to deep scrubs" for accuracy — this parameter controls the fraction of shallow scrubs that are randomly converted into deep scrubs, not a timing randomization.

2. **Non-existent parameter `osd_deep_scrub_sleep`**: The post referenced `osd_deep_scrub_sleep`, which does not exist in Ceph. The correct parameter is `osd_scrub_sleep`, which adds sleep between scrub chunk operations and applies to both shallow and deep scrubs. Fixed the command and the summary section reference.

3. **Invalid command `ceph osd pool scrub my-pool --deep`**: The `--deep` flag does not exist for the `ceph osd pool scrub` command. Deep scrubbing a pool uses a separate command: `ceph osd pool deep-scrub <pool-name>`. Fixed to `ceph osd pool deep-scrub my-pool`.

## Review Notes
- The `osd_scrub_chunk_max` and `osd_scrub_chunk_min` parameters are documented as not applicable to deep scrubs in some Ceph versions. The post uses them in a "Limiting Deep Scrub I/O Impact" section, which is slightly misleading — they primarily affect shallow scrub chunk sizes. However, since the section also covers `osd_scrub_sleep` which does apply to deep scrubs, this is a minor framing issue rather than a technical error.
- The `osd_scrub_sleep` parameter is ignored when the mClock scheduler is enabled (default in newer Ceph versions like Reef+). This is worth noting for readers using recent Ceph releases.
- The `pg dump` column positions referenced in awk commands may vary across Ceph versions; users should verify column indices for their specific version.
