# Find Transit Gateway Blackholes with Metrics, Logs, and Route Analyzer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, CloudWatch, Flow Logs, Route Analyzer, Troubleshooting

Description: Detect Transit Gateway blackhole and no-route drops, identify the affected attachment and flow, and prove the winning route before changing it.

---

AWS Transit Gateway can drop a packet for two routing reasons that look similar to an application: the destination matched a blackhole route, or no route matched at all. CloudWatch metrics tell you that drops occurred, Transit Gateway Flow Logs identify affected traffic, and AWS Network Manager Route Analyzer evaluates the configured Transit Gateway route path.

Use the three together. A metric alone cannot name the flow, a flow record does not explain every control-plane choice, and Route Analyzer does not inspect VPC route tables or security rules.

## Distinguish Blackhole from No Route

An explicit blackhole route has a destination prefix and a drop action. It is often used to enforce segmentation or prevent a broad default route from reaching a sensitive range. A route can also appear in a blackhole state when its target is no longer usable.

A no-route drop means the associated Transit Gateway route table has no matching active route for the destination.

These are different operational conditions:

| Condition | Meaning | Typical cause |
| --- | --- | --- |
| Blackhole match | The winning prefix deliberately or operationally drops traffic | Explicit deny, stale static target, failed attachment |
| No route | No eligible prefix matched | Missing propagation, wrong association, withdrawn dynamic prefix |

Both require starting from the attachment on which the packet entered Transit Gateway. That source attachment's associated route table performs the lookup.

## Alert on the Correct CloudWatch Metrics

Amazon VPC publishes Transit Gateway metrics in the `AWS/TransitGateway` namespace at 60-second intervals. The relevant counters are:

- `PacketDropCountBlackhole` and `BytesDropCountBlackhole`;
- `PacketDropCountNoRoute` and `BytesDropCountNoRoute`;
- `PacketDropCountTTLExpired` for routing loops or exhausted hop limits.

AWS documents `Sum` as the meaningful statistic for these counters. Do not alarm on `Average` and interpret it as a packet count.

Metrics can be filtered by dimensions including Transit Gateway, Transit Gateway attachment, and supported Availability Zone combinations. Start broad enough to detect the event, then narrow by attachment and zone:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/TransitGateway \
  --metric-name PacketDropCountBlackhole \
  --dimensions Name=TransitGateway,Value=tgw-0123456789abcdef0 \
  --start-time 2026-08-06T10:00:00Z \
  --end-time 2026-08-06T10:15:00Z \
  --period 60 \
  --statistics Sum
```

Replace fixed incident timestamps before running the example. For routine monitoring, use CloudWatch alarms rather than polling.

A useful alarm strategy is:

- alarm immediately on unexpected blackhole drops in a table that should carry allowed traffic;
- alarm on sustained no-route drops above a tested baseline;
- keep expected isolation probes and internet background traffic from obscuring real incidents;
- route alarms to the owner of the source attachment or routing domain.

An intentional blackhole can still deserve an alarm if legitimate traffic suddenly begins matching it. The route is expected; the new traffic may not be.

## Enable Transit Gateway Flow Logs Before the Incident

Transit Gateway Flow Logs capture traffic metadata outside the data path and can publish to CloudWatch Logs, Amazon S3, or Firehose. AWS states that collection does not affect network throughput or latency, but records are not real time and can take several minutes to begin appearing.

Only the Transit Gateway owner can create the flow log unless permissions are delegated. In cross-account environments, arrange central logging during onboarding.

The default record format includes useful version 6 fields. A custom format for routing incidents should preserve at least:

```text
${version} ${account-id} ${tgw-id} ${tgw-attachment-id}
${tgw-pair-attachment-id} ${srcaddr} ${dstaddr} ${srcport}
${dstport} ${protocol} ${packets} ${bytes} ${start} ${end}
${log-status} ${flow-direction} ${packets-lost-no-route}
${packets-lost-blackhole} ${packets-lost-mtu-exceeded}
${packets-lost-ttl-expired}
```

Those `${...}` tokens are the documented Flow Log field syntax, not shell variables. When passing a custom format to a shell command, quote it so the shell does not expand the dollar signs.

Also retain attachment, VPC, subnet, ENI, and Availability Zone fields when cost and storage permit. They accelerate ownership and path mapping.

## Find the Dropped Tuple

For a reported failure, collect:

- source and destination IP;
- protocol and ports;
- incident window in UTC;
- source and destination VPCs;
- expected source attachment;
- whether NAT changes the tuple.

Query records for the smallest useful time window. In CloudWatch Logs Insights, field extraction depends on whether you used the default format or a custom format. Name the parsed fields in exactly the order used when the flow log was created.

A conceptual query after fields have been parsed is:

```text
filter srcaddr = "10.10.4.25" and dstaddr = "10.20.8.40"
| filter packets_lost_blackhole > 0 or packets_lost_no_route > 0
| fields @timestamp, tgw_attachment_id, tgw_pair_attachment_id,
         flow_direction, packets_lost_blackhole, packets_lost_no_route
