# Validation Summary: How to Plan Bandwidth for Payload, Fan-Out, and Replication Traffic

## Status
validated

## Post Type
Technical capacity-planning guide with throughput calculations and an illustrative YAML capacity record.

## Technologies Covered
- Directional network bandwidth, payload distributions, fan-out, replication, and recovery traffic
- AWS EC2 bandwidth credits, packet allowances, connection tracking, and ENA monitoring
- Google Compute Engine instance, destination-dependent, and per-flow bandwidth constraints
- Azure VM egress bandwidth, network virtual appliances, flows, and Accelerated Networking
- Linux network interface statistics
- HTTP, TLS, TCP, QUIC, IP, overlays, load balancers, firewalls, and NAT
- YAML and decimal versus binary data units

## Sources Consulted
- Amazon EC2 instance network bandwidth: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html
- Google Compute Engine network bandwidth: https://cloud.google.com/compute/docs/network-bandwidth
- Azure virtual machine network throughput: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-machine-network-throughput
- Azure Accelerated Networking overview: https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview
- Linux interface statistics: https://www.kernel.org/doc/html/latest/networking/statistics.html
- NIST binary prefixes: https://physics.nist.gov/cuu/Units/binary.html
- YAML specification 1.2.2: https://yaml.org/spec/1.2.2/
- RFC 9000, QUIC transport and packet encapsulation: https://www.rfc-editor.org/rfc/rfc9000.html
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. The burst-credit guidance omitted EC2's best-effort qualification. Added that available credits do not guarantee burst bandwidth, consistent with AWS documentation. Testing duration and recharge alone cannot guarantee burst capacity.
2. The instruction to account for network appliances twice could be read as doubling directional bandwidth. Replaced it with separate ingress/egress accounting under the applicable limits and explicitly scoped the doubled-flow rule to Azure forwarding NVAs. Azure documents doubled flow consumption, while its bandwidth allocation counts outbound traffic across NICs.

## Review Notes
- Verified the worked example: 40,000 KiB/s client ingress, 72,000 KiB/s replica egress, and 6,000 KiB/s acknowledgement ingress. At 1 KiB = 1,024 bytes, these equal 327.68, 589.824, and 49.152 decimal Mbps respectively. The example assumes all 2,000 writes per second are accepted; acknowledgements are the stated application-level transfers, not a claim about TCP ACK size.
- Verified 6.4 / 0.65 = 9.846153846... Gbps, correctly rounded to 9.85 Gbps. The 65 percent utilization target is an illustrative tested assumption, not a universal provider recommendation.
- The per-edge formula is dimensionally correct for operation classes with representative call counts and bytes per call. Variable workloads require the joint measurements described in the post; independently averaged correlated inputs must not be treated as exact joint traffic estimates. Products of marginal p99 values do not generally yield p99 bandwidth.
- Reviewed the YAML as a valid mapping of strings, integers, and floating-point values. It is an illustrative custom record, not a provider configuration schema. Its instance type is visibly a placeholder; packet and flow values are illustrative forecast inputs rather than measurements supplied for this review.
- Provider documentation supports the distinction between sustained, aggregate, directional, destination-dependent, packet-rate, and flow constraints. No concrete instance is certified by the example, and no cloud benchmark was performed.
- Linux counters measure their documented interface boundary rather than application bodies or necessarily all on-wire overhead. The recommendation to reconcile measurement layers is appropriate. QUIC runs over UDP and adds transport framing; the overhead list is illustrative rather than a complete wire-size formula.
- Recovery, retries, cache warming, backups, and compaction contribute network traffic when the deployed architecture transfers data for those operations. These are scenario inventory items, not assertions that every operation always uses the network.
- All five documentation links and the author link resolved to the intended resources; the Google Cloud and GitHub URLs redirect normally. No executable code, CLI commands, deprecated APIs, or version-pinned implementation is present. Review used the official documentation available at review time.
