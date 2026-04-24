# Validation Summary: How to Set Up Pure-FTPd to Bind to a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Pure-FTPd
- FTP
- IPv4 networking
- Debian/Ubuntu package configuration
- systemd
- NAT and passive FTP

## Sources Consulted
- Pure-FTPd upstream documentation and option reference: https://github.com/jedisct1/pure-ftpd
- Debian `pure-ftpd(8)` man page: https://manpages.debian.org/testing/pure-ftpd-common/pure-ftpd.8.en.html
- Debian `pure-ftpd-wrapper(8)` man page: https://manpages.debian.org/experimental/pure-ftpd-common/pure-ftpd-wrapper.8.en.html
- Debian `pure-ftpd-wrapper` source: https://sources.debian.org/src/pure-ftpd/1.0.50-2.2/debian/pure-ftpd-wrapper
- Debian package init script: https://sources.debian.org/src/pure-ftpd/1.0.50-2.2/debian/pure-ftpd.init.d
- Debian package debconf templates: https://sources.debian.org/src/pure-ftpd/1.0.50-2.2/debian/pure-ftpd-common.templates
- systemd unit drop-in documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd service `ExecStart=` and `Type=` documentation: https://www.freedesktop.org/software/systemd/man/255/systemd.service.html

## Issues Found
- The multi-line `pure-ftpd` command used shell continuations followed by spaces and inline comments, which makes the command invalid in `sh`/`bash`. I removed the inline comments from the continued lines so the example is executable.
- The Debian/Ubuntu example incorrectly used `ForcePassiveIP` as if it controlled the listening address. I removed that misuse because `ForcePassiveIP` is for advertising the public IP in passive-mode replies, not for binding the daemon.
- The Debian/Ubuntu `Bind` example used `192.168.1.10 21`, but the wrapper treats `Bind` as a string value and rejects whitespace. I corrected it to `192.168.1.10,21`, which matches upstream `--bind` / `-S` syntax.
- The Debian/Ubuntu method omitted that binding to a specific IP only works when the package is running in standalone mode. I added that requirement based on the package's documented behavior.
- The systemd override example was too broad for Debian/Ubuntu wrapper-based installs. I scoped it to native systemd service setups and added `Type=simple` so the foreground `ExecStart=` example is internally consistent.

## Review Notes
- The post assumes the vanilla Debian/Ubuntu `pure-ftpd` package/service name. Other package flavours such as `pure-ftpd-mysql`, `pure-ftpd-postgresql`, or `pure-ftpd-ldap` use different service/init names.
