# Validation Summary: How to Back Up and Restore /etc Configuration Files on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- etckeeper
- Git
- GNU tar
- GnuPG
- cron
- apt

## Sources Consulted
- Ubuntu Server documentation: etckeeper - https://ubuntu.com/server/docs/how-to/backups/install-etckeeper/
- etckeeper upstream README - https://etckeeper.branchable.com/README/
- Debian etckeeper.conf source - https://sources.debian.org/src/etckeeper/1.18.22-2/etckeeper.conf
- Ubuntu package metadata for etckeeper 1.18.20-2 from local `apt-cache show etckeeper`
- GNU tar manual - https://www.gnu.org/software/tar/manual/tar.html
- Git config documentation for `core.sshCommand` - https://git-scm.com/docs/git-config/2.43.6.html
- Git revisions documentation from local `git help revisions`
- GnuPG manual for `--symmetric` and `--cipher-algo` - https://gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html

## Issues Found
- The installation section implied `sudo etckeeper init` is always the next step after installing the Ubuntu package. Ubuntu's documentation notes that the package normally initializes and commits during installation, so the command comment now says to run it if the package did not initialize automatically.
- The etckeeper configuration comment listed Bazaar only as `bzr`; current Ubuntu package metadata describes support through `brz`, while upstream configuration still uses `bzr` naming. The comment now says `bzr/brz`.
- The tar example used `-A` as if it preserved ACLs. In GNU tar, `-A` means concatenate archives; ACL preservation is `--acls`, and extended attributes require `--xattrs`. The archive and restore examples now use `--acls --xattrs`.
- The etckeeper restore examples did not re-run `etckeeper init` after checking out older file versions, which upstream recommends after checking out older versions so metadata stored in `.etckeeper` can be applied. The restore examples now include `sudo etckeeper init`.
- The sensitive-files section incorrectly said etckeeper marks sensitive files in `.gitignore` by default. etckeeper tracks metadata for files such as `/etc/shadow`; it does not make a Git remote safe for secrets. The wording now warns that sensitive data still needs private handling.
- The upgrade-diff example used `git diff HEAD` after `apt upgrade`, but etckeeper normally commits package-manager changes, leaving no working-tree diff. The example now uses `git show --stat HEAD` and `git diff HEAD~1 HEAD`.

## Review Notes
The examples remain focused on Ubuntu defaults. In future revisions, the remote push example could mention that newer Git installations may use a default branch name other than `master`, depending on `init.defaultBranch` and repository hosting settings.
