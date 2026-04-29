# Validation Summary: How to Configure Kamailio SIP Proxy with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kamailio
- IPv6
- SIP
- RTPEngine
- SIPp
- ip6tables

## Sources Consulted
- Kamailio Core Cookbook 6.1.x: https://www.kamailio.org/wikidocs/cookbooks/6.1.x/core/
- Kamailio `rr` module docs: https://www.kamailio.org/docs/modules/stable/modules/rr.html
- Kamailio `rtpengine` module docs: https://kamailio.org/docs/modules/stable/modules/rtpengine.html
- Kamailio `registrar` module docs: https://kamailio.org/docs/modules/stable/modules/registrar.html
- Kamailio `tls` module docs: https://www.kamailio.org/docs/modules/stable/modules/tls.html
- Kamailio `kex` module docs: https://www.kamailio.org/docs/modules/stable/modules/kex.html
- Kamailio command-line arguments reference: https://www.kamailio.org/w/2019/05/kamailio-command-line-arguments/
- SIPp transport documentation: https://sipp.readthedocs.io/en/v3.6.1/transport.html

## Issues Found
- The alias example omitted the SIP port even though Kamailio's core docs note that aliases should include the configured port for correct `loose_route()` behavior. I changed `alias=sip.example.com` to `alias=sip.example.com:5060`.
- The sample IPv6 macro used an invalid literal (`2001:db8::kamailio`). I replaced it with a syntactically valid documentation prefix example address.
- The IPv6 routing example said it was fixing the Contact header, but the code actually called `record_route_preset()`. I replaced that with `record_route()` because it is the documented and appropriate way to add Record-Route on dialog-forming requests in this context.
- The RTPEngine section used an invalid condition (`src_ip == "0.0.0.0"`) and treated `force-relay` as the mechanism for IPv4/IPv6 bridging. I replaced that logic with documented `address-family=IP4` / `address-family=IP6` examples and added the standard SDP rewrite flags `replace-origin replace-session-connection`.
- The RTPEngine control socket example used an invalid IPv6 hostname literal and the wrong style for the documented IPv6 socket form. I changed it to `udp6:rtpengine.example.com:22222`, which matches the documented `udp6:` syntax.
- The registration section loaded `usrloc` but not `registrar`, even though `save()` and `lookup()` are exported by the registrar module. I added `loadmodule "registrar.so"` and completed the INVITE example with `t_relay();` so the route actually forwards traffic after lookup.
- The firewall persistence command used `sudo ip6tables-save > ...`, which would not write the target file as root because the redirection happens in the invoking shell. I replaced it with `sudo ip6tables-save | sudo tee /etc/ip6tables/rules.v6 > /dev/null`.
- The testing section misused Kamailio CLI options and RPC commands. I replaced `kamailio -l` with the documented syntax-check command `kamailio -c`, replaced the invalid `kamcmd> cfg.get_list` line with `kamcmd core.sockets_list`, corrected the SIPp IPv6 example to use valid IPv6 addresses and ordering, and replaced the debug command with foreground stderr logging via `kamailio -DD -E -f /etc/kamailio/kamailio.cfg`.
- The TLS listener example lacked the documented prerequisites for enabling TLS. I added `loadmodule "tls.so"` and `enable_tls=yes` alongside the TLS listen socket.

## Review Notes
- The post's configuration snippets are excerpts, not a complete `kamailio.cfg`, so they still assume the surrounding config already loads other required modules such as `sl`, `tm`, and `rr` where their functions are used.
- `kamcmd core.sockets_list` is provided by Kamailio's `kex` module; many default deployments include it, but installations using a minimal module set may need an alternative listener check.
- The SIPp example assumes an `OPTIONS.xml` scenario file is available locally.
