# Validation Summary: How to Mount a Samba Share via CIFS on Linux Using IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Samba
- SMB/CIFS
- Linux `mount.cifs`
- `cifs-utils`
- SMB protocol versions
- Linux file ownership and permissions for CIFS mounts

## Sources Consulted
- cifs-utils 7.4 upstream `mount.cifs.rst` documentation: https://download.samba.org/pub/linux-cifs/cifs-utils/cifs-utils-7.4.tar.bz2
- Linux kernel CIFS client documentation: https://docs.kernel.org/admin-guide/cifs/usage.html
- Red Hat Enterprise Linux documentation, "Mounting an SMB Share": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_file_systems/mounting-an-smb-share-on-red-hat-enterprise-linux_managing-file-systems
- Samba Wiki, LinuxCIFS utils: https://wiki.samba.org/index.php/LinuxCIFS_utils
- Samba 4.0 release notes: https://www.samba.org/samba/news/releases/4.0.0.html

## Issues Found
- The verification command used `mount.cifs --version`, but upstream `mount.cifs` documentation specifies `mount.cifs -V`. Updated the command.
- The basic mount examples attempted to mount before creating the mount point, and the guest example used `/mnt/public` without creating it. Added `sudo mkdir -p /mnt/samba /mnt/public` before the mount commands.
- The credentials-file example used `sudo cat > /etc/samba/credentials`, but the shell redirection is not run under `sudo` and can fail for a root-owned destination. Replaced it with `sudo tee /etc/samba/credentials > /dev/null` and added `sudo mkdir -p /etc/samba`.
- The `uid=`, `gid=`, `file_mode=`, and `dir_mode=` descriptions implied they always determine ownership and modes. Clarified that they apply when the server does not provide ownership information or Unix modes.
- The SMB version guidance recommended `vers=3.0` for modern servers. Updated it to prefer default SMB2.1+ negotiation where possible, use `vers=3` when SMB3 or later must be required, and reserve `vers=2.0` for very old servers such as Windows Vista SP1 or Windows Server 2008.

## Review Notes
The post is technically relevant and now aligns with current `cifs-utils` and Linux kernel CIFS documentation. Server-side SMB permissions still determine actual access even when client-side `uid`, `gid`, `file_mode`, and `dir_mode` options make the mount appear accessible locally.
