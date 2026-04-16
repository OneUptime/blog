# Validation Summary: How to Install ClickHouse on CentOS

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- ClickHouse (server, client, RPM packaging)
- CentOS 7, CentOS Stream 8, CentOS Stream 9
- yum / dnf package managers
- systemd
- SELinux (semanage, setenforce, restorecon)
- firewalld (including rich rules)
- Linux OS tuning (ulimits, transparent huge pages, rc-local)

## Sources Consulted
- ClickHouse official install docs: https://clickhouse.com/docs/en/install/redhat
- ClickHouse network ports reference: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse v24.3.1.2672-lts release: https://github.com/ClickHouse/ClickHouse/releases/tag/v24.3.1.2672-lts
- firewalld rich language manpage: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- httpd_selinux(8) manpage: https://linux.die.net/man/8/httpd_selinux
- SELinux default port type assignments (RHEL/CentOS policy reference, including default `http_port_t` set covering 80, 81, 443, 488, 8008, 8009, 8443, 9000)
- Standard SELinux file context conventions for `/var/lib/*` paths (`var_lib_t`)

## Issues Found

1. **Irrelevant SELinux boolean — `httpd_can_network_connect`**
   - The post advised `sudo setsebool -P httpd_can_network_connect 1` as part of the "production" SELinux configuration.
   - This boolean governs the `httpd_t` domain (Apache/Nginx) initiating *outbound* TCP connections. ClickHouse runs in its own (or unconfined) domain and accepts inbound connections — toggling this boolean has no effect on ClickHouse.
   - Removed the line.

2. **`semanage port -a` for tcp/9000 will fail**
   - The post added port 9000 to `http_port_t` with `semanage port -a`. Port 9000 is already in the default `http_port_t` definition on RHEL/CentOS, so the command fails with `ValueError: Port tcp/9000 already defined`.
   - Removed the redundant `-a` for 9000 and added a comment clarifying why only 8123 needs to be added. Kept 8123 (which is not in the default set).

3. **Wrong SELinux file context type for `/var/lib/clickhouse`**
   - The post used `-t var_t`. `var_t` is the type for `/var` itself; subdirectories under `/var/lib/*` use `var_lib_t` by default policy. Setting `var_t` here would mislabel files and could trigger denials.
   - Changed `var_t` to `var_lib_t`.

4. **firewalld rich rule attribute order**
   - The post wrote `port protocol="tcp" port="8123" accept`. The `firewalld.richlanguage(5)` grammar requires options to follow the element in canonical order: `port port="8123" protocol="tcp" accept`.
   - Reordered the attributes in the rich-rule example.

## Review Notes
- CentOS 7 reached EOL on 2024-06-30 and CentOS Stream 8 reached EOL on 2024-05-31. As of the validation date (2026-04-16), only CentOS Stream 9 (and emerging Stream 10) is actively maintained. The procedure still works on the EOL releases, but readers running them are running unsupported OSes.
- The `cat > /etc/rc.d/rc.local << 'EOF'` block overwrites any existing content in `rc.local`. On a fresh install this is fine; on a system with prior local startup customizations it would clobber them. Consider `>>` in a future revision.
- ClickHouse no longer sets up service-specific SELinux policy modules out of the box. Production users on enforcing systems may want to consider a custom `audit2allow`-derived policy module rather than relabeling under generic `var_lib_t`/`http_port_t`.
- `sudo systemctl enable rc-local` works on CentOS 7+ where `rc-local.service` ships with systemd, but on minimal images the service unit might not exist; users may need to install `initscripts` or define the unit themselves.
