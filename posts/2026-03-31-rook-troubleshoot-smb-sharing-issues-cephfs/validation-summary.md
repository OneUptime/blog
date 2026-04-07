# Validation Summary: How to Troubleshoot SMB Sharing Issues with CephFS

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph / CephFS
- Samba (SMB file sharing)
- Rook (Ceph operator for Kubernetes)
- Winbind (Active Directory integration)
- POSIX ACLs

## Sources Consulted
- Samba official documentation: https://www.samba.org/samba/docs/current/man-html/
- `smbclient` man page: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- `smbcontrol` man page: https://www.samba.org/samba/docs/current/man-html/smbcontrol.1.html
- `testparm` man page: https://www.samba.org/samba/docs/current/man-html/testparm.1.html
- `pdbedit` man page: https://www.samba.org/samba/docs/current/man-html/pdbedit.8.html
- `wbinfo` man page: https://www.samba.org/samba/docs/current/man-html/wbinfo.1.html
- Ceph documentation on CephFS: https://docs.ceph.com/en/latest/cephfs/
- Ceph documentation on Samba gateway: https://docs.ceph.com/en/latest/cephfs/samba/

## Issues Found
No technical issues found.

## Review Notes
- The `systemctl restart smb winbind` command uses the RHEL/CentOS service name "smb". On Debian/Ubuntu systems the service is named "smbd". This is not an error but is platform-specific; a note about this difference could be helpful in a future revision.
- The `grep "browsable"` command works because Samba accepts both "browsable" and "browseable" as the parameter name, though "browseable" is the canonical spelling in smb.conf documentation.
- All Ceph CLI commands (`ceph auth get`, `ceph fs status`, `ceph mds stat`, `ceph daemon`) use correct syntax and subcommands.
- The `smbcontrol smbd debug "5"` syntax is valid for temporarily raising the Samba log level.
