# Validation Summary: How to Set Up Wake-on-LAN for Remote Power Management on RHEL Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Wake-on-LAN
- ethtool
- NetworkManager / nmcli
- net-tools ether-wake
- Python socket networking
- Ethernet and UDP broadcast networking

## Sources Consulted
- Red Hat Enterprise Linux 6 Deployment Guide, ethtool Wake-on-LAN options: https://docs.redhat.com/en/documentation/Red_Hat_Enterprise_Linux/6/html-single/Deployment_Guide/index.html
- NetworkManager nm-settings-nmcli reference for `802-3-ethernet.wake-on-lan`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Red Hat Enterprise Linux 9 package manifest for RHEL package availability, including `net-tools`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- ethtool Linux man page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- net-tools `ether-wake` man page: https://manpages.opensuse.org/Leap-15.6/net-tools/ether-wake.8.en.html
- `wol` command man page for option behavior and defaults: https://www.mankier.com/1/wol
- Local man pages for `nmcli`, `nm-settings-nmcli`, `ethtool`, and `ip-link`
- Local Python syntax check for the magic packet construction snippet

## Issues Found
- The NetworkManager persistence commands assumed the connection profile was named `ens192`. Updated the commands to read the active connection profile with `nmcli -g GENERAL.CONNECTION device show ens192` before modifying and reactivating it.
- The sender-side install commands listed `wol` and `nmap-ncat`, but `nmap-ncat` was not used and `wol` is not a standard RHEL package in the checked RHEL package manifest. Replaced this with `net-tools`, which provides `ether-wake`.
- The post used `etherwake`, but the net-tools command is `ether-wake`. Updated the command examples accordingly.
- The post described magic packets as broadcast frames. Updated the wording to say they are commonly sent as broadcast packets, which better matches UDP-based WoL examples and directed broadcast behavior.
- The post stated WoL does not work over Wi-Fi. Updated the prerequisite to clarify that standard WoL is for wired Ethernet and Wake on Wireless LAN depends on hardware and firmware support.

## Review Notes
The corrected examples still use placeholder interface names and IP addresses. Readers should replace `ens192`, `aa:bb:cc:dd:ee:ff`, and subnet broadcast addresses with values from their own environment. Directed broadcast forwarding is router-dependent and is often disabled by default for security reasons.
