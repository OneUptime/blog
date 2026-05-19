# Validation Summary: How to Configure Proxy Settings System-Wide on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux environment variables and PAM `/etc/environment`
- `/etc/profile.d/` shell initialization
- APT proxy configuration
- systemd service environment configuration
- GNOME GSettings proxy configuration
- OpenSSH SOCKS dynamic forwarding
- curl, wget, sudo, and CA certificate management

## Sources Consulted
- Ubuntu manpage for `environment(5)` / `pam_env`: https://manpages.ubuntu.com/manpages/stonking/man5/environment.5.html
- Debian/Ubuntu `apt-transport-http(1)` and local `apt.conf(5)` manpages: https://manpages.debian.org/bookworm/apt/apt-transport-http.1.en.html
- systemd `systemd.exec(5)` documentation for `Environment=` and inherited environments: https://www.man7.org/linux/man-pages/man5/systemd.exec.5.html
- Local `systemd-system.conf(5)` manpage for `DefaultEnvironment=`
- GNOME proxy GSettings schema notes: https://wiki.gnome.org/DevGnomeOrg%282f%29Gnome3PortingGuide%282f%29ProxyConfiguration.html
- Local `sudoers(5)` manpage for `env_keep`
- Local `wget(1)`, `curl --help all`, `ssh` usage output, and `update-ca-certificates(8)` manpage

## Issues Found
- The post described `/etc/environment` as applying to all users and all sessions. This was too broad because `/etc/environment` is read by `pam_env` for PAM login sessions and is not a universal source for every process or systemd service. Updated the wording to specify PAM login sessions.
- The `/etc/profile.d/` section said the file covered scripts and should be executable. `/etc/profile` sources readable `.sh` files for login shells; scripts do not source it automatically, and executable mode is not required. Updated the wording and changed the command to `chmod 644`.
- The APT example used an HTTP proxy URI for `Acquire::ftp::Proxy`. The APT documentation describes `ftp::Proxy` as an FTP proxy URI, so the example was changed to `ftp://proxy.example.com:2121/`.
- The APT environment-variable fallback example used `Acquire::http::Proxy "DIRECT";`, which explicitly disables proxy use instead of telling APT to use `http_proxy`. Replaced it with guidance to remove explicit APT proxy settings so APT can fall back to environment variables, and clarified what `DIRECT` means.

## Review Notes
- The core proxy configuration examples for APT, systemd service overrides, GNOME GSettings, SOCKS forwarding with SSH, curl SOCKS testing, sudo `env_keep`, and installing local CA certificates are technically valid.
- `no_proxy` matching details vary by tool. The examples are reasonable, but administrators should test bypass behavior with the specific clients they rely on, especially for CIDR entries.
