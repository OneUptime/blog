# How to Test a Colocation Provider’s Bandwidth, Latency, Peering, and Packet Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Bandwidth, Latency, Peering, Network Testing

Description: Run controlled throughput, latency, loss, path, and peering tests from local and external vantage points before accepting a colocation circuit.

---

A speed test to a nearby server proves very little about a colocation network. Acceptance testing needs controlled endpoints, both traffic directions, important destinations, external vantage points, and enough duration to expose congestion.

## Write acceptance criteria first

Define measurable pass conditions before the provider turns up service:

- committed rate and allowed burst rate in each direction
- packet-loss, latency, and jitter objectives
- required MTU and IPv4 and IPv6 support
- reachability to customer, cloud, transit, and content networks
- test windows, maintenance exclusions, and provider demarcation
- evidence required to reject the circuit or claim a credit

Get written permission before generating high-rate or UDP test traffic. Coordinate source and destination addresses, ports, duration, and emergency stop contacts.

## Eliminate local bottlenecks

Connect a known-capable test host at the customer demarcation. Verify negotiated speed and duplex, transceiver type, optical levels, interface errors, CPU, NIC queues, and host firewall. The test hosts and supporting network must sustain the target rate without becoming bottlenecks. Account for protocol overhead when comparing application throughput with the circuit’s committed rate.

Record interface counters before and after each run. Drops on the test host or your own switch are not provider loss.

Check the path MTU with appropriately sized packets and the do-not-fragment behavior supported by the operating system. For IPv4, use the DF bit; IPv6 has no DF bit, and routers do not fragment packets, so check ICMPv6 Packet Too Big handling and prevent source fragmentation in the test tool. Test both address families. A basic ping can pass while larger application packets fail because of an MTU mismatch.

## Measure throughput with iperf3

ESnet's iperf3 supports TCP, UDP, reverse, bidirectional, and parallel-stream testing. Begin with a single TCP stream, then use multiple streams only to distinguish a flow or host limitation from aggregate circuit capacity.

Replace `test.example.net` with your controlled test server running `iperf3 -s`. Allow TCP port 5201 for control and TCP tests, and UDP port 5201 for UDP tests.

```bash
# Forward TCP for 60 seconds
iperf3 -c test.example.net -t 60

# Reverse direction
iperf3 -c test.example.net -R -t 60

# Four parallel streams, only when approved
iperf3 -c test.example.net -P 4 -t 60

# UDP at an approved rate, reporting loss and jitter
iperf3 -c test.example.net -u -b 500M -t 60
```

Run below, at, and where permitted above the commit. Repeat at quiet and busy times. TCP throughput depends on latency, loss, congestion control, socket buffers, and host capacity, so preserve retransmits and CPU data alongside Mbps.

UDP can reveal loss and jitter at a chosen rate, but it can also disrupt production. Increase rate gradually and stop when the agreed boundary is reached.

## Measure latency and loss over time

Run continuous probes for several days to targets that reflect actual users and dependencies. Keep raw observations, not just averages. Report median, P95, P99, maximum, loss percentage, and time of day.

Use application probes as well as ICMP. Routers can rate-limit ICMP without dropping forwarded application traffic. Conversely, a fast ping does not include DNS, TCP, TLS, or server processing.

Traceroute from both ends can show path changes, but missing hops do not automatically indicate loss. Compare a problem interval with the baseline and correlate changes across multiple targets.

## Test from the outside

RIPE Atlas can run ping and traceroute measurements from selected probes, providing views from many access networks and regions. Use probes near actual users and compare candidate providers with identical target and timing settings.

Check BGP visibility and observed AS paths from independent route collectors. Review whether important networks are reached through expected transit or peering relationships, but do not equate a short AS path with lower latency. Physical route, congestion, and interconnection capacity matter.

## Test resilience and operations

If service is redundant, fail one link, router, or BGP session at a time under an approved plan. Measure detection, route convergence, session loss, and remaining capacity. Confirm monitoring alerts and escalation contacts.

Open a test ticket with the captured timestamps, endpoints, paths, interface counters, and packet data. The support process is part of the product. Record response time, ownership handoffs, and whether the provider can correlate its telemetry.

## Make an evidence-based decision

Use a matrix with one row per test and columns for criterion, observation, time, direction, path, and result. Repeat failed tests after isolating customer equipment. Accept only when the complete set passes or a documented exception has an owner and expiry.

## Conclusion

Validate colocation connectivity with controlled bidirectional throughput, long-running delivery metrics, route observations, outside probes, and failure tests. Preserve enough evidence to distinguish the host, customer network, cross-connect, and provider backbone.

## Official Documentation

- [ESnet iperf3 invocation reference](https://software.es.net/iperf/invoking.html)
- [RIPE Atlas measurement API](https://atlas.ripe.net/docs/apis/rest-api-reference/measurements/)
- [RIPE Atlas LatencyMON documentation](https://atlas.ripe.net/docs/tools-and-code/latencymon/)
- [Equinix cross-connect troubleshooting documentation](https://docs.equinix.com/cross-connect/)
