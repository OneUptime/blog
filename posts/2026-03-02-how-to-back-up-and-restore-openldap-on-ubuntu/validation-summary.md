# Validation Summary: How to Back Up and Restore OpenLDAP on Ubuntu

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Ubuntu
- OpenLDAP / slapd
- slapcat
- slapadd
- ldapadd and ldapsearch
- LDIF
- cron
- rsync, scp, and AWS CLI

## Sources Consulted
- Ubuntu Server documentation: Backup and restore OpenLDAP - https://ubuntu.com/server/docs/how-to/openldap/backup-and-restore/
- OpenLDAP Software 2.5 Administrator's Guide: Maintenance / Directory Backups - https://openldap.org/doc/admin25/maintenance.html
- OpenLDAP slapcat(8) manual page, sourced from upstream OpenLDAP - https://man7.org/linux/man-pages/man8/slapcat.8.html
- Ubuntu slapadd(8) manual page for OpenLDAP 2.6.10 - https://manpages.ubuntu.com/manpages/stonking/man8/slapadd.8.html
- OpenLDAP ldapadd(1) / ldapmodify(1) manual page - https://man7.org/linux/man-pages/man1/ldapadd.1.html

## Issues Found
- The "Back Up All Databases" example implied that a single `slapcat -a` command exports all OpenLDAP databases. `slapcat` selects a database by number or suffix, and `-a` is a filter option, not an all-databases option. I changed the section to export `cn=config` and the main directory database separately with `slapcat -n 0` and `slapcat -n 1`.
- The compressed LDIF search example piped `grep` output into `zcat`, which attempts to decompress already-filtered bytes and does not correctly search a `.gz` file. I changed it to `zcat ... | grep -A 20`.
- The operational attributes section suggested using `slapadd -q` to skip conflicts caused by operational attributes. `slapadd` is appropriate for full offline restores and preserves those attributes; `-q` is quick mode with fewer integrity checks, not a general fix for `ldapadd` conflicts. I clarified the distinction.
- The restore-test example used `systemctl` inside an `osixia/openldap` Docker container. That is not a reliable restore method for that container image and did not match the host-based `slapcat`/`slapadd` workflow in the rest of the post. I replaced it with a throwaway Ubuntu VM restore test using `slapadd` and the same backup files.

## Review Notes
The post is technically valid after the fixes. Future improvements could mention that `slapcat` while `slapd` is running is supported for back-mdb but can still capture an application-level inconsistent point-in-time view if related LDAP operations are occurring concurrently.
