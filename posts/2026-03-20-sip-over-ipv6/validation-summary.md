# Validation Summary: How to Configure SIP over IPv6

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SIP
- IPv6
- SDP
- OpenSIPS
- netcat-openbsd
- linphone-cli / linphonecsh
- ip6tables

## Sources Consulted
- RFC 3261: SIP: Session Initiation Protocol - https://www.rfc-editor.org/rfc/rfc3261.html
- RFC 5118: SIP Torture Test Messages for IPv6 - https://datatracker.ietf.org/doc/html/rfc5118
- RFC 4566: SDP: Session Description Protocol - https://www.rfc-editor.org/rfc/rfc4566.html
- RFC 3266: Support for IPv6 in SDP - https://www.rfc-editor.org/rfc/rfc3266.html
- OpenSIPS 3.6 Core Parameters, `socket` parameter - https://opensips.org/Documentation/Script-CoreParameters-3-6
- OpenSIPS 3.4 nathelper module, `nat_uac_test()` and `fix_nated_contact()` - https://opensips.org/html/docs/modules/3.4.x/nathelper.html
- sipsak upstream man page - https://raw.githubusercontent.com/nils-ohlmeier/sipsak/main/sipsak.1
- OpenBSD `nc(1)` manual - https://man.openbsd.org/nc.1
- Ubuntu `linphonecsh(1)` man page - https://manpages.ubuntu.com/manpages/jammy/man1/linphonecsh.1.html
- Local `ip6tables-save(8)` and `ip6tables --help` output from iptables 1.8.10

## Issues Found
- Corrected the blanket claim that IPv6 addresses in SIP headers must always use brackets. RFC 3261 uses bracketed IPv6 references in SIP URIs and Via sent-by values, while RFC 5118 notes exceptions such as Via `received` parameters and SDP bodies.
- Replaced invalid IPv6 examples such as `2001:db8::client`, `2001:db8::sip-server`, and `2001:db8::caller` with valid documentation-prefix IPv6 literals.
- Replaced the sipsak examples. The upstream sipsak man page states that IPv6 is not supported, and the original `-b` option was not a local bind address option. The post now uses OpenBSD netcat for a raw IPv6 SIP OPTIONS probe.
- Updated OpenSIPS listener examples from the replaced `listen` parameter to the current OpenSIPS 3.x `socket` parameter.
- Replaced the OpenSIPS `if (af == INET6) { fix_nated_contact(); }` example because IPv6 transport alone does not imply NAT. The corrected snippet applies `fix_nated_contact()` only after nathelper NAT detection.
- Corrected the SDP example to use valid IPv6 literals and clarified that SDP IPv6 addresses are not bracketed.
- Changed `sudo ip6tables-save > /etc/ip6tables/rules.v6` to `sudo ip6tables-save -f /etc/ip6tables/rules.v6` so the privileged command writes the output file directly.
- Removed the misleading `curl` HTTP POST example, which did not perform a SIP REGISTER. The registration test now uses `linphonecsh register` and `linphonecsh status register`.

## Review Notes
The examples use the `2001:db8::/32` documentation prefix, so readers must replace those addresses with addresses from their own IPv6 deployment. OpenSIPS snippets still assume the required modules, such as registrar/usrloc/nathelper and transport modules, are loaded elsewhere in the full configuration.
