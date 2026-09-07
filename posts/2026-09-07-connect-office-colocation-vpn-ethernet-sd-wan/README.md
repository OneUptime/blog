# How to Connect an Office to Colocation with VPN, Ethernet, or SD-WAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, VPN, SD-WAN, Networking, Network Security

Description: Choose and validate office-to-colocation connectivity across IPsec VPN, Carrier Ethernet, and SD-WAN based on risk and performance.

---

The right office-to-colocation link depends on application traffic, security, recovery objectives, and available access circuits. IPsec, Carrier Ethernet, and SD-WAN solve different layers of the problem and can be combined.

## Measure the requirement

Inventory traffic by application and direction. Record average and P95 Mbps, short peaks, flow count, latency sensitivity, packet-size behavior, and business impact. Add replication, backup, voice, management, and recovery traffic.

Define:

- required steady and failover bandwidth
- maximum one-way or round-trip latency where relevant
- acceptable loss, jitter, and outage duration
- encryption and key-management requirements
- addressing, routing, multicast, and IPv6 needs
- office and colocation demarcation points

Do not use server NIC speed as the WAN requirement. Model how much traffic must move during the busiest shared interval.

## Compare the transport options

### Site-to-site IPsec VPN

An IPsec tunnel over Internet access is usually quick to deploy and works across providers. NIST describes IPsec as a standards-based network-layer control for protecting IP communications, commonly configured with IKE.

Size gateways for encrypted throughput, not marketing port speed. Test with the selected algorithms, packet sizes, and concurrent tunnels. Plan public addresses, NAT traversal, certificate or pre-shared-key lifecycle, rekey behavior, and path MTU. Use two independent Internet circuits when the office connection is critical.

### Carrier or Metro Ethernet

A Carrier Ethernet E-Line provides point-to-point Layer 2 service between customer interfaces. MEF defines service attributes that make offerings comparable, but encryption is not implied merely because the service is private.

Ask for committed rate, excess treatment, frame size, VLAN handoff, performance objectives, protection, route diversity, maintenance terms, and the exact service boundary. Add encryption if the data classification requires it. Avoid stretching a broad failure domain at Layer 2 when routed links can meet the application need.

### SD-WAN

SD-WAN creates a policy-driven overlay across one or more underlays such as broadband, cellular, or Ethernet. It can steer applications based on measured path conditions and simplify failover. It does not improve a bad underlay's raw capacity, and two logical tunnels over one last-mile circuit still share one failure.

Check controller and orchestrator resilience, tunnel encryption, route exchange, application identification, licensing, telemetry retention, and behavior when control services are unreachable. MEF's SD-WAN standard distinguishes the overlay from its underlay connectivity services.

## Design a resilient topology

For important workloads, terminate two independent access paths on separate edge devices and power paths at both sites. Use dynamic routing or a carefully tested tracking mechanism. Ensure the surviving path carries the full required load or define which traffic is shed.

Keep an independent management path where possible. A failed production tunnel should not prevent access to the device needed to restore it.

Document MTU across encapsulation layers:

```text
usable payload MTU = underlay MTU - tunnel and encryption overhead
```

Exact overhead depends on protocol, mode, address family, and algorithms. Discover and test it rather than hard-coding one subtraction.

## Run an acceptance test

Test bidirectional throughput, latency, jitter, loss, application transactions, IPv4, IPv6, and the largest required packet. Then fail each underlay, edge device, and power path separately.

Measure:

- failure detection and convergence time
- lost packets and reset sessions
- application recovery time
- surviving-link utilization
- routing and security-policy correctness

Test planned maintenance too. Some designs survive a hard link failure but not a provider maintenance event that leaves carrier signal up while forwarding stops.

## Make a decision

Use IPsec when Internet economics and deployment speed fit, Carrier Ethernet when a defined private service and predictable attributes justify the cost, and SD-WAN when policy across multiple varied paths creates operational value. A common design uses diverse Internet or Ethernet underlays with an encrypted SD-WAN overlay.

Compare total cost, including access tails, cross-connects, equipment, licenses, support, installation, addressing, monitoring, and secondary-path capacity.

## Conclusion

Choose office connectivity from measured application needs and failure objectives. Specify the underlay and overlay separately, encrypt according to risk, remove shared last-mile dependencies, and prove the complete path with application and failure testing.

## Official Documentation

- [NIST SP 800-77 Rev. 1 Guide to IPsec VPNs](https://www.nist.gov/publications/guide-ipsec-vpns)
- [MEF Carrier Ethernet service standards](https://www.mef.net/service-standards/underlay-services/carrier-ethernet/)
- [MEF SD-WAN service standards](https://www.mef.net/service-standards/overlay-services/sd-wan/)
- [Cisco Catalyst SD-WAN design guide](https://www.cisco.com/c/en/us/td/docs/solutions/CVD/SDWAN/cisco-sdwan-design-guide.pdf)
