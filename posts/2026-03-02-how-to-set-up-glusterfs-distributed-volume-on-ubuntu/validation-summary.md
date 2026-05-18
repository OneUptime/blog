# Validation Summary: How to Set Up GlusterFS Distributed Volume on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GlusterFS (version 10, via Launchpad PPA)
- Ubuntu (apt, software-properties-common, add-apt-repository)
- XFS filesystem (mkfs.xfs)
- systemd (glusterd service management)
- ufw (firewall configuration)
- GlusterFS FUSE client (mount -t glusterfs)
- /etc/fstab persistent mounts

## Sources Consulted
- GlusterFS official documentation: https://docs.gluster.org/
- Setting Up Clients: https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Clients/
- Managing Volumes: https://docs.gluster.org/en/latest/Administrator-Guide/Managing-Volumes/
- Performance Tuning: https://docs.gluster.org/en/main/Administrator-Guide/Performance-Tuning/
- Monitoring Workload: https://docs.gluster.org/en/main/Administrator-Guide/Monitoring-Workload/
- Troubleshooting Self-heal: https://docs.gluster.org/en/main/Troubleshooting/troubleshooting-afr/
- Launchpad Gluster PPAs: https://launchpad.net/~gluster

## Issues Found
- **Misleading heal commands on a pure distribute volume.** The "Monitoring Volume Health" section ran `gluster volume heal gvol0 info` and `... split-brain` against the distribute volume created in this guide. The self-heal daemon only operates on replicated/dispersed volumes; these commands fail on a pure distribute volume with `Volume gvol0 is not of type replicate/disperse`. The original parenthetical "(relevant for replicated volumes too)" implied they also worked here. Replaced the live commands with a comment block that explains the constraint and shows the commands for reference, so users following the guide don't see a confusing error.

## Review Notes
- The PPA `ppa:gluster/glusterfs-10` is valid and still maintained on Launchpad. `glusterfs-11` is also available — users who want a newer release may prefer it, but version 10 is a reasonable, supported choice.
- Port 24008/TCP is sometimes referenced in older GlusterFS docs (RDMA / management). For a pure TCP setup as described here, only 24007 + the brick port range is required, matching what the post shows.
- Performance tuning values (cache-size 512MB, write-behind-window-size 64MB, io-thread-count 32) are valid but workload-dependent. The defaults (io-thread-count=16, cache-size=32MB) are conservative; the values shown are reasonable for a moderately busy server but should be benchmarked rather than copied blindly.
- `mkfs.xfs /dev/sdb -f` will work, but the GlusterFS docs recommend `-i size=512 -n size=8192` for XFS bricks to improve metadata handling. Not incorrect as written, just not optimal.
- The `chown -R root:root /data/gluster` line is a no-op on a fresh system (root:root is already the default) but is harmless.
