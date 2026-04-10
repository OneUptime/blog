# Validation Summary: How to Configure the Crash Module in Ceph Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (Storage Cluster)
- Ceph Manager (mgr) crash module
- Ceph CLI (`ceph crash` command family)
- Ceph telemetry module (crash channel)
- Rook (mentioned in tags, not directly in content)

## Sources Consulted
- Ceph official documentation — Crash Module: https://docs.ceph.com/en/latest/mgr/crash/
- Ceph official documentation — Telemetry Module: https://docs.ceph.com/en/latest/mgr/telemetry/
- Ceph official documentation — Manager Modules: https://docs.ceph.com/en/latest/mgr/

## Issues Found

1. **Crash module described as needing manual enablement (WRONG)**
   - **What was wrong:** The post included a section "Enabling the Crash Module" with `ceph mgr module enable crash`, implying the module must be manually enabled.
   - **What was changed:** Rewritten to clarify the crash module is always-on by default and cannot be disabled. Removed the incorrect `ceph mgr module enable crash` command.
   - **Why:** Per official Ceph documentation, the crash module is an "always-on" module that cannot be disabled.

2. **`ceph crash stat` output description was incorrect**
   - **What was wrong:** The post described `ceph crash stat` as showing "crash frequency by module."
   - **What was changed:** Corrected to "saved crash reports grouped by age," which matches the official documentation.
   - **Why:** The official docs state the command shows "a summary of saved crash info grouped by age," not by module.

3. **Telemetry channel configuration used non-standard syntax**
   - **What was wrong:** The post used `ceph config set mgr mgr/telemetry/channel_crash true` to enable the crash telemetry channel.
   - **What was changed:** Replaced with the official documented command `ceph telemetry enable channel crash`. Also noted that the crash channel is on by default when telemetry is enabled.
   - **Why:** The official Ceph documentation recommends using `ceph telemetry enable channel crash` rather than directly setting the mgr config option.

4. **Missing default values for retention config options**
   - **What was wrong:** The `warn_recent_interval` and `retain_interval` options were listed without their default values, which could mislead readers about what they're changing.
   - **What was changed:** Added default values: `warn_recent_interval` defaults to 1209600 seconds (2 weeks), `retain_interval` defaults to 31536000 seconds (1 year).
   - **Why:** Knowing the defaults helps operators make informed decisions about customization.

## Review Notes
- The example `ceph crash stat` output in the post ("8 crashes recorded / 1 crashes are new") is a reasonable approximation but the actual output format groups crashes by age buckets. The simplified output was left as-is since it conveys the general idea.
- The post's tags include "Rook" but the content is purely about the Ceph crash module CLI, not Rook-specific configuration. This is acceptable since Rook users manage Ceph clusters and would find this content relevant.
- The `ceph crash ls` example output format is illustrative rather than exact, but conveys the key information (crash ID, entity, new status) accurately.
