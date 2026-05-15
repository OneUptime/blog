# Validation Summary: How to Deploy btop++ Terminal Monitoring on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- btop++
- DNF
- EPEL
- systemd
- journalctl

## Sources Consulted
- btop upstream installation and usage documentation: https://btop.one/
- Fedora Packages entry for btop, including Fedora EPEL 9 availability: https://packages.fedoraproject.org/pkgs/btop/btop/
- Red Hat Customer Portal guidance for EPEL support status and matching EPEL releases to RHEL releases: https://access.redhat.com/solutions/3358
- Red Hat Enterprise Linux 9 DNF repository management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_managing-custom-software-repositories_managing-software-with-the-dnf-tool

## Issues Found
- The post title and description promise a btop++ terminal monitoring deployment on RHEL 9, but the body contains generic service placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>`.
- btop++ is an interactive terminal resource monitor launched with the `btop` command, not a systemd service that is enabled, started, restarted, and checked with `systemctl status <service-name>`.
- The post omits the actual btop++ installation path, such as enabling an appropriate package repository when needed and installing `btop` with DNF.
- The configuration path is inaccurate for btop++; upstream documentation describes a user configuration file under `$XDG_CONFIG_HOME/btop/btop.conf`, falling back to `~/.config/btop/btop.conf`, not `/etc/<service>/config.conf`.
- The verification and troubleshooting commands are not applicable to btop++ because they inspect a placeholder systemd unit rather than verifying that the `btop` binary is installed and runs.
- Because the article is a placeholder with no usable btop++ implementation, it was marked as not technically relevant rather than rewritten into a new tutorial.

## Review Notes
This post should be removed or replaced with a complete, technically verified btop++ guide for RHEL 9. A replacement should cover repository support caveats for EPEL on RHEL, the exact install command for `btop`, launching `btop`, and the correct per-user configuration file location.
