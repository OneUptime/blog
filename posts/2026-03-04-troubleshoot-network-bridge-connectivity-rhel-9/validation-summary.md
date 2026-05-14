# Validation Summary: How to Troubleshoot Network Bridge Connectivity Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux networking
- NetworkManager and nmcli
- Linux bridge interfaces and bridge-utils/iproute2 bridge commands
- Spanning Tree Protocol (STP)
- firewalld zones
- Linux bridge netfilter and br_netfilter
- tcpdump packet capture
- libvirt/KVM virtual NIC attachment

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- NetworkManager bridge settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/settings-bridge.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Linux kernel Ethernet bridging documentation: https://docs.kernel.org/networking/bridge.html
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local command help for nmcli, bridge, ip, and sysctl

## Issues Found
- The bridge port example used only the older NetworkManager `master` terminology. Current Red Hat Enterprise Linux 9.4 and later documentation uses `port-type bridge` and `controller`; the post now shows the current syntax and keeps the earlier RHEL 9 `master` command as a commented fallback.
- The bridge netfilter section incorrectly said the Linux kernel passes bridge traffic through iptables/nftables by default. Kernel documentation says the bridge netfilter hooks default to disabled and that `br_netfilter` is a legacy module for making bridged packets visible to iptables/ip6tables hooks. The wording now says this applies when `br_netfilter` is loaded and the bridge netfilter sysctls are enabled.
- The bridge netfilter disable comment overstated the effect as "allows all bridge traffic to pass." It now states the precise effect: disabling the iptables/ip6tables/arptables bridge netfilter hooks. Bridge-family nftables or other layer-2 filtering can still apply.

## Review Notes
The remaining commands are appropriate diagnostic commands for RHEL-style bridge troubleshooting. The examples use placeholder interface names (`br0`, `eth0`, `vnet0`) and sample IP addresses, so readers still need to adapt them to their host's actual connection profile names and addressing.
