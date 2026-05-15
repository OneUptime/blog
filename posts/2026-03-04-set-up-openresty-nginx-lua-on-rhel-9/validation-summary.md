# Validation Summary: How to Set Up OpenResty (Nginx + Lua) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- OpenResty
- Nginx configuration
- Lua handlers in OpenResty
- systemd
- firewalld
- SELinux troubleshooting
- RPM/DNF package management

## Sources Consulted
- OpenResty official Linux Packages documentation: https://openresty.org/en/linux-packages.html
- OpenResty official RPM Packages documentation: https://openresty.org/en/rpm-packages.html
- OpenResty official Getting Started documentation: https://openresty.org/en/getting-started.html
- Red Hat Enterprise Linux 9 DNF package installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld official firewall-cmd documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post was missing the actual OpenResty installation step. Added the documented OpenResty RHEL 9 repository setup, noted the CentOS Stream 9 repository URL, and added `dnf install -y openresty`.
- The configuration path used `/etc/<service>/config.conf`, which is a placeholder and not the OpenResty RPM default. Changed it to `/usr/local/openresty/nginx/conf/nginx.conf`.
- The service commands used `<service-name>`, which would not work. Replaced them with the documented `openresty` systemd service name.
- The firewall command used `<PORT>`, which was incomplete. Replaced it with `firewall-cmd --permanent --add-service=http` for the default OpenResty HTTP listener.
- The verification and troubleshooting commands used placeholders. Replaced them with OpenResty-specific `systemctl`, `journalctl`, `curl`, and `rpm -q openresty` commands.
- Added `sudo openresty -t` before restarting so the configuration is validated before applying changes.

## Review Notes
The corrected post covers the default HTTP setup. Future improvements could add HTTPS firewall guidance, an example Lua `content_by_lua_block`, and notes for using a separate OpenResty application prefix instead of editing the default installation tree.
