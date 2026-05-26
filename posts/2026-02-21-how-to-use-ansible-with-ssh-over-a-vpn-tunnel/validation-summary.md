# Validation Summary: How to Use Ansible with SSH Over a VPN Tunnel

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible inventories, playbooks, modules, and SSH connection settings
- OpenSSH client configuration options
- WireGuard and wg-quick
- OpenVPN
- Linux routing with iproute2
- systemd-resolved and resolvectl
- DNS, split-tunnel VPN routing, and VPN MTU troubleshooting

## Sources Consulted
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible wait_for_connection module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/wait_for_connection_module.html
- WireGuard quick start documentation: https://www.wireguard.com/quickstart/
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- Linux ip-route manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- systemd.network Domains documentation: https://man7.org/linux/man-pages/man5/systemd.network.5.html
- resolvectl manual: https://man7.org/linux/man-pages/man1/resolvectl.1.html
- Local OpenSSH ssh_config(5), ip-route(8), systemd.network(5), resolvectl(1), and OpenVPN 2.6.19 help output

## Issues Found
- The description and introduction claimed the guide covered IPSec, but the post only provides WireGuard and OpenVPN examples. Removed the IPSec coverage claim so the metadata and introduction match the actual content.
- The OpenVPN section stated that OpenVPN "tends to have higher latency" as a blanket claim. Reworded it to say OpenVPN can have higher latency depending on network and configuration.
- The split DNS example configured `internal.example.com` as a systemd-resolved search domain. For VPN-only split DNS, a route-only domain (`~internal.example.com`) is more accurate because it routes that private DNS zone to the VPN DNS server without adding it as a search suffix.
- The DNS verification command used `dig`, which may bypass or only indirectly exercise systemd-resolved depending on `/etc/resolv.conf`. Replaced it with `resolvectl query` to verify resolution through systemd-resolved directly.

## Review Notes
- The Ansible snippets use current FQCN module names and valid settings such as `ansible_host`, `ansible_user`, `ansible_ssh_private_key_file`, `wait_for_connection`, SSH `retries`, `pipelining`, and apt `upgrade: safe`.
- The SSH options shown (`ConnectTimeout`, `ServerAliveInterval`, `ServerAliveCountMax`, `ControlMaster`, `ControlPersist`, and `Compression`) are valid OpenSSH client options.
- The WireGuard, OpenVPN, and iproute2 commands are syntactically valid, but actual routing details can vary by VPN server pushes, peer `AllowedIPs`, and local NetworkManager/systemd-networkd configuration.
