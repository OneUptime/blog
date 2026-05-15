# Validation Summary: How to Configure a Bridge with VLAN Filtering on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager and nmcli
- Linux bridge VLAN filtering
- iproute2 bridge command
- KVM/libvirt tap interfaces
- NetworkManager dispatcher scripts

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking, network bridge configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-a-network-bridge_configuring-and-managing-networking
- Red Hat Enterprise Linux 9.3 Release Notes, bridge.vlan-default-pvid behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.3_release_notes/new-features
- NetworkManager nm-settings-nmcli reference, bridge.vlan-filtering, bridge.vlan-default-pvid, bridge.vlans, and bridge-port.vlans: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager bridge-port settings reference: https://networkmanager.dev/docs/api/latest/settings-bridge-port.html
- NetworkManager-dispatcher manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager-dispatcher.html
- iproute2 bridge command help from local system, confirming `bridge vlan add|del|show` syntax
- Local NetworkManager 1.46.0 `nmcli` and `nm-settings-nmcli` man page output

## Issues Found
- The native nmcli persistence section heading said `RHEL.2+`, which is not a valid RHEL version reference. Changed it to a general RHEL 9 statement because NetworkManager on RHEL 9 supports the documented bridge VLAN properties.
- The `bridge-port.vlans` example used `"10, 20"`. NetworkManager documents the VLAN list syntax as comma-separated VLAN objects; changed the example to `"10,20"` to match the documented format exactly.
- The persistence example did not mention that NetworkManager also applies the bridge default PVID to bridge ports. Added an optional `bridge.vlan-default-pvid 0` command for strict VLAN isolation, matching Red Hat's documented behavior that the default is 1 and setting it to 0 drops untagged traffic.
- The troubleshooting section claimed the bridge stops forwarding all traffic by default after VLAN filtering is enabled. That was inaccurate because VLAN 1 is configured as the default PVID by default. Updated the wording to say that only assigned VLANs are forwarded and that VLAN 1 is added by default.

## Review Notes
The `bridge vlan` runtime commands are syntactically valid, and the dispatcher script argument pattern matches the NetworkManager dispatcher manual. Dynamic VM tap interfaces still need automation tied to VM lifecycle or libvirt hooks if the administrator wants VM port VLAN membership to persist across VM restarts.
