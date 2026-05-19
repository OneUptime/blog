# Validation Summary: How to Configure Samba Audit Logging on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Samba
- Samba VFS `full_audit`
- syslog / rsyslog
- logrotate
- Filebeat
- Elasticsearch

## Sources Consulted
- Samba `vfs_full_audit(8)` current man page: https://www.samba.org/samba/docs/current/man-html/vfs_full_audit.8.html
- Samba `vfs_full_audit(8)` 4.19 man page: https://www.samba.org/samba/docs/4.19/man-html/vfs_full_audit.8.html
- Samba `smb.conf(5)` current man page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba `smbd(8)` current man page: https://www.samba.org/samba/docs/current/man-html/smbd.8.html
- Samba `smbcontrol(1)` current man page: https://www.samba.org/samba/docs/current/man-html/smbcontrol.1.html
- SambaWiki audit logging guide: https://wiki.samba.org/index.php/Setting_up_Audit_Logging
- rsyslog official documentation: https://docs.rsyslog.com/doc/
- rsyslog forwarding documentation: https://docs.rsyslog.com/doc/getting_started/forwarding_logs.html
- Elastic Filebeat migration documentation: https://www.elastic.co/docs/reference/beats/filebeat/migrate-to-filestream
- Elastic Filebeat filestream input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream

## Issues Found
- The post used obsolete Samba VFS operation names such as `rename`, `unlink`, `mkdir`, `rmdir`, `chmod`, and `chown`. Current Ubuntu LTS Samba versions use operation names such as `renameat`, `unlinkat`, `mkdirat`, `fchmod`, `fchown`, and `lchown`; unknown operation names cause `full_audit` to fail to load for the share. Updated the configuration examples and operation list.
- The sample audit log lines had the `OPERATION` and `RESULT` fields reversed. Samba documents the format as `smbd_audit: PREFIX|OPERATION|RESULT|FILE`. Updated the examples and the explanation.
- The parsing examples searched for the old field order and old operation names. Updated them to match `renameat` / `unlinkat` and the documented field order.
- The failed-access example searched for `FAILED`, but `full_audit` log examples use `fail`. Updated the grep command to search for `|fail|`.
- The `smb.conf` example mixed `logging = syslog` with the deprecated/overridden `syslog = 3` parameter. Updated it to use `logging = syslog@1 file`.
- The prerequisites command `smbd -b | grep MODULES` did not actually verify the `full_audit` module. Updated it to show the module directory and check for `full_audit.so`.
- The reload comment implied all changes apply without caveat. Samba documents that existing connections may not pick up share-level changes after reload, so the comment now notes that clients may need to reconnect.
- The Filebeat example used the deprecated `log` input. Updated it to use the current `filestream` input with an explicit input ID.
- The description claimed `full_audit` tracks authentication events. `full_audit` audits VFS file operations; Samba authentication auditing is handled by audit debug classes such as `auth_audit`. Updated the description to avoid that incorrect claim.

## Review Notes
The rsyslog and logrotate snippets are syntactically plausible for Ubuntu-style deployments. The exact Samba VFS operation set is version-sensitive, so future updates should re-check the target Ubuntu Samba version's `vfs_full_audit(8)` man page before changing audit operation lists.
