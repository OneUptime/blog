# Validation Summary: How to Set Up Cobbler for Automated Ubuntu Deployment

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Cobbler (provisioning server)
- Ubuntu 24.04 Server
- ISC DHCP server (isc-dhcp-server)
- TFTP (tftpd-hpa)
- PXE / UEFI network booting
- Apache2 (for Cobbler HTTP repo + web UI)
- Debian Installer preseed files
- systemd service management

## Sources Consulted
- Cobbler official documentation: https://cobbler.readthedocs.io/en/latest/installation-guide.html
- Cobbler GitHub repository templates (dhcp.template)
- Ubuntu Packages search: https://packages.ubuntu.com/
- Debian Installer preseed reference: https://www.debian.org/releases/stable/amd64/apbs04.en.html
- ISC DHCP server documentation (dhcpd.conf options, PXE classes)
- RFC 4578 (PXE client system architecture types — 00:02, 00:06, 00:07, etc.)

## Issues Found
1. **Incorrect DHCP server package name** — The post listed `dhcp-server` in the `apt install` dependencies command. No such package exists on Ubuntu. The correct package is `isc-dhcp-server`. Fixed.
2. **Incorrect systemd service name** — The post used `systemctl enable/start/status cobbler` and `journalctl -u cobbler`. The upstream Cobbler systemd unit is `cobblerd.service` (as documented in the Cobbler installation guide). Fixed all four occurrences (enable, start, status, journalctl).

## Review Notes
- The post uses `openssl passwd -1` which generates MD5-crypt (`$1$...`). MD5-crypt is considered cryptographically weak; modern preseed installations should prefer `openssl passwd -6` for SHA-512 (`$6$...`). The post is internally consistent with MD5, so left as-is, but readers should be aware.
- The PXE architecture identifiers in the DHCP template (`00:02` = IA64, `00:06` = x86 EFI, `00:07` = x64 EFI) are correct per RFC 4578.
- The Cobbler 3.x command flags (`--autoinstall`, `--autoinstall-meta`) used in the post correctly reflect the Cobbler 3.x rename from the legacy `--kickstart` terminology.
- Cobbler was removed from Debian/Ubuntu's main repository in newer releases due to lack of a Debian maintainer; depending on the Ubuntu release, `apt install cobbler` may fail and the `pip3 install cobbler` path may be the only viable install. The post already mentions the pip option.
- The Cobbler Web UI (`cobbler-web`) is still produced by upstream Cobbler 3.x, but the default credentials and authentication mechanism (htdigest against `users.digest`) shown in the post are dependent on the specific auth module configured in `modules.conf`.
- Modern Ubuntu uses systemd predictable network interface names (e.g., `enp0s3`), not `eth0`. Readers may need to substitute the actual interface name on their hardware when running `cobbler system add --interface=eth0`.
- The preseed `partman-auto/choose_recipe select atomic` recipe puts all files in one partition with no swap — fine for many servers, but worth noting as a default choice.
