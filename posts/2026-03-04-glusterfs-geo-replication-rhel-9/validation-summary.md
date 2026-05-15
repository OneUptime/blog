# Validation Summary: How to Configure GlusterFS Geo-Replication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Gluster Storage
- GlusterFS geo-replication
- RHEL
- SSH
- Disaster recovery and failover/failback

## Sources Consulted
- Red Hat Gluster Storage 3.5 Administration Guide, Managing Geo-replication: https://docs.redhat.com/en/documentation/red_hat_gluster_storage/3.5/html/administration_guide/sect-starting_geo-replication
- Red Hat Gluster Storage 3.5 Administration Guide, Disaster Recovery: https://docs.redhat.com/en/documentation/red_hat_gluster_storage/3.5/html/administration_guide/sect-disaster_recovery
- Red Hat Gluster Storage Life Cycle: https://access.redhat.com/support/policy/updates/rhs
- GlusterFS Administrator Guide, Geo Replication: https://docs.gluster.org/en/main/Administrator-Guide/Geo-Replication/

## Issues Found
- The post implied this was a supported RHEL 9 procedure. Added a support note explaining that Red Hat Gluster Storage reached end of life on December 31, 2024, that 3.5 was the final supported series, and that this is not a supported new Red Hat Gluster Storage deployment on RHEL 9.
- The Step 3 "sync interval" example used `config checkpoint now`, which sets a checkpoint rather than a sync interval. Replaced it with a command to view geo-replication session configuration.
- The tar-over-SSH configuration used `use-tarssh true`. For Red Hat Gluster Storage 3.5, the documented option is `sync_method tarssh`; updated the command and explanation.
- The log level example used `log-level`; Red Hat Gluster Storage 3.5 documents geo-replication config options with underscores, so this was changed to `log_level`.
- The status output field descriptions included `Files Synced` and `Files Pending`, which do not match documented `status detail` output. Replaced them with `Entry`, `Data`, `Meta`, and `Failures`, and clarified crawl status values.
- The checkpoint verification text said to look for "Checkpoint Status" and "Completed". Updated it to "Checkpoint Completed" and "Yes", matching the documented status detail fields.
- The failover procedure only stopped geo-replication and mounted the slave. Updated it to disable read-only mode and enable `geo-replication.indexing` and `changelog` on the promoted slave, as documented for failover.
- The failback procedure omitted the forced stop, reverse-session `force`, `special-sync-mode recover`, `gfid-conflict-resolution false`, checkpoint verification, and reset of failover options. Added the missing commands while keeping the original section structure.
- The troubleshooting section referenced "Files pending"; updated it to match the documented pending `Entry`, `Data`, and `Meta` counters.

## Review Notes
The commands are valid for legacy Red Hat Gluster Storage 3.5-style deployments and broadly align with upstream GlusterFS geo-replication concepts. Future revisions should consider renaming the post away from "RHEL 9" or positioning it explicitly as legacy/community GlusterFS guidance, because Red Hat Gluster Storage is no longer supported by Red Hat.
