# How to Plan a Low-Downtime Migration to Colocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Migration, Change Management, Business Continuity, Backup

Description: Reduce colocation migration downtime with dependency mapping, prebuilt capacity, data replication, cutover gates, rollback, and validation.

---

The safest low-downtime colocation move is usually a logical migration to ready capacity, followed by physical relocation of non-critical or redundant equipment. Moving the only production server creates a downtime floor equal to shutdown, transport, racking, cabling, boot, and recovery.

## Set recovery objectives and scope

For each service, define maximum acceptable outage, recovery point, degraded capacity, and rollback deadline. Identify business owners who can accept risk and validate service.

Build an inventory with:

- server, storage, network, power, rack, and rail details
- IP addresses, DNS, certificates, licenses, and external allowlists
- upstream and downstream application dependencies
- identity, time, monitoring, backup, and management dependencies
- data volume, change rate, consistency method, and replication support
- shutdown and startup order

Trace actual flows and logs to verify the dependency map. An undocumented authentication, DNS, firewall, or license-server dependency often causes more downtime than moving the hardware.

## Prepare the destination first

Accept the cabinet, power, cooling, cross-connects, Internet, private circuits, and out-of-band path before scheduling production. Install and label PDUs, switches, firewalls, console servers, and management access. Test A/B power failure, carrier failover, MTU, routing, DNS, monitoring, and remote-hands procedures.

Use a pilot device to verify rack depth, rails, optics, patching, and provider access. Equinix's installation guidance is one example of why facility-specific cabinet and cabling rules must be checked before arrival.

Reserve IP space, BGP policy, VPNs, firewall rules, certificates, and third-party allowlist changes. Lower DNS TTLs only for records that will change and do so early enough for old values to expire.

## Choose a migration pattern

Prefer one of these patterns where the application permits it:

- build replacement capacity at colocation, replicate data, shift traffic, then retire old hardware
- move one member at a time from an already redundant cluster
- seed data offline, continuously replicate the delta, then perform a short write freeze
- run old and new sites in parallel behind load balancing or routing controls

Validate application support for split-site latency and version skew. A stretched cluster can increase risk if quorum, storage, or heartbeat paths were designed for a LAN.

If irreplaceable hardware must move, calculate the physical critical path and arrange temporary service elsewhere. NIST contingency guidance recommends recovery procedures in logical sequence, with escalation steps and alternate-site materials identified.

## Estimate data-transfer time

Use measured effective throughput, not interface speed:

```text
transfer seconds = data bytes x 8 / effective bits per second
```

Moving a 12 TB delta over a 1 Gbps link at 70 percent effective throughput takes roughly:

```text
12 x 10^12 x 8 / (0.70 x 10^9) = 137,143 seconds
                                         about 38 hours
```

Account for ongoing change rate. Replication never catches up if new data is created as fast as it can be copied. Measure checksum or application-level consistency and test restore separately from replication health.

## Build waves and cutover gates

Group systems by dependency and rollback behavior. Move low-risk internal services first, then redundant members, then stateful systems, and finally shared network or storage components only when their consumers are ready.

Every wave needs:

- entry criteria and named decision owner
- precise changes in execution order
- monitoring and user-visible validation
- time budget for each stage
- rollback trigger, latest rollback start, and reverse procedure
- communications, vendor, carrier, and facility contacts

A cutover gate might require replication lag below 60 seconds, current backup restore tested, destination error rate at baseline, and surviving old capacity healthy. Write actual thresholds for the service.

## Rehearse the complete move

Run a tabletop for the people and a technical rehearsal for scripts, data sync, routing, and validation. Time each step. Test loss of a destination carrier, failed new server, bad route, stalled replication, missing shipment, and inability to enter the facility.

Keep configuration exports and runbooks available outside both sites. Confirm that out-of-band access does not depend on the network being changed.

## Execute and validate

Freeze unrelated changes. Start with health and backup gates, quiesce writes only when required, perform final sync, and shift traffic using the application’s supported cutover procedure. For single-writer systems, prevent writes to the old primary before enabling writes at the destination. Shift a small portion of traffic and expand only where both sites can safely serve it with consistent data and service indicators remain within thresholds.

Validate externally: transactions, authentication, background jobs, queues, replication, backup, monitoring, logging, latency, packet loss, and security controls. Do not dismantle the old environment at first success. Hold it in a defined recoverable state until the observation window closes. If the destination has accepted writes, rollback must synchronize or reconcile those changes before returning writes to the old site; retaining old hardware alone is not sufficient.

Afterward, restore DNS TTLs, remove temporary access, update diagrams and inventory, reconcile shipped equipment, and close only after backup and failure tests pass at the new site.

## Conclusion

Low downtime comes from prebuilt destination capacity, measured replication, dependency-aware waves, explicit gates, and a timed rollback. When possible, move service logically before moving the hardware that used to provide it.

## Official Documentation

- [NIST SP 800-34 Rev. 1 contingency planning guide](https://www.nist.gov/publications/contingency-planning-guide-federal-information-systems-including-updates-through)
- [Equinix customer installation guidelines](https://docs.equinix.com/colocation/colo-customer-install-guidelines/)
- [Equinix Smart Hands order types](https://docs.equinix.com/smart-hands/ordering/order-types/)
- [Equinix inbound shipment requirements](https://docs.equinix.com/smart-hands/shipping-receiving/sh-inbound-shipments/)
