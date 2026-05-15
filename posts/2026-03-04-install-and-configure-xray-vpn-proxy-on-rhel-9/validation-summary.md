# Validation Summary: How to Install and Configure XRay VPN Proxy on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Xray-core / XTLS Xray
- systemd
- firewalld
- DNF

## Sources Consulted
- XTLS Project X installation documentation: https://xtls.github.io/en/document/install
- Official XTLS/Xray-install repository: https://github.com/XTLS/Xray-install
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The article is a placeholder-style guide and does not provide a technically usable Xray installation or configuration procedure.
- `sudo dnf install -y <package-name>` is not an accurate Xray installation instruction for RHEL 9. Official Xray documentation points users to maintained installation methods such as the XTLS/Xray-install script rather than a RHEL package named generically by the post.
- `/etc/<service>/config.conf` is not the Xray configuration path installed by the official Linux installer. The official installer uses Xray-specific paths such as `/usr/local/etc/xray/config.json` for the default systemd service.
- `<service-name>` is not a valid systemd unit name for the described software. The official installer creates Xray systemd units such as `xray.service`.
- The firewall section uses valid `firewall-cmd` syntax in isolation, but it leaves the required port as `<PORT>` and does not tie the firewall rule to any real Xray inbound configuration, so it cannot verify a working deployment.
- Because the post contains only generic placeholders and no Xray-specific installation or configuration content, it should be treated as not technically relevant rather than validated.

## Review Notes
The post could be rewritten in the future as a real RHEL 9 Xray guide, but that would require adding a concrete installation method, a valid Xray JSON configuration, the correct systemd unit name, and firewall rules that match the configured inbound listener.
