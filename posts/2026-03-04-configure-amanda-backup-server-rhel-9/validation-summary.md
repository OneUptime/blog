# Validation Summary: How to Configure Amanda Backup Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Amanda Community Backup
- Amanda server and client packages
- Amanda configuration files: amanda.conf, disklist, .amandahosts
- firewalld
- systemd socket activation
- cron

## Sources Consulted
- Zmanda Amanda Community documentation: Build a Basic Configuration, https://docs.zmanda.com/amanda-community/getting-started-with-amanda/build-a-basic-configuration
- Zmanda Amanda Community documentation: A Peek Under the Hood, https://docs.zmanda.com/amanda-community/getting-started-with-amanda/a-peek-under-the-hood
- Zmanda Amanda Community documentation: Backing Up Other Systems, https://docs.zmanda.com/amanda-community/getting-started-with-amanda/backing-up-other-systems
- Zmanda Amanda Community documentation: Recovering Files, https://docs.zmanda.com/amanda-community/getting-started-with-amanda/recovering-files
- Amanda amanda.conf(5) man page, https://manpages.debian.org/unstable/amanda-common/amanda.conf.5.en.html
- Amanda amadmin(8) man page, https://www.mankier.com/8/amadmin
- Amanda amrecover(8) man page, https://www.mankier.com/8/amrecover
- Amanda amrestore(8) man page, https://www.mankier.com/8/amrestore
- Amanda amanda-auth(7) man page, https://www.mankier.com/7/amanda-auth
- Fedora EPEL 9 Amanda package information, https://packages.fedoraproject.org/pkgs/amanda/amanda-server/epel-9.html
- Fedora EPEL 9 Amanda RPM file list showing systemd socket units, https://fr2.rpmfind.net/linux/RPM/epel/9/aarch64/Packages/a/amanda-3.5.3-1.el9.aarch64.html
- Red Hat RHEL 9 DNF documentation, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool

## Issues Found
- The install command assumed Amanda packages were available from the base RHEL repositories. Added an EPEL enable/install command because Amanda for EL9 is packaged in Fedora EPEL.
- The custom `amanda.conf` referenced `comp-user-tar` in `disklist` but did not define that dumptype. Added the minimal `global`, `root-tar`, `user-tar`, and `comp-user-tar` definitions using GNUTAR and client compression, matching Amanda sample configuration patterns.
- The virtual tape configuration created slots but did not configure `labelstr` or `autolabel`, which would leave new vtapes unusable without manual labeling. Added label matching and autolabel directives.
- The remote client setup used bsdtcp-style `.amandahosts` access but did not start the packaged Amanda socket. Added `systemctl enable --now amanda.socket`.
- The firewall commands opened UDP 10080 even though the corrected configuration uses `auth "bsdtcp"` and the systemd `amanda.socket` listens on TCP 10080. Removed the UDP commands.
- The `amrecover` example ran as the Amanda dump user. Changed it to run with `sudo` because Amanda recovery documentation notes that restoring files and permissions normally requires root.
- The `amadmin daily find --sort hostname` example used an unsupported sort key. Changed it to `--sort h`, which is the documented hostname sort key.

## Review Notes
- The guide now validates as a practical RHEL 9/Amanda tutorial. It still uses `bsdtcp`, which is workable on a trusted network, but Amanda's own documentation recommends SSH authentication for less trusted networks. A future improvement could add an SSH-auth variant without replacing the current simpler setup.