| sort @timestamp asc
```

Field names in that query are examples for your parsing schema, not built-in aliases guaranteed by CloudWatch Logs Insights.

Check `log-status`:

- `OK` means logging operated normally for the record;
- `NODATA` means no traffic was observed in the interval;
- `SKIPDATA` means records were skipped, so absence is not conclusive.

Metadata fields that are not derived directly from packet headers are documented as best effort and can be missing. Correlate attachment IDs and addresses with deployed state.

## Identify the Route Table Used on Ingress

Map the flow's ingress attachment to its associated Transit Gateway route table. Do not inspect only the default table or the table that contains the destination propagation.

```bash
aws ec2 describe-transit-gateway-route-tables \
  --filters Name=transit-gateway-id,Values=tgw-0123456789abcdef0

aws ec2 get-transit-gateway-route-table-associations \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0
```

Repeat the association call until you find the ingress attachment, or query all tables through automation. Record the association state and table ID.

Then ask which route wins for the exact destination:

```bash
aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
  --filters Name=route-search.longest-prefix-match,Values=10.20.8.40/32
```

Inspect:

- destination prefix;
- active or blackhole state;
- static or propagated type;
- target attachment;
- any more-specific route that overrides an expected summary;
- equal-prefix precedence between static, prefix-list, and propagated route types.

If no route is returned, inspect propagation into this exact table and the state of the attachment that should advertise the prefix.

## Use Route Analyzer for the Transit Gateway Segment

Register the transit gateway in an AWS Network Manager global network, then define source and destination attachments and IP addresses in Route Analyzer. Include the return path when debugging a session.

Route Analyzer can:

- verify a proposed Transit Gateway route-table configuration;
- validate an existing route path;
- identify where Transit Gateway routing prevents connectivity;
- model a declared middlebox hop.

Its official limitations are equally important:

- only Transit Gateway route tables are analyzed;
- VPC route tables are not analyzed;
- security groups and network ACLs are not analyzed;
- customer gateway device routes are not analyzed;
- intra-Region peering is not supported;
- a return result is produced only when the forward analysis succeeds.

Therefore, a successful analysis does not prove the source subnet sends the packet to Transit Gateway or that the destination accepts it.

## Fix the Cause, Not the Counter

For an unintended blackhole:

1. confirm the blackhole is the longest matching route;
2. identify whether it is an explicit deny or a route whose target failed;
3. obtain policy approval before removing an explicit security control;
4. restore or replace the intended target route;
5. verify both forward and return tables;
6. retest the exact tuple and watch the drop fields.

For no route:

1. verify the ingress attachment association;
2. confirm the intended destination attachment is available;
3. enable propagation into the correct table or create an approved static route;
4. check for overlapping CIDRs and unsupported propagation cases;
5. verify VPC subnet routes on both sides;
6. test return routing separately.

Do not add `0.0.0.0/0` merely to make the counter stop. That can turn a contained failure into unintended reachability.

## Account for Expected Drops

An isolation design may intentionally send denied CIDRs to blackhole routes. Separate expected and unexpected signals by:

- Transit Gateway and attachment dimensions;
- traffic domain and owner;
- destination prefixes recovered from Flow Logs;
- change windows and synthetic negative tests;
- historical baselines for internet-bound no-route noise.

Metrics do not have a route-table ID dimension in the documented list. Use the attachment dimension, map the attachment to its current association, and preserve configuration change history so an alarm can be explained at the incident timestamp.

## Official Documentation

- [CloudWatch metrics for AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [Search Transit Gateway Flow Log records](https://docs.aws.amazon.com/vpc/latest/tgw/search-flow-log-records.html)
- [Create Transit Gateway Flow Logs with APIs or CLI](https://docs.aws.amazon.com/vpc/latest/tgw/flow-logs-api-cli.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)

## Conclusion

Use `PacketDropCountBlackhole` and `PacketDropCountNoRoute` with the `Sum` statistic to detect routing drops, Flow Logs to identify the affected tuple and attachment, and Route Analyzer to evaluate the Transit Gateway segment. Always resolve the ingress attachment's actual associated table and winning longest-prefix route before changing policy. Then verify VPC routes and the return path outside Route Analyzer's boundary.
