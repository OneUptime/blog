# Validation Summary: How to Configure GlusterFS with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- GlusterFS
- IPv6
- Linux networking
- `gluster` CLI
- FUSE / `mount.glusterfs`
- `ip6tables`

## Sources Consulted
- Gluster Quick Start Guide: https://docs.gluster.org/en/latest/Quick-Start-Guide/Quickstart/
- Gluster CLI Reference: https://docs.gluster.org/en/latest/CLI-Reference/cli-main/
- Gluster Administrator Guide, Setting Up Clients: https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Clients/
- Gluster Administrator Guide, Tuning Volume Options: https://docs.gluster.org/en/latest/Administrator-Guide/Tuning-Volume-Options/
- Upstream `mount.glusterfs` man page: https://raw.githubusercontent.com/gluster/glusterfs/devel/doc/mount.glusterfs.8
- Upstream mount helper implementation: https://raw.githubusercontent.com/gluster/glusterfs/devel/xlators/mount/fuse/utils/mount.glusterfs.in
- Upstream `glusterd.vol` template: https://raw.githubusercontent.com/gluster/glusterfs/devel/extras/glusterd.vol.in
- Gluster 8.0 release notes: https://docs.gluster.org/en/main/release-notes/8.0/
- Gluster 6.0 release notes: https://docs.gluster.org/en/main/release-notes/6.0/

## Issues Found
- The direct IPv6 mount example used bracket notation (`[2001:db8::10]:/myvol`), but Gluster's mount helper expects the source in `SERVER:/VOLNAME` form. I changed it to `2001:db8::10:/myvol`.
- The `auth.allow` example used `2001:db8:clients::/48`, which is not a valid IPv6 prefix. I replaced it with the valid documentation prefix `2001:db8:100::/48`.
- The volume creation section described `replica 3` with three bricks as "distributed-replicated", but that command creates a replicate volume. I corrected the wording.
- The peer status example assumed Gluster would display IPv6 literals in parentheses. Upstream examples do not guarantee that format. I simplified the expected output and added the hostname back-probe note that upstream documents for consistent hostname recording.
- The listener guidance implied IPv6 would show up by default and suggested `GLUSTERD_OPTIONS=\"--bind-address ...\"`. I replaced that with the upstream `glusterd.vol` settings: `transport.address-family` and `transport.socket.bind-address`.
- The firewall section used the older `24008:24107` brick port range and an incorrect RDMA example on port `24011`. I updated it to current upstream guidance: management ports `24007` and `24008`, plus the configured brick port range (`49152:60999` in the default template for modern Gluster).

## Review Notes
- `transport.address-family` is present upstream but not prominently documented in the public admin guide, so I cross-checked it in the current upstream source and templates before keeping that section.
- Brick-port behavior differs across older and newer Gluster releases. The post now reflects current upstream guidance for Gluster 10+ style randomized brick ports and the default `glusterd.vol` template.
