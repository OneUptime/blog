# Validation Summary: How to Use Ansible to Configure DHCP Client

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ISC dhclient / ISC DHCP Client
- DHCP
- Linux networking
- systemd-networkd
- NetworkManager
- systemd services

## Sources Consulted
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- ISC DHCP 4.4 `dhclient.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- Debian `dhclient-script(8)` manual: https://manpages.debian.org/unstable/isc-dhcp-client/dhclient-script.8.en.html
- systemd `systemd.network(5)` manual: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- NetworkManager configuration reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- NetworkManager dispatcher reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager-dispatcher.html
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131

## Issues Found
- The dhclient example recommended `supersede routers;` for secondary interfaces. ISC dhclient option modifiers require a full option declaration with data, so that line is not valid `dhclient.conf` syntax. I changed the example to use a per-interface `request` list that omits `routers`, and updated the later multi-interface note to match.
- The lease storm note said `retry` and `initial-interval` help spread requests. In ISC dhclient, `retry` controls how long to wait before trying again after deciding no DHCP server is present, while request spreading is handled by `initial-delay`, `initial-interval`, and `backoff-cutoff`. I updated the note to name those options.

## Review Notes
- The Ansible examples generally use valid modules and quoted file modes. Some snippets use `ansible.builtin.copy` with inline `content` containing Jinja variables; Ansible documentation recommends `ansible.builtin.template` for variable-interpolated file content because `copy: content:` with variables can produce unpredictable results. The examples are still understandable as tutorial snippets, but production playbooks should use separate template files for those generated configurations.
