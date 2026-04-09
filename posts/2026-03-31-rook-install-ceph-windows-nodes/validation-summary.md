# Validation Summary: How to Install Ceph on Windows Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (storage cluster)
- Ceph Windows client (native Windows port)
- rbd-wnbd (RBD Windows Network Block Device driver)
- ceph-dokan (CephFS Dokany mount)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (Windows nodes)
- PowerShell
- Dokany (userspace filesystem driver for Windows)

## Sources Consulted
- Official Ceph Windows Installation docs: https://docs.ceph.com/en/reef/install/windows-install/
- Official Ceph Windows Basic Configuration: https://docs.ceph.com/en/reef/install/windows-basic-config/
- Ceph ceph-dokan documentation: https://docs.ceph.com/en/reef/cephfs/ceph-dokan/
- Ceph msgr2 protocol documentation: https://docs.ceph.com/en/reef/rados/configuration/msgr2/
- Cloudbase Solutions Ceph for Windows: https://cloudbase.it/ceph-for-windows/
- Cloudbase ceph-windows-installer GitHub: https://github.com/cloudbase/ceph-windows-installer
- Ceph README.windows.rst in main repository: https://github.com/ceph/ceph/blob/master/README.windows.rst
- Dokany GitHub releases: https://github.com/dokan-dev/dokany/releases
- Ceph iSCSI overview: https://docs.ceph.com/en/reef/rbd/iscsi-overview/
- Ceph RBD OpenStack integration (auth cap examples): https://docs.ceph.com/en/reef/rbd/rbd-openstack/

## Issues Found

1. **Incorrect project name**: The post referred to a "ceph-windows" project. No such project exists. The Windows support is built into the main Ceph repository, with MSI installers provided by Cloudbase Solutions. Changed to describe it as "native Windows client support."

2. **Wrong binary name `ceph-rbd.exe`**: The actual RBD binary on Windows is `rbd-wnbd.exe` (Windows Network Block Device driver), not `ceph-rbd.exe`. Corrected the component name and description.

3. **Fabricated `ceph-iscsi` bridge component**: The post listed a "ceph-iscsi bridge" as a Windows client component. The `ceph-iscsi` project is a Linux-only gateway (using LIO/TCMU) that is in maintenance mode. The native Windows port was specifically designed to avoid needing iSCSI gateways. Removed this entry entirely.

4. **Wrong download URL**: The post used `https://download.ceph.com/windows/...` which does not exist. The Ceph Windows MSI installers are distributed by Cloudbase Solutions at `https://cloudbase.it/ceph-for-windows/`. Corrected the download URL and added a comment pointing to the official download page.

5. **Outdated `mon_host` format with hardcoded port 6789**: Port 6789 is the legacy msgr1 protocol port. Modern Ceph (Nautilus+) defaults to msgr2 on port 3300. The recommended practice is to omit ports and let the client negotiate automatically. Removed the hardcoded `:6789` port numbers.

6. **WinFSP incorrectly listed as a requirement**: WinFSP is not needed for CephFS on Windows. Ceph uses Dokany directly, not WinFSP. Removed the WinFSP installation step.

7. **Incorrect claim that Dokan is included in Ceph MSI**: The official docs explicitly state "Unlike WNBD, Dokany isn't included in the Ceph MSI installer." Corrected to note that Dokany must be installed separately (version 2.0.5+).

8. **Missing `mgr` capability in auth command**: Modern Ceph (Luminous+) requires `mgr` caps for RBD operations. Added `mgr 'profile rbd pool=windows-pool'` to the `ceph auth get-or-create` command.

## Review Notes
- The post uses Ceph Reef (v18.2.x) as its reference version. Reef is still supported but newer series (Squid v19.2.x, Tentacle v20.2.x) are also available. The post's guidance remains applicable to current versions.
- The `ceph -c C:\ProgramData\ceph\ceph.conf` flag in the testing commands is not strictly necessary since that is already the default config path on Windows, but it does not cause any harm and makes the command more explicit for readers.
- The `winget install Dokany.DokanLibrary` package ID should be verified against the current winget repository, as package IDs can change over time.
