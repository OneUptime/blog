# Validation Summary: How to Configure Wake-on-LAN (WoL) on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Wake-on-LAN
- ethtool
- Netplan
- systemd
- NetworkManager and nmcli
- networkd-dispatcher
- tcpdump
- wakeonlan and etherwake
- Python socket programming

## Sources Consulted
- Netplan YAML configuration documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- ethtool man page: https://man.he.net/man8/ethtool
- tcpdump Linux man page: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- Local networkd-dispatcher man page
- Local systemd.service man page
- AMD Magic Packet Events technical reference: https://docs.amd.com/r/en-US/am011-versal-acap-trm/Magic-Packet-Events
- wakeonlan command reference: https://linuxcommandlibrary.com/man/wakeonlan

## Issues Found
- The post described a magic packet as a broadcast UDP packet containing the target MAC address repeated 16 times. That omitted the required synchronization prefix and was too specific about UDP transport. Updated the description to say it is usually sent as a broadcast UDP packet containing six `0xff` bytes followed by the target MAC address repeated 16 times.

## Review Notes
The commands and configuration examples were otherwise consistent with current documentation and local command help. Netplan documents `wakeonlan: true`, NetworkManager documents `802-3-ethernet.wake-on-lan magic`, ethtool documents `wol g`, and tcpdump accepts the filter expression form used in the post.
