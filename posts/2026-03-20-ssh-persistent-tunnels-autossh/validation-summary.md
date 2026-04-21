# Validation Summary: How to Set Up Persistent SSH Tunnels on IPv4 with autossh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- autossh
- OpenSSH client and SSH tunneling
- IPv4 SSH connections
- systemd service units
- Linux package installation

## Sources Consulted
- autossh upstream site and README/source tarball: https://www.harding.motd.ca/autossh/
- Debian autossh(1) man page: https://manpages.debian.org/testing/autossh/autossh.1.en.html
- OpenBSD/OpenSSH ssh(1) manual: https://man.openbsd.org/ssh.1
- OpenBSD/OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config.5
- systemd.service(5) manual: https://man7.org/linux/man-pages/man5/systemd.service.5.html
- systemd.unit(5) manual: https://man7.org/linux/man-pages/man5/systemd.unit.5.html
- Fedora Packages autossh EPEL package page: https://packages.fedoraproject.org/pkgs/autossh/autossh/epel-8.html

## Issues Found
- The verification command used `autossh --help | head -5`, but autossh documents `-V` for printing the version and does not document a `--help` option. Changed it to `autossh -V`.
- The RHEL/CentOS install command did not mention that autossh is provided through EPEL on Enterprise Linux. Updated the comment to say "with EPEL enabled".
- The systemd example used `StartLimitBurst=0` in `[Service]`. Current systemd documentation describes start rate limiting as unit-level configuration and explicitly documents `StartLimitIntervalSec=0` for disabling rate limiting. Moved the setting to `[Unit]` as `StartLimitIntervalSec=0`.
- The multiple-service template used `-fN` in `ExecStart`. autossh's `-f` backgrounds autossh before running ssh, which is not appropriate for a default foreground systemd service. Removed `-fN` and kept the existing foreground `-N`.
- The multiple-service template used shell redirection to write under `/etc/systemd/system`, which would fail for a non-root shell even when later commands use `sudo`. Changed it to `sudo tee ... > /dev/null`.

## Review Notes
- The SSH forwarding flags, `AddressFamily inet`, `LocalForward`, `ServerAliveInterval`, `ServerAliveCountMax`, `ExitOnForwardFailure`, `StrictHostKeyChecking`, and `IdentityFile` examples match OpenSSH client syntax.
- `After=network.target` is valid, but services that must wait for a fully configured network may prefer `network-online.target` plus the appropriate network manager wait-online service in a future revision.
