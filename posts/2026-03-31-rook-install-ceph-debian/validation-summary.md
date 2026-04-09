# Validation Summary: How to Install Ceph on Debian

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Squid / 19.x)
- cephadm (Ceph cluster bootstrapping and orchestration tool)
- Debian 12 (Bookworm)
- Ceph RADOS Gateway (RGW) for S3-compatible object storage
- APT package management

## Sources Consulted
- Ceph official release list: https://docs.ceph.com/en/latest/releases/
- Cephadm install documentation: https://docs.ceph.com/en/latest/cephadm/install/
- Cephadm bootstrap documentation: https://docs.ceph.com/en/latest/cephadm/host-management/
- Ceph OSD management via orchestrator: https://docs.ceph.com/en/latest/cephadm/services/osd/
- Ceph RGW deployment via cephadm: https://docs.ceph.com/en/latest/cephadm/services/rgw/

## Issues Found

1. **Incorrect Ceph Squid version number**: The post stated "Ceph Squid (18.x)" but Squid is version 19.x. Version 18.x is Ceph Reef. Fixed the comment to "Ceph Squid (19.x)".

2. **Incorrect scope for repository setup ("On all nodes")**: When using `cephadm`, the Ceph APT repository only needs to be added on the admin/bootstrap node. `cephadm` handles deploying daemons to other nodes via SSH and containers. Changed to "On the admin/bootstrap node".

3. **Unnecessary daemon package installation on all nodes**: The post instructed installing `ceph ceph-mgr ceph-mon ceph-osd ceph-mds radosgw` on all nodes. With `cephadm`, daemons are deployed as containers — manual installation of these packages is not needed. Replaced with installing only `cephadm` and `ceph-common` on the admin node.

4. **Inaccurate Debian version coverage claim**: The overview claimed coverage of "Debian 11 (Bullseye) and Debian 12 (Bookworm)" but the repository configuration only showed Bookworm, and Ceph Squid packages target Debian 12. Narrowed to "Debian 12 (Bookworm)".

5. **Missing `mkdir -p /etc/apt/keyrings/`**: The `/etc/apt/keyrings/` directory may not exist on all systems. Added the `mkdir -p` command before writing the GPG key file.

6. **Missing `-f` flag on `ssh-copy-id`**: The official Ceph documentation specifies `ssh-copy-id -f -i /etc/ceph/ceph.pub` when distributing the cluster SSH key. Added the `-f` flag.

7. **`radosgw-admin` not available directly on host**: In a `cephadm`-managed cluster, `radosgw-admin` is not installed on the host by default — it runs inside the Ceph container. Prefixed the `radosgw-admin` commands with `cephadm shell --` so they execute inside the container environment.

8. **Misleading "native services" claim in summary**: The original summary stated systemd handles daemons "as native services", but `cephadm` deploys daemons in containers managed by systemd unit files. Reworded to clarify daemons run as containers managed by systemd.

## Review Notes
- The post's overall structure and workflow (bootstrap → add hosts → add OSDs → verify) is correct for the `cephadm` approach.
- The `cephadm bootstrap` flags (`--mon-ip`, `--initial-dashboard-user`, `--initial-dashboard-password`) are valid.
- The RGW realm/user creation commands are correct for basic setup, though realm configuration is primarily needed for multisite deployments.
- Other nodes in the cluster need Python 3, systemd, Podman or Docker, time synchronization, and LVM2 installed — the post does not enumerate these prerequisites for non-bootstrap nodes, but this is a minor omission.
