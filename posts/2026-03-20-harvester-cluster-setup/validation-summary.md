# Validation Summary: How to Set Up Harvester Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- RKE2
- Longhorn
- KubeVirt
- Kubernetes
- `kubectl`
- `systemd` / `timedatectl`

## Sources Consulted
- Harvester Hardware and Network Requirements: https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester ISO Installation: https://docs.harvesterhci.io/v1.7/install/
- Harvester Configuration reference: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Deploy a High-Availability Cluster: https://docs.harvesterhci.io/v1.6/getting-started/deploy-ha-cluster/
- Harvester Host Management: https://docs.harvesterhci.io/v1.7/host/
- Harvester Settings reference: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester Update Harvester Configuration After Installation: https://docs.harvesterhci.io/v1.7/install/update-harvester-configuration/
- Harvester VM Backup, Snapshot & Restore: https://docs.harvesterhci.io/v1.7/vm/backup-restore/
- Harvester Live Migration: https://docs.harvesterhci.io/v1.7/vm/live-migration/
- RKE2 documentation (kubeconfig and server roles references consulted where relevant): https://docs.rke2.io/

## Issues Found
- The introduction and conclusion overstated VM high availability during an unexpected node failure. I corrected the wording to match Harvester's documented behavior: the management plane remains highly available with three management nodes, while VMs on a failed node are restarted or rescheduled according to Harvester settings instead of being live-migrated in place.
- The prerequisites listed a same-L2/VXLAN requirement that is not documented as a general Harvester installation prerequisite. I replaced it with the documented requirement that matching CPU specifications are needed if you plan to use live migration.
- The installation examples omitted the required disk selection flow shown in the current installer. I updated the examples to use `Installation Disk` and `Data Disk`, and I added `Role: Default Role` to the join-node examples because the join workflow requires role selection.
- The join-node `Server URL` examples did not use the documented default `https://<VIP>:443` form. I updated both examples to include `:443`.
- The cluster verification example used a stale expected `kubectl get nodes` output with deprecated/version-specific details (`master` role and `v1.27.x`). I removed the brittle output block and kept the version-agnostic readiness check.
- The NTP section instructed readers to edit `/etc/systemd/timesyncd.conf` on each node. Current Harvester documentation for v1.2.0+ explicitly says not to modify node-local NTP configuration files directly and to use the cluster-wide `ntp-servers` setting instead, so I replaced the commands accordingly.
- The HA validation step assumed checking `ip addr` on nodes and gave a fixed `30-60 seconds` VIP migration claim. I replaced it with a direct API reachability test through the VIP using `curl -fk https://<VIP>/version`, which aligns better with Harvester's troubleshooting guidance and avoids an unsupported timing guarantee.

## Review Notes
- The cluster sizing table is opinionated but not in conflict with Harvester's documented production minimums. The `3 nodes / 64 GB / 1 TB` recommendation is stricter than the published minimum storage requirement and is acceptable as conservative guidance.
- The backup target and SSL certificate steps are directionally correct, but the exact UI labels can vary slightly by Harvester release. The underlying settings and capabilities are current.
