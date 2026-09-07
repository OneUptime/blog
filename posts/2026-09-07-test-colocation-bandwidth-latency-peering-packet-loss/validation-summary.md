# Validation Summary: How to Test a Colocation Provider’s Bandwidth, Latency, Peering, and Packet Loss

## Status
validated

## Post Type
Technical guide with command-line examples and network acceptance-testing procedures.

## Technologies Covered
- iperf3 TCP and UDP throughput testing
- IPv4, IPv6, path MTU discovery, and ICMP
- Latency, packet loss, jitter, and traceroute
- RIPE Atlas probes and LatencyMON
- BGP, AS paths, peering, and route collectors
- Colocation circuits, cross-connects, and network redundancy

## Sources Consulted
- ESnet iperf3 invocation reference: https://software.es.net/iperf/invoking.html
- RFC 6349, Framework for TCP Throughput Testing: https://www.rfc-editor.org/rfc/rfc6349
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201
- RFC 1812, Requirements for IP Version 4 Routers, especially section 4.3.2.8 on ICMP rate limiting: https://www.rfc-editor.org/rfc/rfc1812
- RFC 4271, BGP-4 and AS_PATH semantics: https://www.rfc-editor.org/rfc/rfc4271.html
- RIPE Atlas measurement API: https://atlas.ripe.net/docs/apis/rest-api-reference/measurements/
- RIPE Atlas user-defined measurements: https://atlas.ripe.net/docs/getting-started/user-defined-measurements/
- RIPE Atlas LatencyMON documentation: https://atlas.ripe.net/docs/tools-and-code/latencymon/
- RIPE RIS route collectors: https://ris.ripe.net/docs/route-collectors/
- Equinix Cross Connect documentation: https://docs.equinix.com/cross-connect/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The requirement that every intermediate interface exceed the target rate incorrectly included the circuit under test and conflated application throughput with circuit capacity. Changed it to require test hosts and supporting infrastructure to sustain the target without becoming bottlenecks, and to account for protocol overhead when comparing throughput with the committed rate. RFC 6349 distinguishes bottleneck bandwidth from achievable TCP throughput.
- The commands did not state that the example hostname must be replaced or that a listening iperf3 server is required. Added the server prerequisite and default TCP/UDP port requirements. ESnet documents a TCP control connection even for UDP tests.
- The MTU instructions did not distinguish IPv4 DF behavior from IPv6. Clarified that IPv6 has no DF bit, routers do not fragment IPv6 packets, and testing must account for Packet Too Big messages and source fragmentation, consistent with RFC 8201.

## Review Notes
- All four original commands are syntactically correct: TCP is the default, -t 60 selects 60 seconds, -R reverses data flow, -P 4 selects four parallel streams, and -u -b 500M requests UDP at 500 million bits per second. No deprecated flags appear in the examples.
- The documented bidirectional capability is correct; --bidir runs simultaneous traffic in both directions. The examples instead test forward and reverse directions separately.
- The examples were reviewed against documentation, not executed against a network endpoint. No high-rate traffic, external measurements, or failure tests were initiated. This review validates the instructions, not any provider’s service quality.
- TCP performance dependencies, local counter checks, receiver loss/jitter measurements, ICMP rate-limiting caveats, missing traceroute hops, and external vantage-point testing are technically sound. Latency percentiles should be interpreted as round-trip measurements when derived from ping.
- Route collectors expose routes received from their peers; they do not provide complete visibility into all routes or prove commercial peering terms. The post appropriately treats route observations as evidence and does not equate AS-path length with latency.
- Acceptance thresholds, test duration, approved resilience exercises, support response requirements, and exception handling are operational recommendations, not universal protocol requirements or guaranteed SLA entitlements.
- The documentation links resolve to the expected official resources. The Equinix link is the broader Cross Connect documentation landing page. The author URL redirects to the corresponding GitHub profile.
- No software version is pinned in the post. Parallel streams became separately threaded in iperf3 3.16; performance on older releases can differ even with the same flags.
