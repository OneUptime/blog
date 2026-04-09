# Validation Summary: How to Dump Ceph Cluster Configuration in Full

## Status
validated

## Post Type
Reference / Admin Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph CLI (`ceph config`, `ceph daemon`, `ceph tell`)
- Rook (Ceph operator for Kubernetes, referenced in tags)
- Ceph centralized configuration store (monitor key-value store)

## Sources Consulted
- Ceph official documentation — Configuring Ceph: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Ceph blog — "New in Mimic: centralized configuration management": https://ceph.io/en/news/blog/2018/new-mimic-centralized-configuration-management/
- Ceph OSD Config Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph man page — `ceph` administration tool: https://docs.ceph.com/en/reef/man/8/ceph/
- CVE-2021-20288 documentation (for `auth_allow_insecure_global_id_reclaim`): https://docs.ceph.com/en/latest/security/CVE-2021-20288/

## Issues Found

1. **Incorrect version attribution for centralized config store**: The post stated "Since Ceph Nautilus" but centralized configuration management was introduced in Ceph Mimic (June 2018), not Nautilus (March 2019). Changed "Nautilus" to "Mimic".

2. **Missing RO column in `ceph config dump` sample output**: The actual output of `ceph config dump` includes six columns: WHO, MASK, LEVEL, OPTION, VALUE, and RO (read-only). The sample output was missing the RO column. Added it to the sample.

3. **Misleading explanation of runtime vs. stored config differences**: The post stated "a `ceph config set` was applied without persisting" which is incorrect — `ceph config set` always persists to the monitor store. The non-persistent mechanisms are `ceph tell ... injectargs` and `ceph daemon ... config set`. Updated the explanation to correctly describe the ephemeral override mechanisms.

## Review Notes
- All nine CLI commands in the post are syntactically correct and use valid Ceph syntax.
- `osd_max_write_size` is a real Ceph option (default 90 MB) and is not deprecated.
- `auth_allow_insecure_global_id_reclaim` is a real option related to CVE-2021-20288.
- The post tags mention "Rook" but the content is purely about Ceph CLI commands, not Rook-specific operations. This is not an error per se, as these commands are commonly run within Rook toolbox pods.
