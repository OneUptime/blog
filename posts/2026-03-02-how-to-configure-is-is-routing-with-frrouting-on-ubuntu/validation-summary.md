# Validation Summary: How to Configure IS-IS Routing with FRRouting on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- FRRouting
- IS-IS routing
- Linux kernel IP forwarding
- FRR vtysh configuration

## Sources Consulted
- FRRouting Debian repository installation instructions: https://deb.frrouting.org/
- FRRouting installation documentation: https://docs.frrouting.org/en/stable-10.4/installation.html
- FRRouting IS-IS documentation: https://docs.frrouting.org/en/latest/isisd.html
- FRRouting VTY shell documentation: https://docs.frrouting.net/en/stable-8.1/vtysh.html
- FRRouting basic command documentation: https://docs.frrouting.org/en/stable-8.1/basic.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 1195, Use of OSI IS-IS for Routing in TCP/IP and Dual Environments: https://www.rfc-editor.org/rfc/rfc1195
- RFC 5308, Routing IPv6 with IS-IS: https://www.rfc-editor.org/rfc/rfc5308

## Issues Found
- The example said two routers were connected via `eth1` and `eth2`, but both configurations used `eth1`. Changed the wording to state that `eth1` is used on each router.
- The NET comment described an incomplete system ID and claimed it was derived from `10.0.0.1`. Updated the comment to show the full six-octet IS-IS system ID format used by the example NET.
- The examples used `hostname router1` and `hostname router2` under `router isis`, but FRR's IS-IS router mode supports `hostname dynamic`, not arbitrary hostname assignment there. Replaced those commands with `hostname dynamic`.
- The examples used `redistribute connected`, which is not the current FRR IS-IS redistribution syntax documented for current releases. Removed it; the example already enables IS-IS on the loopback and link interfaces so those connected prefixes can be advertised by IS-IS.
- The hello timer commands used positional syntax that does not match current FRR documentation. Updated them to `isis hello-interval level-2 3` and `isis hello-multiplier level-2 3`.
- The route indicator note said routes could appear with `I` or `i`; FRR's current route code for IS-IS is `I`. Updated the note accordingly.
- The per-interface authentication example used `isis authentication mode md5` and key-chain syntax, but FRR documents `isis password [clear | md5] <password>` for IS-IS interface authentication. Replaced the snippet with `isis password md5 your_interface_password`.
- The metric example used older argument ordering for current FRR documentation and set two different metrics on the same interface. Simplified it to `isis metric level-2 100` and noted that FRR uses wide metrics by default.
- The troubleshooting section used `debug isis hello-pkt`, which is not listed in current FRR IS-IS debug commands. Replaced it with `debug isis packet-dump`.
- The troubleshooting section recommended `isis dont-check-mtu`, which is not documented in current FRR IS-IS interface commands. Replaced it with the documented hello padding command.

## Review Notes
The post is technically relevant and remains a valid FRRouting IS-IS configuration guide after the corrections. The examples are still generic and should be tested on the specific Ubuntu and FRR release used in production, because FRR command availability can vary slightly between release trains.
