# Validation Summary: How to Detect IPv6 BGP Hijacking

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- RPKI and ROAs
- RIPE RIS and RIPEstat Data API
- PyBGPStream
- RIPE Atlas
- Bash
- Python
- Traceroute

## Sources Consulted
- RIPEstat RPKI Validation docs: https://stat.ripe.net/docs/data-api/api-endpoints/rpki-validation
- RIPEstat Routing Status docs: https://stat.ripe.net/docs/data-api/api-endpoints/routing-status
- PyBGPStream API docs: https://bgpstream.caida.org/docs/api/pybgpstream/pybgpstream.html
- _pybgpstream filter reference: https://bgpstream.caida.org/docs/api/pybgpstream/_pybgpstream.html
- RFC 6811, BGP Prefix Origin Validation: https://www.rfc-editor.org/rfc/rfc6811
- RIPE Atlas measurement creation docs: https://atlas.ripe.net/docs/apis/rest-api-manual/measurements/creating-measurements/
- traceroute(8) Linux manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html

## Issues Found
- The RPKI section implied any unauthorized announcement would always be INVALID. I corrected this to match the documented validation states: a covered unauthorized origin becomes `invalid_asn`, while a prefix with no covering ROA returns `unknown`.
- The first RPKI `curl` example was described as checking the current announcement. I corrected the comment because the `rpki-validation` endpoint validates a specific prefix/origin pair rather than current live BGP origin state.
- The RIPEstat `routing-status` Python example accessed `origin["visibility"]`, but the documented `origins` objects do not contain that field. I updated the example to use the documented `origins` and `more_specifics` fields instead.
- The RIPEstat examples relied on default filtering, which excludes low-visibility announcements by default. I added `min_peers_seeing=1` so the examples are less likely to miss localized hijacks.
- The RIPE RIS monitoring example only checked exact-prefix origins. I updated it to inspect `more_specifics` as well, which matters for subprefix hijack detection.
- The `pybgpstream` example used `stream.add_filter("prefix", ...)`, but the documented filter types are `prefix-exact`, `prefix-more`, `prefix-less`, and `prefix-any`. I rewrote the example to use the documented constructor filter form.
- The traceroute section used `traceroute6` and implied traceroute directly shows ASNs. I changed it to `traceroute -6 -n` and clarified that ASNs need to be mapped from hop IPs.
- The automated alert script said to run every 5 minutes, but RIPE documents `routing-status` as a snapshot aligned to `00:00`, `08:00`, and `16:00` UTC. I corrected the schedule note and updated the script to check related more-specific announcements too.
- The OneUptime section overstated reachability changes as a hijack indicator. I softened that claim so it is presented as a supporting signal that should be correlated with control-plane data.

## Review Notes
- `routing-status` is snapshot-based rather than a live feed, so the BGPStream approach remains the better fit for near-real-time detection.
- The bash alert example assumes the local system has a working `mail` command and mail delivery configured.
