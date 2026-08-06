# Direct Connect with VPN Backup Through Transit Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, Direct Connect, Site-to-Site VPN, BGP, Hybrid Networking

Description: Build a Direct Connect primary path with an independent VPN backup through Transit Gateway, while keeping failover symmetric in both directions.

---

Adding an AWS Site-to-Site VPN beside AWS Direct Connect does not automatically create a working backup. The two paths must advertise compatible prefixes, Transit Gateway must learn both, the customer router must prefer the same primary path, and stateful devices must see a symmetric flow before and after failure.

The goal is not merely to make two BGP sessions appear as `UP`. The goal is to make the path change as one coherent routing event:

| Direction | Normal path | Failure path |
| --- | --- | --- |
| VPC to on-premises | Transit Gateway to Direct Connect gateway | Transit Gateway to Site-to-Site VPN |
| On-premises to VPC | Customer router to Direct Connect | Customer router to Site-to-Site VPN |

If only one row changes, traffic becomes asymmetric. A stateful firewall, NAT device, or connection-tracking router can then drop packets even though every route table contains a plausible route.

## Choose a Backup That Survives the Intended Failure

There are two materially different ways to combine VPN and Direct Connect:

- An internet-routed Site-to-Site VPN uses public tunnel endpoints and can provide path diversity from a Direct Connect circuit, subject to the independence of the customer edge, carrier, power, and physical entrance.
- A private-IP Site-to-Site VPN runs over a Direct Connect transit virtual interface through a Direct Connect gateway and Transit Gateway. It adds IPsec encryption to that path, but a failure of the underlying Direct Connect connectivity removes the VPN transport too.

Private-IP VPN can be useful when encryption over Direct Connect is the objective. It is not the right answer when the failure scenario is loss of Direct Connect itself.

Also decide whether the VPN is a temporary backup or part of the steady-state capacity design. The examples below assume active-passive operation: Direct Connect is preferred while its route exists, and the internet-based VPN becomes active only after withdrawal.

## Trace All Four Routing Decisions

A hybrid flow crosses more than one routing domain. Document each one explicitly.

1. The source VPC subnet route table sends the on-premises prefix to Transit Gateway.
2. The route table associated with the source VPC attachment selects the Direct Connect gateway attachment or VPN attachment.
3. The on-premises router selects Direct Connect or VPN for AWS prefixes.
4. The route table associated with the attachment on which return traffic enters Transit Gateway selects the destination VPC attachment, or an inspection attachment if one is required.

Transit Gateway association and propagation have different jobs. An attachment can be associated with only one Transit Gateway route table, which is used for packets arriving from that attachment. An attachment can propagate routes into multiple route tables. Therefore, a typical design does the following:

- Propagates on-premises BGP routes from both the Direct Connect gateway and VPN attachments into the route tables used by spoke VPC attachments.
- Propagates VPC routes, or installs deliberate summaries, into the route tables associated with the Direct Connect gateway and VPN attachments.
- Adds explicit VPC subnet routes to Transit Gateway for on-premises destinations in both the application and return-path subnets.

A route that is visible in one Transit Gateway route table says nothing about a packet that arrives on an attachment associated with another table.

## Let Dynamic Withdrawal Expose the Backup

Transit Gateway first uses longest-prefix matching. For identical destination CIDRs, a static Transit Gateway route is preferred over a propagated route. Among propagated routes with the same CIDR, a Direct Connect gateway route is preferred over a Site-to-Site VPN route.

That behavior is useful for this design. Advertise the same on-premises prefix length over both BGP paths and propagate both attachments into the spoke-facing route table. While both advertisements exist, Transit Gateway selects Direct Connect. AWS documents that only the preferred route is displayed; the VPN backup appears after the active advertisement is withdrawn.

This has three operational consequences:

- Do not expect the console to show two active entries for the same CIDR.
- Do not install a same-prefix static route to the Direct Connect attachment as a way to express preference. The static route remains after BGP withdrawal and can become a blackhole instead of exposing the VPN route.
- Do not advertise a more-specific prefix only over the VPN unless it is intentionally meant to win. Longest-prefix matching is evaluated before attachment-type preference.

For example, `10.40.0.0/16` over Direct Connect cannot remain primary if the VPN advertises `10.40.1.0/24` for traffic to that `/24`.

Search the actual route table rather than relying only on a diagram:

```bash
aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
  --filters Name=route-search.exact-match,Values=10.40.0.0/16
```

Record the selected attachment while both paths are healthy, then repeat the query after deliberately withdrawing the Direct Connect advertisement.

## Make the Customer Router Prefer the Same Path

Transit Gateway route preference controls traffic from AWS toward on-premises. It does not configure the customer router's decision for traffic toward AWS.

On the customer side, apply a higher BGP local preference to AWS prefixes learned over Direct Connect and a lower local preference to the same-length prefixes learned over VPN. Local preference is vendor-specific configuration, but the intended routing information base should be unambiguous:

| AWS prefix | Learned through | Customer local preference | Expected state |
| --- | --- | ---: | --- |
| `10.100.0.0/16` | Direct Connect | 200 | Best |
| `10.100.0.0/16` | VPN | 100 | Backup |

Do not depend on MED across unlike networks unless the complete policy is documented and tested. Do not depend on AS-path prepending to overcome a longer prefix. The customer router always evaluates its own routing policy and longest-prefix rules.

