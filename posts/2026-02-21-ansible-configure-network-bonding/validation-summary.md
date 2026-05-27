# Validation Summary: How to Use Ansible to Configure Network Bonding

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Ansible community.general.modprobe and community.general.nmcli modules
- Linux bonding driver
- Netplan
- NetworkManager and nmcli
- Debian/Ubuntu ifupdown and ifenslave
- ethtool, cron, and /proc/net/bonding verification

## Sources Consulted
- Ansible community.general.modprobe module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/modprobe_module.html
- Ansible community.general.nmcli module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/nmcli_module.html
- Ansible ansible.utils.ipaddr filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/utils/docsite/filters_ipaddr.html
- Netplan YAML configuration reference: https://canonical-netplan.readthedocs-hosted.com/
- Linux Ethernet Bonding Driver HOWTO: https://docs.kernel.org/networking/bonding.html
- Red Hat Enterprise Linux 9 networking documentation for nmcli bond configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- NetworkManager nm-settings/nmcli documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Debian ifenslave README: https://sources.debian.org/src/ifenslave/2.14/debian/README.Debian/

## Issues Found
- The introduction overstated bonding as mandatory for all production servers and implied increased bandwidth generally applies to traffic as a whole. Updated the wording to say bonding is often required for link-level high availability and provides aggregate bandwidth across multiple flows.
- The prerequisites installed `net-tools` but later used `ethtool`. Added `ethtool` to the Debian package list.
- The Netplan example used `ansible.utils.ipaddr('prefix')` on a netmask without documenting the required controller-side `ansible.utils` collection and `netaddr` dependency. Replaced it with an explicit `bond_prefix` variable to keep the playbook self-contained.
- The Netplan task was gated on all Debian-family systems even though the section is specifically for Ubuntu 18.04 and later. Narrowed the condition to Ubuntu 18.04+.
- The active-backup example claimed to configure failover bonding but only wrote module options and did not create a bond interface. Updated the text to clarify that active-backup should be used in the full Netplan, NetworkManager, or ifupdown examples, and changed the module-default snippet to use `community.general.modprobe` with `params` and `persistent: present`.
- The troubleshooting section suggested active-backup links should be on the same switch. Updated this to the more accurate requirement that each slave must be able to reach the same network, while 802.3ad ports must be configured as one LACP aggregation.

## Review Notes
The examples are still simplified and assume the listed interface names and IP settings are correct for the target hosts. Applying network changes over SSH can interrupt connectivity, so production playbooks should include host-specific inventory variables, staged rollout strategy, and rollback or out-of-band access.
