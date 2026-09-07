# Validation Summary: How to Compare Colocation Bandwidth Billing Models

## Status
validated

## Post Type
Technical guide with billing pseudocode and traffic measurement guidance. The percentile algorithm and cost formulas warrant technical review rather than classification as a non-code blog.

## Technologies Covered
- Colocation bandwidth billing: 95th percentile, committed bandwidth, and unmetered service
- Interface counters, bidirectional traffic rates, and capacity planning
- Traffic policing, shaping, port capacity, and burst limits
- Network performance testing with iperf3 and RIPE Atlas

## Sources Consulted
- [Equinix Internet Access pricing and billing](https://docs.equinix.com/internet-access/eia-billing/) — fixed, usage-based, and burst billing; sampling and commit overages.
- [Equinix Internet Exchange documentation](https://docs.equinix.com/internet-exchange/) — port speeds, cross-connects, and link aggregation.
- [Cisco: Compare Traffic Policing and Traffic Shaping to Limit Bandwidth](https://www.cisco.com/c/en/us/support/docs/quality-of-service-qos/qos-policing/19645-policevsshape.html) — dropping or marking versus buffering and delaying excess traffic.
- [RFC 2863: The Interfaces Group MIB](https://www.rfc-editor.org/rfc/rfc2863.html) — interface octet counters and counter discontinuities.
- [Hetzner traffic documentation](https://docs.hetzner.com/robot/general/traffic/) — provider-specific traffic allowances and unlimited-traffic offerings.
- [ESnet iperf3 documentation](https://software.es.net/iperf/invoking.html) — throughput testing, reverse direction, and bidirectional tests.
- [RIPE Atlas measurements documentation](https://atlas.ripe.net/docs/apis/rest-api-reference/measurements/) — network tests and measurement results.

## Issues Found
- The committed-bandwidth section described a policer as dropping or delaying traffic. Corrected it to distinguish a dropping policer from a shaper that queues and delays traffic. Policing does not buffer traffic to smooth its rate.
- Clarified that 8,640 five-minute samples correspond to a 30-day month. The Equinix example is valid, but sample counts vary with billing-period length.
- Made the pseudocode's zero-based indexing and downward rounding explicit. With 8,640 samples, discarding 432 selects index 432, the 433rd-highest sample. Other contractual rounding rules still require adaptation as the post already advises.

## Review Notes
- The fenced examples are language-neutral pseudocode, not executable programs. There are no CLI commands, configuration files, library APIs, or pinned software versions to validate.
- Verified the percentile arithmetic and nonnegative overage calculation with a local Python check. The annual cost expression is a conceptual sum; all components must cover the same annual period and be monetary amounts.
- Equinix documents both tier-based language and a per-Mbps burst fee on its billing page. The post correctly tells readers to use the actual contract rather than assume a universal overage formula.
- Direction aggregation, missing samples, billing boundaries, rounding, and rate limits remain provider-specific. Five-minute averages cannot reveal all short-lived peaks. Raw counters require interval differences and handling of resets or wraps; a single month's trace does not independently establish annual growth.
- Unmetered service is bounded by the service rate and applicable terms. Port speeds and billing commitments do not establish end-to-end throughput, latency, or loss. Performance tests describe the measured paths and times, while service objectives define contractual expectations.
- All four technical documentation links in the post resolved to the intended official resources. The Internet Exchange link concerns peering ports, not Internet Access transit pricing.
- No live provider circuit, invoice, or contract was supplied, so this review validates the methodology rather than an actual quote or delivered service.
