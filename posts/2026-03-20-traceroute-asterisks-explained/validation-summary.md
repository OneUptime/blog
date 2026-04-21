# Validation Summary: How to Understand Why Traceroute Shows Asterisks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Linux traceroute
- ICMP Time Exceeded and ICMP Echo
- UDP and TCP traceroute probes
- IPv4 TTL behavior
- ECMP path variation
- MTR
- Dublin Traceroute and Paris-traceroute techniques

## Sources Consulted
- Linux traceroute man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- RFC 1812, Requirements for IP Version 4 Routers: https://datatracker.ietf.org/doc/rfc1812/
- Official MTR man page source: https://raw.githubusercontent.com/traviscross/mtr/master/man/mtr.8.in
- Dublin Traceroute documentation: https://dublin-traceroute.net/
- Dublin Traceroute examples: https://dublin-traceroute.net/examples.html
- Ubuntu package search for dublin-traceroute: https://packages.ubuntu.com/search?keywords=dublin-traceroute
- Debian package tracker for paris-traceroute: https://tracker.debian.org/pkg/paris-traceroute

## Issues Found
- The introduction said asterisks always mean no ICMP Time Exceeded response was received. Updated it to say no expected response was received, with ICMP Time Exceeded applying to intermediate hops and other response types possible at the destination depending on traceroute mode.
- The filtering section described routers dropping inbound ICMP probes, which is misleading for default Linux traceroute because default probes are UDP and ICMP is usually the intermediate reply. Updated the wording to cover suppressed ICMP Time Exceeded replies and filtered traceroute probe types.
- The Paris traceroute example used `apt install paris-traceroute`, but that package is no longer in current Debian package sets and is not available in the current Ubuntu package search checked locally. Replaced it with `dublin-traceroute`, which is currently packaged and uses Paris-traceroute techniques for ECMP flow-based path enumeration.
- The packet-loss examples treated failed ping as proof of actual unreachability. Updated the wording to make ping failure evidence, not proof, and to recommend confirming with TCP or the application protocol being tested.
- The TCP traceroute comment said TCP probes pass through most firewalls. Updated it to the more accurate claim that TCP probes to an allowed port may pass through firewalls that block UDP or ICMP probes.
- The MTR section implied `mtr --report` runs continuously. Updated the comment to say MTR sends repeated probes and reports loss percentage, matching report-mode behavior.
- The MTR comparison text treated MTR and traceroute as if they always used the same probe type. Updated it to distinguish MTR's probe type from traceroute's probe type.

## Review Notes
The commands and flags now match Linux traceroute and MTR semantics. Traceroute behavior differs across platforms and implementations, so future edits should call out the target implementation if adding Windows, BSD, or vendor-device examples.
