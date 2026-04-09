# Validation Summary: How to Manually Install Ceph from Packages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Quincy release)
- ceph-volume (LVM-based OSD management)
- ceph-authtool, monmaptool (Ceph bootstrap utilities)
- APT package management (Ubuntu/Debian)
- DNF package management (RHEL/CentOS Stream)
- systemd service management

## Sources Consulted
- Ceph Quincy documentation: ceph-volume lvm prepare — https://docs.ceph.com/en/quincy/ceph-volume/lvm/prepare/
- Ceph Quincy documentation: ceph-volume lvm activate — https://docs.ceph.com/en/quincy/ceph-volume/lvm/activate/
- Ceph documentation: Adding/Removing OSDs — https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph documentation: Manual Deployment — https://docs.ceph.com/en/quincy/install/manual-deployment/
- Ceph download repository structure — https://download.ceph.com/

## Issues Found

### 1. Deprecated `ceph osd create` command used with ceph-volume
- **What was wrong:** The OSD section used `OSD_ID=$(sudo ceph osd create)` to pre-allocate an OSD ID before calling `ceph-volume lvm prepare`. This is a legacy workflow from the ceph-disk era. When using ceph-volume, the `prepare` subcommand automatically allocates an OSD ID by calling `ceph osd new` internally.
- **What was changed:** Removed the `ceph osd create` line and the `--osd-id $OSD_ID` flag from the `ceph-volume lvm prepare` command.
- **Why:** Using `ceph osd create` separately is redundant with ceph-volume and can cause confusion or ID conflicts.

### 2. Incorrect `ceph-volume lvm activate` syntax
- **What was wrong:** The command `sudo ceph-volume lvm activate $OSD_ID` only passed the OSD ID. The `activate` subcommand requires both the OSD ID and OSD FSID (`ceph-volume lvm activate <osd-id> <osd-fsid>`), or the `--all` flag to activate all prepared OSDs.
- **What was changed:** Replaced with `sudo ceph-volume lvm activate --all`.
- **Why:** The original command would fail at runtime due to missing the required OSD FSID argument.

### 3. Missing `sudo` on `ceph osd stat`
- **What was wrong:** The final verification command `ceph osd stat` lacked `sudo`, while all other commands in the section used `sudo`. Without sudo, the command would fail unless the admin keyring has open read permissions.
- **What was changed:** Changed to `sudo ceph osd stat`.
- **Why:** Consistency with the rest of the tutorial and to ensure the command works with default keyring permissions.

## Review Notes
- The post references Ceph Quincy, which reached end-of-life. Readers targeting new deployments should consider Ceph Reef or Squid. The commands and package names remain structurally the same across releases (just substitute the release name).
- The monitor bootstrap section omits explicitly creating the monitor data directory (`mkdir -p /var/lib/ceph/mon/ceph-mon1`) and setting ownership (`chown ceph:ceph`). While `ceph-mon --mkfs` may create the directory, the official manual deployment guide includes these steps explicitly. This is not incorrect but could cause issues on some systems.
- The `uuidgen` command does not require `sudo` but using it is harmless.
- The Ubuntu/Debian repo setup correctly uses the modern `signed-by` GPG key approach rather than the deprecated `apt-key` method.
