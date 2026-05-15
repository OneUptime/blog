# Validation Summary: How to Set Up a GlusterFS Replicated Volume for High Availability on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Gluster Storage
- GlusterFS replicated volumes
- GlusterFS quorum
- GlusterFS self-heal
- XFS
- Linux systemd

## Sources Consulted
- Gluster Docs: Setting Up Volumes, https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Volumes/
- Gluster Docs: Arbiter volumes and quorum options, https://docs.gluster.org/en/latest/Administrator-Guide/arbiter-volumes-and-quorum/
- Gluster Docs: Setting Up Clients, https://docs.gluster.org/en/v3/Administrator%20Guide/Setting%20Up%20Clients/
- Gluster Docs: Managing Volumes, https://docs.gluster.org/en/main/Administrator-Guide/Managing-Volumes/
- Gluster Docs: Automatic File Replication, https://docs.gluster.org/en/main/Administrator-Guide/Automatic-File-Replication/
- Gluster Docs: Performance Tuning, https://docs.gluster.org/en/main/Administrator-Guide/Performance-Tuning/
- Gluster Docs: Tuning Volume Options, https://docs.gluster.org/en/main/Administrator-Guide/Tuning-Volume-Options/
- Gluster Docs: Managing the glusterd Service, https://docs.gluster.org/en/main/Administrator-Guide/Start-Stop-Daemon/
- Red Hat Gluster Storage Life Cycle, https://access.redhat.com/support/policy/updates/rhs
- Red Hat Enterprise Linux 9 Package Manifest, https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf

## Issues Found
- The prerequisites did not mention that Red Hat Gluster Storage reached end of life on December 31, 2024. Added a RHEL 9 support-path caveat so readers do not assume a currently supported Red Hat Gluster Storage deployment.
- The server-side quorum description incorrectly described it as per-replica write quorum. Updated it to explain that server quorum is trusted-pool management quorum and can stop participating brick processes on nodes that lose quorum.
- The client-side quorum description was tightened to identify it as the I/O-path split-brain protection for replica volumes.
- The failover test said `systemctl stop glusterd` stops the brick. Stopping `glusterd` alone may leave existing `glusterfsd` brick processes running, so the test now explicitly kills the brick process after stopping `glusterd`.
- The arbiter volume example used the older `replica 3 arbiter 1` syntax. Updated it to the current documented `replica 2 arbiter 1` form.
- The performance tuning section described `cluster.read-hash-mode 1` as round-robin reads. Gluster documents mode `1` as GFID hashing, so the comment was corrected.
- The eager-lock example used `enable`; Gluster's documented value for `cluster.eager-lock` is `on`, so the command was updated.

## Review Notes
The core replicated-volume creation, start, mount, fstab, backup volfile server, heal, metadata-cache, and volume info commands are consistent with Gluster documentation. For future revisions, consider adding explicit package installation and firewall steps for the specific RHEL-compatible package source being used.