For the Direct Connect side, the allowed-prefix list on the Direct Connect gateway association is especially important. With a Transit Gateway association, those are the exact prefixes advertised toward on-premises over the transit virtual interface; they are not merely filters on VPC CIDRs. Keep the list aligned with the AWS prefixes that should also be reachable over VPN. AWS warns that changing an allowed prefix can delay or drop traffic that uses that prefix, so do not combine an allowed-prefix edit with a failover test.

If multiple Direct Connect virtual interfaces exist, Direct Connect local-preference communities can choose among those Direct Connect paths. They do not replace the customer-side policy that chooses between Direct Connect and the VPN.

## Keep Stateful Inspection Symmetric

For each important source and destination pair, write down the forward and return next hop in normal, degraded, and recovery states. Include every stateful device on premises and in AWS.

Transit Gateway appliance mode preserves Availability Zone affinity for a flow through an appliance VPC attachment. It does not make customer-edge BGP policy symmetric, synchronize firewall state across Direct Connect and VPN edges, or preserve an established transport session when the path changes.

Plan for existing sessions to reset during failover. A routing backup provides reachability for new or retried connections; it does not promise session continuity. Applications should use bounded timeouts, retries with jitter, and idempotent operations where appropriate.

Common asymmetric designs include:

- AWS prefers Direct Connect, but the customer router prefers VPN.
- The primary and backup advertise different AWS or on-premises prefix lengths.
- Only the Direct Connect ingress route table contains the application VPC return route.
- The VPN terminates on a different stateful customer edge whose peer does not share session state.
- A central inspection route exists for IPv4 on one path but bypasses inspection on the backup path.

## Test Failure, Not Just Reachability

A useful failover exercise changes one condition at a time and observes both directions.

1. Establish continuous TCP probes and representative application requests in both directions.
2. Capture the selected BGP path on the customer router and the selected Transit Gateway route.
3. Shut down the relevant Direct Connect BGP peering while leaving the physical circuit up, so routes learned through that peering are withdrawn on both sides.
4. Verify that the VPN route becomes selected and that new bidirectional sessions succeed.
5. Restore BGP, wait for the route to stabilize, and verify controlled failback.
6. Repeat for a virtual-interface failure, complete Direct Connect path failure, each VPN tunnel, and the customer-edge device.

Testing only by disabling a physical interface can hide policy errors. Test loss of the BGP peering because withdrawal of the propagated Direct Connect route is the signal Transit Gateway uses to expose the backup, and withdrawal of AWS routes from the customer router makes the reverse direction fail over too. Separately test loss of the physical path because it exercises carrier and edge dependencies.

Do not publish a universal convergence target. BGP timers, tunnel detection, customer equipment, route scale, and application retry behavior all contribute. Measure the end-to-end interruption and set the recovery objective from evidence.

## Monitor the Control Plane and the Data Plane

Alarm on signals that explain why a route should change:

- Direct Connect `ConnectionState`, `VirtualInterfaceBgpStatus`, `VirtualInterfaceBgpPrefixesAccepted`, and `VirtualInterfaceBgpPrefixesAdvertised` metrics.
- Site-to-Site VPN `TunnelState`, `TunnelDataIn`, and `TunnelDataOut` for each tunnel.
- VPN tunnel logs for IKE, IPsec, dead-peer-detection, and BGP events.
- Customer-router BGP state, accepted-prefix counts, and best-path changes.

Then add end-to-end probes. A BGP session can be established while an application prefix is filtered, a return route is absent, or a firewall drops the flow. Transit Gateway Flow Logs help correlate the attachment path and Transit Gateway packet-loss reasons, while VPC Flow Logs show network-interface-level accept or reject behavior. Transit Gateway Flow Logs are not a real-time stream.

## Deployment Checklist

- The VPN uses an independent transport for the failure it is meant to cover.
- Direct Connect and VPN advertise the intended on-premises prefixes at compatible lengths.
- Direct Connect allowed prefixes and VPN-learned AWS routes cover the same required destinations.
- Both dynamic attachments propagate into every spoke-facing Transit Gateway route table that needs them.
- No static route masks the dynamic backup for the same destination.
- The customer router prefers Direct Connect and retains VPN as a valid lower-preference path.
- Every ingress route table has a return path to the VPCs it serves.
- Stateful inspection is symmetric in normal, failed, and recovered states.
- Both VPN tunnels and the complete Direct Connect failure domain are tested.
- Monitoring includes route state and application-level probes.

## Official Documentation

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Direct Connect routing policies and BGP communities](https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html)
- [Allowed prefixes interactions for Direct Connect gateways](https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html)
- [Private IP Site-to-Site VPN connections](https://docs.aws.amazon.com/vpn/latest/s2svpn/private-ip-dx.html)
- [Monitor Direct Connect with CloudWatch](https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-cloudwatch.html)
- [Monitor Site-to-Site VPN tunnels with CloudWatch](https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)

## Conclusion

A reliable VPN backup is a routing design, not an extra attachment. Use independent transport, advertise equivalent prefixes, let Direct Connect withdrawal expose the propagated VPN route, and configure the customer router to make the matching decision in the opposite direction. Test the entire forward and return path under controlled failures before calling the design resilient.
