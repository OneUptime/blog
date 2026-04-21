# Validation Summary: How to Troubleshoot DHCP Discovery Broadcast Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- DHCPv4 client/server handshake
- DHCP relay agents and `giaddr`
- ISC DHCP `dhclient`, `dhcpd`, `dhcrelay`, and lease files
- Linux packet capture with `tcpdump`
- Linux networking commands: `ip`, `ss`, `journalctl`
- Linux firewall rules with `iptables`

## Sources Consulted
- RFC 2131: Dynamic Host Configuration Protocol - https://www.rfc-editor.org/rfc/rfc2131
- RFC 1542: Clarifications and Extensions for the Bootstrap Protocol - https://www.ietf.org/rfc/rfc1542.html
- ISC DHCP 4.4 manual pages overview - https://kb.isc.org/docs/aa-00333
- ISC DHCP `dhcpd` manual page - https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP `dhcpd.conf` manual page - https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP `dhcpd.leases` manual page - https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP `dhcrelay` manual page - https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC DHCP `dhclient` manual page - https://kb.isc.org/v1/docs/isc-dhcp-443-manual-pages-dhclient
- iptables packet filtering documentation - https://www.iptables.org/documentation/HOWTO/packet-filtering-HOWTO-7.html
- iptables extensions manual page - https://manpages.debian.org/buster/iptables/iptables-extensions.8.en.html
- Local command help output for `tcpdump`, `journalctl`, `ss`, `iptables`, and `ip link`
- GitHub author profile link - https://github.com/nawazdhandala

## Issues Found
- The introduction claimed DHCP address failures are "almost always" broadcast communication failures. Changed this to "often a DHCP message path problem" because DHCP failures can also come from relay, scope, policy, exhaustion, service, or firewall issues.
- The client-side capture guidance said a Discover with no Offer means "the server is not responding." Updated it to include the case where an Offer is sent but does not return to the client.
- The server capture explanation assumed all missing server-side Discover packets are dropped broadcasts. Updated it to include relayed DHCP requests and missing or misconfigured relays.
- The relay capture command piped normal tcpdump output to `grep "giaddr"`, which is unreliable because DHCP fields require verbose decoding and tcpdump versions often label the field as `Gateway-IP`. Added `-l -vvv -s0` and a `grep` pattern for both `giaddr` and `Gateway-IP`.
- The relay `giaddr` explanation was too broad. Clarified that the non-zero `giaddr` requirement applies to relayed packets forwarded to the server.
- The scope exhaustion command used `sudo cat ... | grep`, and the text treated the lease count as definitive. Replaced it with `sudo grep -c ...` and noted that `dhcpd.leases` is log-structured, so the count is only a rough signal.
- The DHCP server journal command used `isc-dhcpd`, which is not the common systemd unit name on Debian/Ubuntu and may differ by distribution. Updated it to query `isc-dhcp-server` and `dhcpd`.
- The subnet-scope explanation said the server "silently ignores" requests. Reworded it to match ISC DHCP behavior: `dhcpd` needs a matching subnet declaration and range to allocate dynamic leases, and logs should be checked.
- The firewall example allowed outbound packets with destination port 68 only, which misses relayed replies to UDP port 67. Changed the server outbound rule to allow source port 67 and added FORWARD examples for relay/router paths.
- The `ss` step claimed it confirmed the server was bound to the correct interface while the sample socket was bound to `0.0.0.0:67`. Reworded it to say the command confirms that a DHCPv4 socket is open.
- The common-root-cause table blamed ignored Offers on MTU or filtering. Replaced the MTU claim with more accurate causes: Offer delivery, client-side filtering, or transaction/client ID mismatch.
- The conclusion said "Most DHCP failures" are caused by a short list of issues. Reworded this to "Common DHCP discovery failures" to avoid overgeneralizing.

## Review Notes
ISC DHCP 4.4 is end-of-life upstream, but the commands remain common on Linux systems that still package ISC DHCP. Modern deployments may use Kea, NetworkManager, or systemd-networkd instead, so future posts could call out which DHCP implementation and Linux distribution the commands target.
