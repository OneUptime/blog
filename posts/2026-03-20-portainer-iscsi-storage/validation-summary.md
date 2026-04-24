# Validation Summary: How to Set Up iSCSI Storage with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker volumes and Compose/stack files
- iSCSI
- Open-iSCSI (`iscsiadm`, `iscsid`, `iscsid.conf`)
- `targetcli-fb` / LIO target configuration
- TrueNAS iSCSI shares
- PostgreSQL container storage

## Sources Consulted
- Docker Docs: `docker volume create` reference - https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Compose volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Compose `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Volumes - https://docs.portainer.io/user/docker/volumes
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Open-iSCSI upstream README - https://github.com/open-iscsi/open-iscsi
- Open-iSCSI upstream default `iscsid.conf` - https://github.com/open-iscsi/open-iscsi/blob/master/etc/iscsid.conf
- Debian manpage: `targetcli(8)` - https://manpages.debian.org/unstable/targetcli-fb/targetcli.8.en.html
- Debian manpage: `iscsi-gen-initiatorname(8)` - https://manpages.debian.org/unstable/open-iscsi/iscsi-gen-initiatorname.8.en.html
- Debian manpage: `iscsi-iname(8)` - https://manpages.debian.org/testing/open-iscsi/iscsi-iname.8.en.html
- Debian package file list: `open-iscsi` - https://packages.debian.org/sid/amd64/open-iscsi/filelist
- Debian package file list: `python3-rtslib-fb` - https://packages.debian.org/sid/all/python3-rtslib-fb/filelist
- TrueNAS Docs: Block Shares (iSCSI) - https://cdn.truenas.com/docs/scale/scaletutorials/shares/iscsi/
- TrueNAS Docs: Adding iSCSI Block Shares - https://cdn.truenas.com/docs/scale/shares/iscsi/addingiscsishares/
- RFC 7143: iSCSI Protocol - https://www.rfc-editor.org/rfc/rfc7143

## Issues Found
- The `targetcli` example created an explicit `0.0.0.0:3260` portal even though `targetcli` creates a default portal automatically when the target is created. I removed the redundant portal command to avoid duplicate-portal failures.
- The ACL-based `targetcli` example did not create an ACL-to-LUN mapping. `targetcli(8)` documents that when ACLs are used, a LUN mapping must be created under the ACL. I added the missing `create 0 0` mapping step.
- The initiator-name snippet wrote a literal `$(hostname)` into `/etc/iscsi/initiatorname.iscsi` because the heredoc was single-quoted. I replaced it with an explicit IQN example that produces a valid value.
- The post overwrote `/etc/iscsi/iscsid.conf` with a short heredoc, which is heavier than necessary and can discard the vendor default config structure. I changed this to targeted `sed` updates against the documented default keys and restarted `iscsid`.
- The disk-partitioning commands used interactive `parted` invocations. I switched them to `parted -s` so the commands run non-interactively as written.
- The Docker volume section created the bind-backed volume before creating the host directory. I reversed that order so the bind source exists first on the Docker host that will run the database.
- The Compose snippet used the top-level `version: '3.8'` field, which Docker now marks as obsolete. I removed it.
- The benchmark section compared iSCSI storage against `/tmp` without forcing data flush on the host-side test, which can produce misleading results. I changed both `dd` examples to use `conv=fdatasync` and switched the local-disk example to `/var/tmp`.
- The introduction and conclusion made overly broad claims that iSCSI is simply “higher performance than NFS” and that it “eliminates file system overhead.” I qualified those statements and clarified that the host still formats and mounts a filesystem locally.
- The original wording implied multi-host use of a single ext4-formatted iSCSI LUN. I tightened the scope to a Docker host / separate-LUN-per-host model and added a caveat that shared read-write use requires a cluster-aware filesystem.
- The TrueNAS GUI path was outdated relative to current TrueNAS docs. I updated it to the current `Shares > Block (iSCSI) Shares` flow.

## Review Notes
- The post is now technically consistent for a Docker standalone or fixed-node Portainer deployment.
- If this is adapted for Docker Swarm or another multi-node scheduler, the Docker `local` driver remains host-local. In that case you would typically need node placement constraints or a storage driver designed for shared storage semantics.
