# Validation Summary: How to Use Ansible to Set Up Port Forwarding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.iptables
- ansible.posix.sysctl
- ansible.posix.firewalld
- iptables NAT, DNAT, REDIRECT, and MASQUERADE
- firewalld rich rules
- Linux IP forwarding

## Sources Consulted
- Ansible documentation: ansible.builtin.iptables module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/iptables_module.html
- Ansible documentation: ansible.posix.sysctl module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible documentation: ansible.posix.firewalld module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible documentation: ansible.posix collection support matrix - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/index.html
- firewalld rich language documentation - https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Netfilter iptables NAT HOWTO - https://www.iptables.org/documentation/HOWTO/NAT-HOWTO.html
- Netfilter iptables packet filtering HOWTO - https://www.iptables.org/documentation/HOWTO/packet-filtering-HOWTO-9.html

## Issues Found
- The prerequisites listed Ansible 2.9+, but the current ansible.posix collection documentation lists ansible-core 2.16.0 or newer as supported. Updated the prerequisite to Ansible 2.16+ with ansible.posix installed.
- The prerequisites only mentioned firewalld itself, but the Ansible firewalld module requires python-firewall bindings on managed nodes. Added that requirement.
- The introduction mentioned nftables even though the post only provides iptables and firewalld examples. Removed nftables from that sentence to avoid implying direct nftables coverage.
- The IP forwarding section said no port forwarding works without kernel IP forwarding. That is too broad because firewalld forward-port rules with to-addr can enable forwarding implicitly, while routed iptables forwarding needs it. Narrowed the claim to routed forwarding with iptables.
- The port remapping example labeled a PREROUTING REDIRECT rule as a same-host local redirect. PREROUTING affects incoming packets before routing, not locally generated traffic. Renamed the task to describe incoming traffic on the host.
- The variable-driven iptables example allowed NEW forwarded packets but did not include an ESTABLISHED,RELATED rule for return traffic. Added a return-traffic FORWARD rule.
- The troubleshooting text said return packets need masquerading. That is only true when return traffic would not otherwise route back through the gateway. Reworded the claim to include that caveat.

## Review Notes
The examples are syntactically consistent with current Ansible module parameters. In production, readers should still scope MASQUERADE rules by outbound interface and source/destination networks rather than using a broad POSTROUTING MASQUERADE rule.
