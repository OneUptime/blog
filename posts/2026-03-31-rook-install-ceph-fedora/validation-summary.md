# Validation Summary: How to Install Ceph on Fedora

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- Fedora Linux 40+
- cephadm (Ceph deployment tool)
- DNF package manager
- Loop devices for OSD backing storage
- RADOS (Reliable Autonomic Distributed Object Store)
- Podman (container runtime used by cephadm)

## Sources Consulted
- Ceph official release naming and versioning: Quincy (17.x), Reef (18.x), Squid (19.x)
- Ceph documentation for cephadm bootstrap flags (`--single-host-defaults`, `--mon-ip`, `--allow-fqdn-hostname`)
- Ceph documentation for `ceph orch daemon add osd` syntax
- Ceph documentation for `rados put`/`rados get` CLI usage
- Fedora package repositories for Ceph package availability (`ceph`, `ceph-mgr`, `ceph-mon`, `ceph-osd`, `ceph-radosgw`, `cephadm`)
- Ceph download site URL conventions (`https://download.ceph.com/rpm-{codename}/{distro}/{arch}/`)
- Linux `losetup`, `truncate`, and `wipefs` man pages

## Issues Found
- **Incorrect Ceph Squid version number**: The post stated "Ceph Squid (18.x)" but Squid is version 19.x. Version 18.x is Ceph Reef. Fixed the comment in the repository configuration block from `# For Ceph Squid (18.x)` to `# For Ceph Squid (19.x)`.

## Review Notes
- The `$LOOP` variable used in the Cleanup section may not be set if the user is running cleanup in a new shell session. Step 5 shows how to re-derive it with `losetup -j`, but the cleanup section assumes it is already set. This is a minor usability concern, not a technical error.
- The official Ceph project has historically been inconsistent about providing Fedora-specific RPM repositories at `download.ceph.com`. Users may find that the Fedora repo URL does not have packages for all Ceph releases. The post correctly offers Fedora's own repos as the primary option and the Ceph repo as an alternative.
- The `--single-host-defaults` flag is correctly described — it adjusts default replica counts and other settings for single-node development clusters.
- All `rados`, `ceph`, `cephadm`, `losetup`, `truncate`, and `wipefs` commands use correct syntax and flags.
- The expected `ceph -s` output shown is representative for a single-node dev cluster and correctly shows HEALTH_WARN status.
