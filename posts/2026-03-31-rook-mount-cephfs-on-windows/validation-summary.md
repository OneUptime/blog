# Validation Summary: How to Mount CephFS on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CephFS)
- Rook-Ceph
- ceph-dokan (Ceph Windows client)
- Dokany (Windows userspace filesystem driver)
- Windows (10/11, Server 2019/2022)

## Sources Consulted
- Official Ceph documentation for ceph-dokan: https://github.com/ceph/ceph/blob/main/doc/cephfs/ceph-dokan.rst
- Ceph Windows installation guide: https://docs.ceph.com/en/reef/install/windows-install/
- Dokany GitHub releases: https://github.com/dokan-dev/dokany/releases

## Issues Found

1. **Wrong filesystem driver throughout (WinFsp vs Dokany)**: The post incorrectly referenced WinFsp as the required driver. ceph-dokan requires **Dokany** (not WinFsp). These are two entirely different projects with different APIs. Fixed all references: prerequisites, install section heading and content, troubleshooting Event Viewer path, and summary paragraph.

2. **Wrong driver download URL**: The post linked to `https://github.com/billziss-gh/winfsp/releases` (WinFsp). Changed to the correct Dokany URL: `https://github.com/dokan-dev/dokany/releases`.

3. **Wrong flag for CephFS filesystem selection**: The post used `--filesystem cephfs` which is not a valid ceph-dokan flag. The correct flag is `--client_fs cephfs`. Fixed in the subdirectory mount example.

4. **Wrong flag for subdirectory mount**: The post used `--mountpoint /myapp` to mount a CephFS subdirectory. `--mountpoint` is actually an alias for the mount location (drive letter), not the CephFS path. The correct flag for mounting a subdirectory is `--root-path`. Fixed to `--root-path /myapp`.

5. **Wrong unmount command**: The post recommended `net use X: /delete` which only works for SMB/network drive mappings, not Dokany-mounted filesystems. Changed to `ceph-dokan.exe unmap -l x` and mentioned Ctrl+C as an alternative.

6. **Undocumented debug flag**: The post used `-d 10` which is not a documented ceph-dokan flag. Changed to `--debug --dokan-stderr` which are the documented flags for enabling debug output.

## Review Notes
- The `mon host` configuration uses space-separated monitor addresses. While this works, the more standard format in Ceph documentation is comma-separated. Both formats are accepted, so this was left as-is.
- The post could benefit from mentioning the minimum required Dokany version (2.0.5+), which was added to the prerequisites.
- The ceph.conf example uses the legacy v1 monitor port (6789). Modern Ceph clusters default to v2 messenger on port 3300. This is still valid but could be noted for newer deployments.
- The "Configure as a Windows Service" section is brief but accurate in concept. Users would need to consult NSSM documentation for specific setup steps.
