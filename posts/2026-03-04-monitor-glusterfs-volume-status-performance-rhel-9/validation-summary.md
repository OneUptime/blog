# Validation Summary: How to Monitor GlusterFS Volume Status and Performance on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- GlusterFS
- GlusterFS CLI
- GlusterFS volume profiling
- GlusterFS self-heal monitoring
- Linux shell commands

## Sources Consulted
- GlusterFS Administrator Guide: Monitoring Workload: https://docs.gluster.org/en/latest/Administrator-Guide/Monitoring-Workload/
- GlusterFS Troubleshooting Guide: Statedump: https://docs.gluster.org/en/main/Troubleshooting/statedump/
- GlusterFS Troubleshooting Guide: Heal info and split-brain resolution: https://docs.gluster.org/en/main/Troubleshooting/resolving-splitbrain/
- GlusterFS Administrator Guide: Logging: https://docs.gluster.org/en/latest/Administrator-Guide/Logging/
- GlusterFS Administrator Guide: Tuning Volume Options: https://docs.gluster.org/en/latest/Administrator-Guide/Tuning-Volume-Options/
- gluster(8) command reference packaged with GlusterFS 11.2: https://man.archlinux.org/man/gluster.8.en
- Red Hat Gluster Storage Life Cycle: https://access.redhat.com/support/policy/updates/rhs

## Issues Found
- The `gluster volume status repvol mem` description said it shows memory usage for each brick and NFS/self-heal daemon process. The documented status option reports memory usage and memory pool details for bricks unless a specific process target is requested, so the wording was narrowed to brick processes.
- The `gluster volume heal repvol info heal-failed` comment described files currently being healed. That is inaccurate; `heal-failed` reports entries where healing failed, while `info summary` is the command that includes currently healing counts. The comment was corrected.
- The statedump section assumed statedump files could be found with `ls /var/run/gluster/`. Current GlusterFS troubleshooting documentation recommends `gluster --print-statedumpdir` to identify the configured statedump directory. The command was updated.

## Review Notes
The GlusterFS monitoring commands, profiling commands, top commands, log paths, and diagnostic log-level options are consistent with upstream GlusterFS documentation. Red Hat Gluster Storage reached end of life on December 31, 2024, so RHEL users should confirm package source and support status before relying on this in a supported Red Hat production environment.
