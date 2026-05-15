# Validation Summary: How to Set Up VXLAN Overlay Networks on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux VXLAN
- iproute2 `ip` and `bridge` commands
- NetworkManager and `nmcli`
- firewalld
- Linux bridge networking
- tcpdump

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing networking": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- Linux kernel VXLAN documentation: https://docs.kernel.org/networking/vxlan.html
- NetworkManager `nm-settings-nmcli` reference for VXLAN properties: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `NMSettingVxlan` libnm reference: https://networkmanager.dev/docs/libnm/latest/NMSettingVxlan.html
- RFC 7348, "Virtual eXtensible Local Area Network (VXLAN)": https://datatracker.ietf.org/doc/html/rfc7348
- Local `iproute2` command help for `ip link type vxlan`, `ip addr`, and `bridge fdb`
- Local NetworkManager 1.46.0 `nmcli --offline connection add type vxlan` validation

## Issues Found
No technical issues found.

## Review Notes
The examples explicitly set `dstport`/`vxlan.destination-port` to 4789, which matches the IANA-assigned VXLAN port in RFC 7348 and avoids the older Linux/NetworkManager default of 8472 documented by Red Hat. For bridged, multi-host production deployments, static FDB entries or an EVPN/control-plane design may be preferable to multicast depending on the underlay, but the multicast example is technically valid when multicast routing is available.
