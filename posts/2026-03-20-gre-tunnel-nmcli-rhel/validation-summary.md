# Validation Summary: How to Create a GRE Tunnel Using nmcli on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GRE (Generic Routing Encapsulation)
- `nmcli`
- NetworkManager
- RHEL networking
- IPv4 routing
- Linux `sysctl`

## Sources Consulted
- Red Hat Enterprise Linux 9, "Configuring IP tunnels": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-ip-tunnels_configuring-and-managing-networking
- Red Hat Enterprise Linux 8, "Configuring IP tunnels": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-ip-tunnels_configuring-and-managing-networking
- NetworkManager Reference Manual, `nm-settings-nmcli(5)`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager Reference Manual, `nm-settings-keyfile(5)`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- GLib `GKeyFile` format reference: https://docs.gtk.org/glib/struct.KeyFile.html
- Local runtime verification with `nmcli` 1.46.0 using `nmcli --offline connection add type ip-tunnel ip-tunnel.mode gre ...` to confirm generated keyfile syntax and values

## Issues Found
- The main `nmcli connection add` example used shell line continuations with inline comments after the trailing `\`. That breaks the command in `bash`. I moved those comments onto their own lines so the command is valid shell syntax.
- The sample `.nmconnection` file incorrectly set `[ip-tunnel] mode=3` and labeled it as GRE. In NetworkManager, `gre` is mode `2` and `3` is `sit`. I corrected the sample to `mode=2`.
- The sample `.nmconnection` file showed settings that did not match a generated NetworkManager GRE profile for the demonstrated commands. I removed the unsupported inline comment and `ttl=255`, and updated the IPv6 section to the generated default form shown by `nmcli --offline`.
- The routed-subnet example added a static route through the GRE tunnel but omitted IPv4 forwarding, which is required on tunnel endpoints when they route traffic for other subnets. I added the forwarding step with a conditional comment to match Red Hat's documented GRE procedure.
- The final persistence statement was too absolute. I changed it to note that automatic reconnection after reboot depends on autoconnect being enabled.
- The `ip-tunnel.local` takeaway described the value as the outbound interface IP. I tightened this to "local tunnel endpoint IP" to match NetworkManager's property definition.

## Review Notes
- The GRE creation, address assignment, activation, and static route syntax are consistent with current RHEL and NetworkManager documentation.
- The post remains IPv4-focused. NetworkManager also supports related tunnel modes such as `ip6gre` and `gretap`, but those are outside the scope of this article.
- GRE does not provide encryption. The post is technically correct without that note, but Red Hat's documentation explicitly warns about it, so that may be worth adding in a future editorial pass.
