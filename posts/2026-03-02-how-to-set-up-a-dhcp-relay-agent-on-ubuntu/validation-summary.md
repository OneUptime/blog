# Validation Summary: How to Set Up a DHCP Relay Agent on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ISC DHCP relay (`isc-dhcp-relay` / `dhcrelay`)
- ISC DHCP server (`isc-dhcp-server` / `dhcpd`)
- ISC Kea DHCP server
- Linux IP forwarding (`sysctl net.ipv4.ip_forward`)
- systemd unit files
- `ufw` firewall
- `tcpdump`, `dhclient`, `journalctl`
- DHCP protocol concepts (giaddr, option 82, BOOTP relay, RFC 3527)

## Sources Consulted
- Debian/Ubuntu `dhcrelay(8)` man page — https://manpages.debian.org/bookworm/isc-dhcp-relay/dhcrelay.8.en.html
- ISC DHCP 4.4 manual pages — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC Kea documentation — https://kea.readthedocs.io/en/latest/arm/dhcp4-srv.html
- Ubuntu `ufw(8)` man page — https://manpages.ubuntu.com/manpages/trusty/man8/ufw.8.html
- Bash reference manual (line-continuation behavior)
- systemd `systemd.service(5)` man page (Type=simple vs Type=forking)

## Issues Found

1. **Incorrect description of the `dhcrelay -U` flag.** The post claimed `-U` "replaces the giaddr with the relay agent's interface address instead of the default behavior." Per the ISC `dhcrelay(8)` man page, `-U <ifname>` adds an RFC 3527 link-selection sub-option to option 82 (carrying the inbound link address) and sets giaddr to the named interface's address; it also implies `-a`. **Fixed:** rewrote the comment to describe both behaviors correctly.

2. **Misleading "Method 2" claiming Kea ships a relay agent.** The original section installed `kea-dhcp-ddns-server` and `isc-kea-dhcp4-server` as if they provided a Kea relay agent. Neither package is a relay — Kea does not ship a relay agent at all (it provides `kea-dhcp4`, `kea-dhcp6`, `kea-dhcp-ddns`, `kea-ctrl-agent`). **Fixed:** rewrote the section to clearly state Kea has no relay daemon, that `isc-dhcp-relay` (or a hardware/router relay) is used in front of Kea, and replaced the bogus `apt install` lines with a correct `subnet4` example for `kea-dhcp4.conf`.

3. **Broken bash inline comments after `\` line continuations.** Several multi-line commands had the form:
   ```
   sudo dhcrelay \
       -d \              # comment
       -a \              # comment
   ```
   In bash, a continuation backslash must be immediately followed by a newline. With trailing spaces and `#` after the `\`, the backslash escapes a space and the comment terminates the line — only the first argument is passed to `dhcrelay`. **Fixed:** collapsed the multi-line invocations into single lines and moved flag explanations into a preceding comment block. Applied this to two `dhcrelay` examples and the systemd `ExecStart=` (which would have worked under systemd's continuation parsing, but was inconsistent and harder to read).

4. **Invalid `ufw` syntax.** `sudo ufw allow out port 67 proto udp` is not valid — `ufw` requires a `to`/`from` target before `port`, or uses the short `<port>/<proto>` form. Similarly `sudo ufw allow in on eth1 port 67 proto udp` is missing a `to any` target. **Fixed:** changed to `sudo ufw allow in on eth1 to any port 67 proto udp` and `sudo ufw allow out 67/udp`.

5. **Custom systemd unit would fail at startup.** The `Method 3` unit used `Type=simple` but invoked `dhcrelay` without `-d`. Without `-d`, `dhcrelay` daemonizes (forks), and systemd with `Type=simple` would consider the service dead. **Fixed:** added `-d` to the `ExecStart=` line and a one-line comment explaining why.

## Review Notes

- The ISC DHCP project (the source of `isc-dhcp-server` and `isc-dhcp-relay`) was declared end-of-life by ISC in 2022, with maintenance handed over to the community. The packages still ship in Ubuntu 24.04 and are functional, but new deployments are generally steered toward Kea for the server side. The post correctly notes that `isc-dhcp-relay` continues to be the standard relay in front of any DHCPv4 server.
- The post recommends editing `/etc/sysctl.conf`. On modern Ubuntu the preferred path is a drop-in under `/etc/sysctl.d/` (e.g. `/etc/sysctl.d/99-ip-forward.conf`), since `/etc/sysctl.conf` is largely a stub. The current advice still works but could be modernized.
- The `dhclient` command shown in the Testing section is still valid but is no longer the default DHCP client on Ubuntu 24.04+ desktop installs (which use `systemd-networkd` or `NetworkManager`). The example assumes `isc-dhcp-client` is installed.
- The post's claim that the DHCP server "silently drops requests for unknown subnets" is accurate for ISC `dhcpd` — it logs a "no free leases" / "no subnet declaration" message at the info level and discards the request without responding to the relay.
