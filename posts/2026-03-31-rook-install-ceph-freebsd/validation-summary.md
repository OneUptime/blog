# Validation Summary: How to Install Ceph on FreeBSD

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Ceph (distributed storage system)
- FreeBSD 14.x
- FreeBSD Ports collection and pkg package manager
- ceph-authtool, ceph-mon, ceph-osd, monmaptool CLI tools
- FreeBSD rc.d service management

## Sources Consulted
- FreeBSD 14.0-RELEASE Release Notes (https://www.freebsd.org/releases/14.0R/relnotes/) — confirmed portsnap removal
- FreshPorts net/ceph (https://www.freshports.org/net/ceph) — confirmed port deletion
- FreshPorts net/ceph14 (https://www.freshports.org/net/ceph14/) — confirmed port deletion (2023-10-31)
- Ceph Manual Deployment on FreeBSD (https://docs.ceph.com/en/reef/install/manual-freebsd-deployment/) — rc.d service names, bsdrc marker, config paths
- Ceph Manual Deployment Documentation (https://docs.ceph.com/en/latest/install/manual-deployment/) — monmaptool step, monitor bootstrap sequence
- Ceph README.FreeBSD on GitHub (https://github.com/ceph/ceph/blob/main/README.FreeBSD) — build-from-source instructions
- Ceph Luminous Release Notes — confirmed `ceph osd create` deprecation in favor of `ceph osd new`

## Issues Found

1. **Critical: Ceph package/port no longer exists in FreeBSD** — The post instructed users to run `pkg install -y ceph` and offered a ports-based alternative via `cd /usr/ports/net/ceph`. Both `net/ceph` and `net/ceph14` were deleted from the FreeBSD ports tree (ceph14 deleted 2023-10-31). Replaced entire Step 2 with build-from-source instructions referencing `README.FreeBSD` and `do_freebsd.sh`.

2. **Critical: `portsnap fetch extract` removed from FreeBSD 14.x** — `portsnap(8)` was removed in FreeBSD 14.0-RELEASE. The ports-based installation section that used `portsnap` was replaced with build-from-source instructions using `git clone`.

3. **Major: Missing monmaptool step** — The `ceph-mon --mkfs` command referenced `--monmap /tmp/monmap`, but the post never showed how to create the monmap. Added `monmaptool --create --add ... --fsid ... /tmp/monmap` step, and also added the `ceph-authtool --import-keyring` step to merge the admin key into the monitor keyring.

4. **Major: Wrong rc.conf variables and service names** — The post used fabricated `ceph_mon_enable`, `ceph_osd_enable`, `ceph_mds_enable` variables and `service ceph-mon`/`service ceph-osd` service names. FreeBSD uses a single `ceph_enable="YES"` variable and a unified `service ceph start mon.{name}` / `service ceph start osd.{id}` interface. Also added the required `bsdrc` marker file for OSDs.

5. **Major: Admin keyring path inconsistency** — Step 4 used Linux path `/etc/ceph/ceph.client.admin.keyring` while Step 3 correctly used `/usr/local/etc/ceph/`. Fixed to consistently use `/usr/local/etc/ceph/` and added a symlink creation step (`ln -s /usr/local/etc/ceph /etc/ceph`) for compatibility.

6. **Moderate: `fsid = $(uuidgen)` in ceph.conf** — Shell command substitution does not work inside a static INI configuration file. Replaced with a separate `uuidgen` step instructing users to paste the generated UUID into the config, using `<paste-your-generated-uuid-here>` as a placeholder.

7. **Moderate: Removed FileStore-specific config** — The `[osd]` section with `osd journal size` and `osd data` directives was FileStore-specific. FileStore was fully removed in Ceph Reef (v18.2). Removed the entire `[osd]` section since modern Ceph uses BlueStore by default and these settings are no longer valid.

## Review Notes
- The `ceph osd create` command in Step 5 is deprecated (replaced by `ceph osd new` since Ceph Luminous). However, the official Ceph FreeBSD documentation still uses it, and the manual OSD setup workflow shown is consistent with how FreeBSD deployments work without ceph-volume support. Left as-is since this is the documented FreeBSD approach.
- Ceph on FreeBSD is a niche use case with limited upstream support. The build-from-source approach may break between Ceph releases. Users should always consult the `README.FreeBSD` in their target Ceph version.
- The post correctly identifies the key FreeBSD limitations (no kernel RBD/CephFS, no cephadm, limited container support).
