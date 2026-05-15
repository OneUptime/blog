# Validation Summary: How to Configure systemd-resolved for Local DNS Caching on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd-resolved
- systemd
- NetworkManager
- DNS caching
- DNSSEC
- DNS-over-TLS
- resolvectl

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Configuring and managing networking, "Using systemd-resolved in NetworkManager to send DNS requests for a specific domain to a selected DNS server" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 documentation: Configuring and managing networking - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 release notes, Technology Preview status for systemd-resolved - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/technology-previews
- systemd resolved.conf manual - https://www.freedesktop.org/software/systemd/man/254/resolved.conf.html
- systemd-resolved.service manual - https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- resolvectl manual - https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Local `resolvectl --help` output for command availability

## Issues Found
- The introduction contained corrupted text (`integraRHELth` and `stRHELolver`). Changed it to say systemd-resolved is integrated with systemd and can serve as a local caching stub resolver.
- The setup omitted installation of the `systemd-resolved` package. Added `sudo dnf install -y systemd-resolved`, matching Red Hat documentation.
- The RHEL setup did not configure NetworkManager to use systemd-resolved. Added the documented `dns=systemd-resolved` NetworkManager setting and a NetworkManager reload command.
- The per-interface `resolvectl dns` and `resolvectl domain` commands were presented without noting their runtime nature. Clarified that these commands set runtime per-interface DNS configuration.
- The conclusion did not mention Red Hat's support status for RHEL 8 and RHEL 9. Added a caveat that systemd-resolved is an unsupported Technology Preview on those releases and should be avoided for production workloads there.
- Removed an extraneous trailing `RHEL` line at the end of the post.

## Review Notes
The `resolved.conf` keys used in the post (`DNS`, `FallbackDNS`, `Domains`, `DNSSEC`, `DNSOverTLS`, `Cache`, and `CacheFromLocalhost`) are valid systemd-resolved settings. The `resolvectl` commands shown in the post are valid current commands. `DNSOverTLS=opportunistic` is valid, but it does not authenticate the upstream server and is vulnerable to downgrade or man-in-the-middle attacks; a future revision could discuss stricter DNS-over-TLS configuration with DNS server names.
