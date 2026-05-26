# Validation Summary: How to Use Ansible to Manage systemd-resolved

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- systemd-resolved
- systemd-networkd
- resolvectl
- DNS, DNSSEC, DNS-over-TLS, mDNS, and LLMNR
- Linux resolver configuration via `/etc/resolv.conf`

## Sources Consulted
- systemd `resolved.conf(5)` manual: https://www.freedesktop.org/software/systemd/man/257/resolved.conf.d.html
- systemd `systemd-resolved.service(8)` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html
- systemd `resolvectl(1)` manual: https://www.freedesktop.org/software/systemd/man/257/resolvectl.html
- systemd `systemd.network(5)` manual: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- Local systemd 255 man pages for `resolved.conf`, `systemd-resolved.service`, `resolvectl`, and `systemd.network`
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The introduction stated that systemd-resolved is the default DNS resolver on modern Ubuntu, Fedora, and Arch Linux systems. This was too broad for Arch Linux, where systemd-resolved is available but not universally the default. Changed the wording to say it is default on many modern Ubuntu and Fedora systems and commonly available on other systemd-based distributions.
- The `FallbackDNS=` comments described fallback servers as being used when per-link or internal DNS servers are unavailable. According to `resolved.conf(5)`, fallback DNS is used only when no other DNS server information is known. Updated both comments to match that behavior.
- The template comment for `CacheFromLocalhost=` incorrectly described it as controlling negative-response caching. `CacheFromLocalhost=` controls whether responses from host-local DNS servers such as `127.0.0.1` or `::1` are cached. Updated the comment.
- The `/etc/resolv.conf` symlink example used `when: not resolv_stat.stat.islnk`. Ansible documents that `islnk` is undefined when the path does not exist, so that condition can fail. Updated it to check `resolv_stat.stat.exists` before reading `islnk`.
- The systemd-networkd example split DNS settings into a second `[Network]` section after `[DHCPv4]`. Consolidated the `DNS=` and `Domains=` keys into the existing `[Network]` section so the snippet matches the documented `.network` section layout.

## Review Notes
- The post remains a valid practical guide after the corrections.
- The main `resolved.conf` file is valid, though systemd documentation recommends drop-in files under `resolved.conf.d/` for local overrides in many production setups.
- The post uses `ansible.builtin.systemd`, which is still accepted as an alias for the documented `ansible.builtin.systemd_service` module.
