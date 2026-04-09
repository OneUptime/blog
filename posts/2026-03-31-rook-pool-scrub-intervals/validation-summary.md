# Validation Summary: How to Configure Scrubbing Intervals for Pools in Ceph

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, ConfigMap)
- Ceph OSD scrubbing subsystem

## Sources Consulted
- [Ceph OSD Config Reference (Reef)](https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/)
- [Ceph Pools Documentation](https://docs.ceph.com/en/reef/rados/operations/pools/)
- [Ceph source code - osd.yaml.in (Reef branch)](https://github.com/ceph/ceph/blob/reef/src/common/options/osd.yaml.in)
- [Ceph source code - osd.yaml.in (main branch)](https://github.com/ceph/ceph/blob/main/src/common/options/osd.yaml.in)
- [Rook Ceph Configuration Documentation](https://rook.io/docs/rook/v1.12/Storage-Configuration/Advanced/ceph-configuration/)
- [Red Hat Ceph Storage Scrubbing Options](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/configuration_guide/ceph-scrubbing-options_conf)

## Issues Found
1. **Incorrect default value for `osd_max_scrubs`**: The blog post stated `(default: 1)` in a comment next to the `osd_max_scrubs` configuration. The actual default in Ceph Reef and later versions is **3**, not 1. The default of 1 was from much older Ceph releases. Fixed the comment to read `(default: 3)`.

## Review Notes
- The post does not specify which Ceph version it targets. All commands and parameters are valid for Ceph Reef (the current stable release commonly used with Rook).
- The `rook-config-override` ConfigMap section does not mention that OSD pods need to be restarted after applying the ConfigMap for changes to take effect. This is documented in the Rook docs but omitted here. Not a technical error in the commands, but users may be surprised when settings don't apply immediately.
- The `osd_scrub_load_threshold` value of 0.5 used in the examples matches the Reef default. On the Ceph main branch (Squid+), this default has been raised to 10.0, so this value may need revisiting for future Ceph releases.
- The `ceph pg dump | grep "last_scrub"` command works but output format varies by Ceph version. Users may need to adjust parsing for their specific version.
- All second-to-time conversions in the post are mathematically correct (43200 = 12h, 259200 = 3d, 1209600 = 14d, 86400 = 1d, 604800 = 7d).
