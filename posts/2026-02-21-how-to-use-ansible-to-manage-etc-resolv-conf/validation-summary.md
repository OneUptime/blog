# Validation Summary: How to Use Ansible to Manage /etc/resolv.conf

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux `/etc/resolv.conf`
- glibc resolver options
- systemd-resolved
- DHCP client configuration
- NetworkManager DNS handling
- Debian resolvconf
- Docker daemon DNS configuration

## Sources Consulted
- Linux man-pages `resolv.conf(5)`: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- systemd `systemd-resolved.service(8)`: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- systemd `resolved.conf(5)`: https://www.freedesktop.org/software/systemd/man/247/resolved.conf.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- NetworkManager configuration reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- Debian `dhclient.conf(5)` man page: https://manpages.debian.org/testing/isc-dhcp-client/dhclient.conf.5.en.html
- Debian `resolvconf(8)` man page: https://manpages.debian.org/buster/resolvconf/resolvconf.8.en.html
- Docker daemon configuration documentation: https://docs.docker.com/engine/daemon/
- Docker `dockerd` CLI reference: https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The introduction said every DNS lookup starts by reading `/etc/resolv.conf`. This was too broad because the glibc resolver reads the file when resolver routines initialize, and modern systems may use NSS/systemd-resolved paths. Updated the wording to describe `/etc/resolv.conf` as the traditional resolver configuration and clarify glibc resolver behavior.
- The systemd-resolved section said overwriting `/etc/resolv.conf` might cause systemd-resolved to recreate the symlink. systemd-resolved maintains files under `/run/systemd/resolve/`; the symlink mode is selected by configuration and distribution tooling. Updated the explanation to avoid implying systemd-resolved itself recreates `/etc/resolv.conf`.
- The systemd-resolved example wrote directly to `/etc/systemd/resolved.conf`. Official systemd documentation recommends local overrides via drop-in files. Updated the Ansible example to create `/etc/systemd/resolved.conf.d/10-ansible.conf`.
- The per-host inventory example used `dns_nameservers`, `dns_search`, and `dns_options`, but the referenced Jinja template expected `nameservers`, `search_domains`, and `resolver_options`. Renamed the inventory variables so the example works with the template shown earlier.
- The validation section labeled `cat /etc/resolv.conf` as syntax verification. `cat` only reads the file; it does not validate resolver syntax. Renamed the task to "Read resolv.conf contents."

## Review Notes
The remaining examples are technically plausible but intentionally simplified. In production, operators should account for distribution-specific DNS stacks, existing Docker `daemon.json` keys, missing tools such as `dig`, and the operational risk of making `/etc/resolv.conf` immutable.
