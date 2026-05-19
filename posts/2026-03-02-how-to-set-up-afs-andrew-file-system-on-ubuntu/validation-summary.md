# Validation Summary: How to Set Up AFS (Andrew File System) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenAFS (Andrew File System client and server)
- Ubuntu Linux
- Kerberos 5 (MIT)
- PAM (libpam-afs-session)
- systemd (openafs-client service)
- DKMS (Dynamic Kernel Module Support)

## Sources Consulted
- Ubuntu/Debian package archive (apt-cache search) for OpenAFS package names
- OpenAFS official documentation (https://docs.openafs.org/)
- Debian OpenAFS package manual pages for `aklog`, `tokens`, `unlog`, `fs`, `bos`
- Kerberos 5 documentation for `krb5.conf` format and `kinit`/`klist`/`kdestroy` commands
- libpam-afs-session module documentation (Russ Allbery's PAM module)

## Issues Found
1. **Non-existent package `openafs-server` in the "Setting Up a New AFS Cell" section.** The original `apt install -y openafs-server openafs-fileserver openafs-dbserver` command included `openafs-server`, which is not a real Ubuntu/Debian package. Confirmed by checking `apt-cache search openafs` — only `openafs-fileserver` and `openafs-dbserver` exist for the server side. Fixed by removing `openafs-server` from the install command.

2. **Misleading PAM configuration comment.** The original comment said "Add to /etc/pam.d/common-auth (or the appropriate PAM config)" while the actual command correctly appends to `/etc/pam.d/common-session`. Since `pam_afs_session.so` is a session-stack module (not an auth module), it belongs in `common-session`. The comment was updated to "Add to /etc/pam.d/common-session (pam_afs_session is a session module)" so the prose matches the command and reflects the module's actual PAM type.

## Review Notes
- The CellServDB format example (using `>cellname` for the header line and IP addresses with `#hostname` comments below) is correct.
- The `cacheinfo` format (`/afs:/var/cache/openafs:500000` with size in kilobytes) is correct.
- The Kerberos `krb5.conf` example is syntactically correct and uses appropriate stanzas (`[libdefaults]`, `[realms]`, `[domain_realm]`).
- The `bos create` command syntax (`bos create <server> <instance> <type> <command>`) and the typical server binary path (`/usr/lib/openafs/`) are accurate.
- The AFS ACL rights letters (`rlidwka`) are correct.
- `fs flush /afs` is described as "Flush the entire cache" — this is slightly imprecise (it flushes cached entries for the given path, not the entire cache; the full reset is the cache-corruption procedure shown later). Left as-is because the surrounding troubleshooting section already documents the full cache-clear procedure, and rewording the comment would risk confusing users about what `fs flush` does.
- The CMU IP addresses for `afsdb1/2/3.andrew.cmu.edu` (128.2.10.2/65/110) are illustrative and accurate to publicly published CellServDB entries at the time of writing; users joining other cells should consult their institution's CellServDB.
- The 25-hour token lifetime mentioned in the introduction is the common OpenAFS default and is broadly accurate, though actual lifetime is bounded by the Kerberos ticket lifetime.
