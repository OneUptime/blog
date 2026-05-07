# Validation Summary: How to Configure DHCPv6 Servers with Ansible

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Ansible
- ISC DHCP / DHCPv6
- IPv6
- Linux service management with `systemd`
- Debian-family DHCP packaging
- Red Hat-family DHCP packaging

## Sources Consulted
- Ansible `systemd_service` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `lineinfile` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible roles guide: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- ISC DHCP `dhcpd` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- Debian ISC DHCPv6 example configuration: https://sources.debian.org/src/isc-dhcp/4.4.3-P1-8/doc/examples/dhcpd-dhcpv6.conf
- Debian package file list for `isc-dhcp-server`: https://packages.debian.org/bookworm/amd64/isc-dhcp-server/filelist
- Debian `isc-dhcp-server` init script source: https://sources.debian.org/src/isc-dhcp/4.3.5-3%2Bdeb9u1/debian/isc-dhcp-server.init.d/
- Red Hat Enterprise Linux 8 DHCP service documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_networking_infrastructure_services/index
- AlmaLinux / EL9 `dhcpd6.service` unit source: https://git.almalinux.org/rpms/dhcp/src/commit/728938e99b2625c8c11a73ab5f5eb54f4db5d7a4/SOURCES/dhcpd6.service
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The role directory in the structure example was `dhcpv6-role/`, but the site playbook referenced `dhcpv6_role`. Ansible uses the role directory name as the role name, so I made the structure example match the playbook.
- The Debian service name in the tasks, handler, and verification command was `isc-dhcp-server6`, which does not match the Debian/Ubuntu package naming used by this post. I changed Debian service references to `isc-dhcp-server`.
- The Red Hat interface configuration task wrote `INTERFACESv6` to `/etc/sysconfig/dhcpd`, but current EL DHCPv6 packaging uses `/etc/sysconfig/dhcpd6` and passes arguments via `DHCPDARGS`. I replaced that task with a Red Hat-specific DHCPv6 configuration task.
- The post used `ansible.builtin.systemd`, which current Ansible documentation presents as a redirect to `ansible.builtin.systemd_service`. I updated the snippets to the current module name.
- The DHCPv6 template incorrectly set `default-lease-time` from `dhcpv6_preferred_lifetime`. ISC DHCP documents `default-lease-time` as the default lease lifetime, with `preferred-lifetime` configured separately, so I changed `default-lease-time` to use `dhcpv6_valid_lifetime`.
- The `site.yml` sample used invalid IPv6 literals such as `2001:db8:production::/64`; `production` is not valid hexadecimal IPv6 syntax. I replaced those values with valid documentation addresses under `2001:db8::/32`.
- The verification commands assumed Debian-only service and lease-file paths. I replaced them with ad hoc commands that work for both Debian-family and Red Hat-family examples in the post.

## Review Notes
- ISC DHCP 4.4 is end-of-life according to ISC's current documentation. The corrected post is technically accurate for existing ISC DHCP deployments, but new deployments should generally evaluate Kea instead.
- The DHCPv6 host example that identifies clients by `dhcp6.client-id` and assigns `fixed-address6` is valid and matches ISC's documented DHCPv6 host declaration syntax.
- Live Ansible execution and service startup were not performed in this workspace; verification relied on official documentation, package metadata, and vendor package sources instead.
- Local checks: `validation.json` was validated with `jq`.
