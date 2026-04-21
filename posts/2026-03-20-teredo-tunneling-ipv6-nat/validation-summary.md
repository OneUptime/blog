# Validation Summary: How Teredo Tunneling Provides IPv6 Connectivity Through NAT

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Teredo IPv6 tunneling
- IPv6 transition mechanisms
- NAT traversal
- Miredo on Linux
- Windows `netsh interface teredo`
- Linux networking commands (`ip`, `ping`, `curl`, `iptables`)
- 6in4 and 6to4 tunneling

## Sources Consulted
- RFC 4380: Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs) (https://datatracker.ietf.org/doc/html/rfc4380)
- RFC 5991: Teredo Security Updates (https://www.ietf.org/rfc/rfc5991)
- RFC 7123: Security Implications of IPv6 on IPv4 Networks (https://www.rfc-editor.org/rfc/rfc7123.html)
- RFC 7526: Deprecating the Anycast Prefix for 6to4 Relay Routers (https://datatracker.ietf.org/doc/html/rfc7526)
- IANA IPv6 Special-Purpose Address Registry (https://www.iana.org/assignments/iana-ipv6-special-registry)
- Debian `miredo.conf(5)`, `miredo(8)`, and `miredo-checkconf(8)` manpages (https://manpages.debian.org/unstable/miredo/miredo.conf.5.en.html)
- ReMLab Miredo project news archive (https://www.remlab.net/miredo/news.shtml.en)
- Microsoft Learn: `netsh interface` Teredo commands (https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface)
- Microsoft Learn: Deprecated features for Windows client (https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features)
- Microsoft Learn: Teredo Addresses (https://learn.microsoft.com/en-us/windows/win32/teredo/teredo-addresses)
- Red Hat Customer Portal: RHEL Teredo tunnelling support note (https://access.redhat.com/solutions/347753)
- Hurricane Electric Free IPv6 Tunnel Broker (https://ipv4.tunnelbroker.net/)

## Issues Found
1. **Teredo NAT support was overstated.** The post said Teredo works through NAT without qualification. RFC 4380 excludes symmetric NAT behavior from normal Teredo qualification, so the wording and comparison table now say Teredo works through many NATs, not all NATs.
2. **UDP port behavior was imprecise.** The post implied all Teredo traffic uses UDP 3544 and that Miredo's client `BindPort` default is 3544. RFC 4380 defines UDP 3544 as the Teredo server port, while the Miredo manpage says the client port is OS-selected unless `BindPort` is configured. Updated the introduction, table, and config comments.
3. **Teredo address format was compressed too far.** The format line did not show the full eight-hextet layout and did not distinguish mapped client values. Updated it to show the server IPv4 and obscured mapped IPv4 fields as two hextets each, with the correct XOR masks.
4. **Dead public Teredo server examples were listed.** `teredo.remlab.net` was permanently terminated in 2021 according to the Miredo project. Replaced those examples with a clear placeholder requiring a server the reader operates or is authorized to use, and noted that Miredo requires a functioning Teredo server.
5. **RHEL/CentOS install guidance was too broad.** Red Hat does not ship Teredo tunnelling software for RHEL. The command now notes that `dnf install miredo` only applies if enabled repositories provide Miredo.
6. **Windows enablement command was misleading.** `type=default` restores the system default and is not the clearest enable command on modern Windows. Updated the example to `type=client` and changed the server example to restore the Windows default instead of using the terminated ReMLab host.
7. **6to4 deprecation status was too broad.** RFC 7526 deprecates the 6to4 anycast relay mechanism, not the basic 6to4 mechanism or `2002::/16` prefix. Updated the table status to "Anycast deprecated / not recommended."
8. **Security detection was overly broad.** `grep "2001:"` can match ordinary global IPv6 addresses. Changed the check to look for the Teredo prefix form `2001:0:`.
9. **`miredo-checkconf` was described as a connectivity check.** The Miredo manpage documents it as a configuration syntax checker, so the command label now says it checks configuration syntax.

## Review Notes
- Public Teredo infrastructure is sparse and unstable. Even when a Teredo server resolves, general IPv6 Internet connectivity also depends on working relays.
- The Linux command syntax for `ip`, `ping -6`, `curl -6`, and `iptables` is valid, but the Teredo connectivity tests cannot be guaranteed without a functioning Teredo server and relay.
- The local Ubuntu package metadata shows `miredo` is available from the Ubuntu universe repository, and the package includes `miredo.service`, `miredo-checkconf`, and `/etc/miredo/miredo.conf`.
