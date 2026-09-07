# How to Design Redundant Internet Connectivity for a Single Colocation Rack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Networking, High Availability, BGP, Disaster Recovery

Description: Design one colocation rack to survive link, carrier, router, switch, and power failures without hiding a shared physical dependency.

---

Buying two Internet circuits does not by itself create redundancy. Both may use the same building entrance, meet-me room, fiber tray, router, power feed, or upstream carrier. Begin with the failures the rack must survive and trace every dependency.

## Define the failure objective

Write explicit statements such as:

- one carrier circuit can fail without losing public reachability
- one edge router or top-of-rack switch can be maintained without an outage
- loss of power feed A or B leaves enough network and server capacity
- maintenance and failure convergence remain within the application objective

Decide whether the design covers only equipment and circuit failures or also a facility-wide outage. One rack in one building cannot survive loss of that building, regardless of internal duplication.

## Draw physical paths end to end

For each circuit, document:

```text
carrier PoP -> outside plant -> building entrance -> meet-me room
-> provider panel -> cross-connect -> customer panel -> optic
-> edge router -> switch -> server
```

Ask the facility and carriers which segments are guaranteed diverse. Equinix documents, for example, that ordinary cross-connects inside an IBX are not guaranteed to travel diverse paths, while its specifically diverse campus product has a separated external route. Product names and assurances vary, so put required separation in the order.

Create a shared-risk table covering conduits, patch panels, line cards, chassis, software, management, power, and cooling. Two retail carriers can still buy the same underlying transport.

## Choose the routing model

Common options include:

- provider-assigned addresses with first-hop or static failover managed by the provider
- portable addresses announced with BGP to two independent providers
- one provider with redundant ports and a managed routing service

Portable addressing and BGP provide routing control but add registry, filtering, security, and operational duties. If using BGP, obtain an ASN or agree on an approved private-AS design, define inbound and outbound policy, and filter by exact prefixes. RFC 8212 requires default-reject behavior for eBGP: routes are not eligible for selection without an explicit import policy and are not advertised without an explicit export policy.

Use maximum-prefix limits, route-origin validation where supported, documented communities, and a controlled maintenance policy. Do not accept a full routing table unless the routers have capacity and the design needs it. A default route from each provider is sufficient for many small deployments.

## Remove rack-level single points

A practical design uses two edge devices, two top-of-rack paths, and dual-homed servers or a deliberate redundant load-balancing layer. Connect each network device to independent A and B power paths where its hardware supports it. Place single-PSU devices behind an approved transfer mechanism or treat them as a known risk.

Do not connect both carrier handoffs to one line card or one unmanaged switch. Synchronize only the state that must survive; shared state systems can themselves become a failure domain.

Size remaining capacity after a failure. If both 1 Gbps links regularly carry 700 Mbps in the same direction, losing one link may push the survivor to 1.4 Gbps, which cannot work. Shape, shed, or purchase enough capacity for the intended degraded mode.

## Control convergence and sessions

Use routing timers and Bidirectional Forwarding Detection only when both parties support and have tested them. Very aggressive timers can turn transient loss or control-plane load into route churn.

Applications must tolerate the planned convergence interval. Existing TCP sessions may fail or time out when egress changes the NAT mapping, stateful firewalls lose session state, or providers filter the new source path. A path change alone need not break TCP if endpoint addresses and ports remain unchanged and required state remains available. Test routing asymmetry, source-address validity, NAT, health checks, DNS behavior, and upstream anti-spoofing.

## Prove the design with failure tests

During an approved window, capture traffic and timestamps while testing:

1. carrier circuit A down
2. carrier circuit B down
3. router A restart or maintenance
4. router B restart or maintenance
5. switch or port-channel member failure
6. power feed A down, restore and verify A, then test B down

For each, measure detection time, route convergence, packet loss, session impact, and surviving utilization. Verify monitoring through an independent external vantage point. A dashboard reached over the failed circuit cannot report the outage reliably.

Repeat tests after routing, cabling, firmware, or carrier changes, and preserve a current escalation list and rollback procedure.

## Conclusion

Redundant Internet for one rack requires independent physical paths, routing policy, edge equipment, switching, power, and enough degraded capacity. Map shared risks, make diversity contractual, and prove each failure mode rather than trusting two circuit labels.

## Official Documentation

- [IETF BGP-4 specification, RFC 4271](https://www.rfc-editor.org/rfc/rfc4271)
- [IETF BGP operations and security, RFC 7454](https://www.rfc-editor.org/rfc/rfc7454)
- [IETF default external BGP policy, RFC 8212](https://www.rfc-editor.org/rfc/rfc8212)
- [Equinix cross-connect products and diversity notes](https://docs.equinix.com/cross-connect/)
