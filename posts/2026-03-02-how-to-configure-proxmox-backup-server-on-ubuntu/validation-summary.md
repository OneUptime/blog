# Validation Summary: How to Configure Proxmox Backup Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Proxmox Backup Server
- Proxmox Backup Client
- Debian and Ubuntu APT repositories
- systemd services and timers
- ZFS
- Backup encryption, pruning, garbage collection, and restore workflows

## Sources Consulted
- Proxmox Backup Server Installation documentation: https://pbs.proxmox.com/docs/installation.html
- Proxmox Backup Server System Requirements: https://pbs.proxmox.com/docs/system-requirements.html
- Proxmox Backup Server Backup Client Usage: https://pbs.proxmox.com/docs/backup-client.html
- proxmox-backup-client command reference: https://pbs.proxmox.com/docs/proxmox-backup-client/man1.html
- proxmox-backup-manager command reference: https://pbs.proxmox.com/docs/proxmox-backup-manager/man1.html
- Proxmox Backup Server Storage documentation: https://pbs.proxmox.com/docs/storage.html
- Proxmox Backup Server Get Started page: https://www.proxmox.com/en/products/proxmox-backup-server/get-started

## Issues Found
- The post claimed to install Proxmox Backup Server directly on Ubuntu. Official documentation packages PBS for Debian and recommends the ISO for a dedicated server, so the post now clarifies that server packages should be installed on a matching Debian release and that Ubuntu systems are covered as clients.
- The repository setup used the older Bookworm key and one-line list format. Updated it to the current Trixie keyring and deb822 source stanza used by current Proxmox Backup Server documentation.
- The server package installation step was missing after adding the repository. Added `sudo apt install proxmox-backup-server`.
- The stated production memory guidance was too low. Updated it from 2GB to 4GB for production use, matching current Proxmox guidance.
- The user password update example used `proxmox-backup-manager user update --password`, which current PBS documents as ignored for password changes. Updated the example to set the password during `user create`.
- The ACL command had the wrong argument order. Updated it to `proxmox-backup-manager acl update /datastore/backup-store DatastoreBackup --auth-id backup@pbs`.
- The Ubuntu client install example used a hard-coded old `.deb` URL and version. Replaced it with the current client-only APT repository and package install flow.
- The client config-file example was not documented in the official client usage guide. Removed it and kept the documented environment-variable configuration.
- The snapshot and restore commands used outdated or incorrect syntax. Updated them to `proxmox-backup-client snapshot list` and `proxmox-backup-client restore <snapshot> <archive-name> <target>`.
- The garbage collection status example used a generic task-list grep. Replaced it with the documented `proxmox-backup-manager garbage-collection status <store>` command.

## Review Notes
The corrected guide still focuses on PBS for Ubuntu-adjacent workflows, but official support is strongest for installing the server from the Proxmox ISO or on Debian. The client-only repository is documented for APT-based distributions, though Proxmox explicitly lists tested Debian releases for the current Trixie repository.
