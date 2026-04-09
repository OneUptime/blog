# Validation Summary: How to Install Ceph on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Pacific / Quincy releases)
- WNBD (Windows Network Block Device) driver
- RBD (RADOS Block Device) on Windows
- librados on Windows
- CephFS (Dokan-based client)
- PowerShell
- Windows Disk Management / diskpart

## Sources Consulted
- Ceph official documentation: `doc/install/windows-install.rst` — Windows installation guide
- Ceph official documentation: `doc/rbd/rbd-windows.rst` — RBD Windows usage and unmap syntax
- Ceph official documentation: `doc/install/windows-basic-config.rst` — Windows config file paths
- Ceph official documentation: `doc/rados/configuration/network-config-ref.rst` — Monitor ports
- Ceph official documentation: `doc/rados/configuration/msgr2.rst` — Messenger v2 port 3300
- Cloudbase Solutions Ceph for Windows download page: https://cloudbase.it/ceph-for-windows/
- WNBD driver GitHub repository: https://github.com/cloudbase/wnbd
- Ceph Windows installer WiX source (`Product.wxs`) for installation paths
- Ceph source code: `src/tools/rbd/action/Device.cc` for `rbd device unmap` / `rbd unmap` alias registration
- Ceph source code: `src/tools/rados/rados.cc` for stdin `-` support in rados put

## Issues Found

### 1. Incorrect download URL (FIXED)
- **What was wrong:** The post referenced `https://windows.ceph.com/downloads/ceph-17.2.6-x64.msi` as the download URL. This domain does not exist.
- **What was changed:** Updated to reference the official Cloudbase Solutions download page (`https://cloudbase.it/ceph-for-windows/`) with the correct download URL pattern (`https://cloudbase.it/downloads/ceph_quincy.msi`). Also updated the filename references throughout the install commands to match.
- **Why:** The official Ceph documentation directs users to Cloudbase Solutions for Windows MSI installers. Builds are named by release codename (e.g., `ceph_quincy.msi`, `ceph_reef.msi`), not by version number.

### 2. Incorrect RBD unmap syntax (FIXED)
- **What was wrong:** The post showed `rbd unmap E:` to unmap by drive letter and `rbd device unmap \\.\PhysicalDrive1` to unmap by device ID. Neither syntax is correct. RBD on Windows does not accept drive letters or Windows physical drive paths for unmapping.
- **What was changed:** Replaced both unmap examples with a single correct command: `rbd device unmap replicapool/windows-disk` using the image spec, which is the documented approach.
- **Why:** Per `rbd-windows.rst` and the `rbd-wnbd` usage documentation, the unmap command accepts either the image spec (e.g., `pool/image`) or the WNBD device name. Drive letters are assigned by Windows partition management and are not understood by the RBD unmap command.

## Review Notes
- The CephFS overview bullet mentions NFS gateway access. While technically possible (CephFS can be re-exported via NFS from a Linux gateway), this is a general Ceph capability and not specific to the Windows documentation. The Dokan-based client (`ceph-dokan`) is the documented Windows-native method. This is not incorrect but could be clarified in a future revision.
- The RADOS piping example (`echo "hello" | rados.exe -p mypool put testobj -`) uses stdin via `-`, which is supported in the rados source code. However, PowerShell piping to native executables can behave differently than on Linux (encoding, newlines). The syntax is valid but readers may encounter edge cases.
- The post states Windows 10/11 is supported. Per Cloudbase, Windows 10/11 works for "development/testing purposes" but is not officially production-supported. Windows Server 2019 and 2022 are the production-supported platforms.
- The `log_file` path in the ceph.conf example uses backslashes (`C:\ProgramData\ceph\logs\ceph.log`). This is correct for Windows Ceph configuration files, which accept native Windows paths.
