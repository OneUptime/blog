# Validation Summary: How to Configure Guest Access for Ceph SMB Shares

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Samba (SMB/CIFS file sharing)
- Ceph / CephFS (distributed storage backend)
- Rook (Ceph operator for Kubernetes)
- Linux filesystem permissions

## Sources Consulted
- Samba official documentation: smb.conf man page — parameters `guest account`, `map to guest`, `guest ok`, `read only`, `writable`, `browseable`, `create mask`, `directory mask`, `force user`, `force group`, `hosts allow`, `hosts deny`, `log level`, `log file`, `max log size` (https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html)
- Samba `smbclient` man page — `-N` flag and `-c` command syntax (https://www.samba.org/samba/docs/current/man-html/smbclient.1.html)
- Samba `smbstatus` man page — `-S` / `--shares` flag (https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html)
- Microsoft documentation for `net use` command syntax

## Issues Found
- **Redundant `read only = no` and `writable = yes` in the dropbox share**: In Samba, `writable` is an inverted synonym for `read only` — setting `writable = yes` is equivalent to `read only = no`. Having both in the same share definition is redundant. In a tutorial context this could mislead readers into thinking both are required. Removed `read only = no`, keeping only `writable = yes` which clearly communicates the intent.

## Review Notes
- The `browsable = yes` parameter uses the alternative spelling; Samba's canonical parameter name is `browseable`, but `browsable` is accepted as a synonym. Both work correctly.
- The `create mask` and `directory mask` in the read-only `[public]` share are technically unnecessary since no files can be created on a read-only share, but they serve as defensive configuration and documentation of intent. Not an error.
- The `max log size = 50000` value is in kilobytes (approximately 50 MB per log file), which is reasonable for a production environment.
- The post title references "Ceph SMB Shares" and is tagged with Rook, but the content focuses purely on Samba configuration over CephFS mount paths. The Samba configuration itself is correct regardless of the underlying filesystem.
