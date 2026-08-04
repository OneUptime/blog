# Attribute NAT Gateway and Cross-AZ Cost to Traffic Generators

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Showback, Amazon VPC, NAT Gateway, Data Transfer, VPC Flow Logs, FinOps

Description: Join AWS billing data with flow and network inventory so shared NAT processing and cross-AZ costs follow the workloads that generated traffic.

---

A NAT gateway often lives in a networking account, so its bill points to the network team while the bytes originate in application subnets. Charging the gateway owner for all usage hides the behavior that creates variable cost. Charging every NAT dollar by bytes also misstates the fixed hourly service.

Split the bill into fixed and variable pools, measure traffic at one controlled observation point, and attribute each pool with an explicit policy.

## Separate the Charges

AWS charges a NAT gateway for:

- each hour the gateway is available;
- each gigabyte the gateway processes.

Traffic can incur additional data-transfer charges. AWS documents same-Region, cross-Availability-Zone usage with a usage type ending in `DataTransfer-Regional-Bytes`; for a metered resource, both inbound and outbound sides can produce line items. Service-specific exceptions exist, so the product's pricing rules remain authoritative.

In CUR, identify the actual monthly rows using at least:

- `lineItem/ProductCode`;
- `lineItem/UsageType`;
- `lineItem/Operation`;
- `lineItem/ResourceId` when available;
- account, Region, Availability Zone, and usage interval;
- the selected effective or unblended cost basis.

NAT usage types commonly have regional prefixes and suffixes such as `NatGateway-Hours` and `NatGateway-Bytes`. Match a reviewed product-and-usage-type mapping, not an unscoped substring across the whole CUR.

Create independent pools:

```text
nat_fixed_cost
nat_processing_cost
cross_az_transfer_cost
other_network_transfer_cost
```

This allows different drivers and prevents a team with one short burst from absorbing the entire monthly gateway-hour charge.

## Allocate Variable Cost to the Generator

For NAT data processing, the best driver is the bytes from each source workload that traversed the gateway. VPC Flow Logs provide flow records with byte counts. Custom formats can include:

- `interface-id`;
- `srcaddr` and `dstaddr`;
- `pkt-srcaddr` and `pkt-dstaddr`, which preserve packet-level original addresses through an intermediate layer;
- `flow-direction`;
- `account-id`, VPC, subnet, Region, and Availability Zone;
- `start`, `end`, `bytes`, `action`, and `log-status`.

Map the original private source address and source network interface to a resource and owner using a time-bounded network inventory. Current-state lookup is insufficient because addresses and interfaces can be reused after deletion.

For each NAT gateway and interval:

```text
source_weight
  = accepted_source_bytes / accepted_bytes_for_gateway

source_nat_processing_cost
  = CUR_nat_processing_cost * source_weight
```

Using CUR dollars as the pool and flow bytes as weights is safer than treating Flow Logs as an invoice meter. Flow Logs can be skipped, delayed, or differ from billing data. The allocation should reconcile to CUR even when telemetry coverage is imperfect.

## Choose One Observation Point

A packet can appear in records for more than one monitored network interface. Summing workload-interface and NAT-interface logs can therefore count the same traffic twice.

Document one canonical approach, for example:

1. use accepted records from source workload interfaces;
2. select traffic whose route snapshot points to the target NAT gateway;
3. use both request and response bytes under one documented direction rule;
4. aggregate by source resource and gateway;
5. discard duplicate observation points;
6. scale the resulting weights to the CUR processing-cost pool.

Alternatively, use NAT-gateway flow records with packet-level original addresses if that deployment and log format provide the required identity. Test the method with a controlled workload before using it for showback.

CloudWatch NAT metrics such as `BytesInFromSource`, `BytesOutToDestination`, `BytesInFromDestination`, and `BytesOutToSource` are valuable control totals at gateway grain. They do not identify the application source by themselves.

## Attribute Cross-AZ Transfer to the Causing Path

If a workload in Availability Zone A uses a zonal NAT gateway in Availability Zone B, traffic crosses an AZ boundary before reaching the gateway. AWS recommends keeping resources and their NAT gateway in the same AZ, or deploying a gateway per AZ, to reduce transfer charges and improve resilience.

Allocate the complete cross-AZ pool for that path to the traffic generator when all of these are known:

- source resource and source AZ;
- route table active during the interval;
- NAT gateway and gateway AZ;
- flow bytes;
- corresponding CUR transfer rows.

Do not assume every `DataTransfer-Regional-Bytes` row is caused by NAT. The same usage-type family can represent other same-Region cross-AZ paths. First classify the topology: NAT, load balancer, peering, database, replication, or another service.

Also avoid allocating only one visible side of a two-sided metered transfer. Build the billing pool from all in-scope CUR rows and then assign that pool once to the generator using normalized weights.

## Treat Gateway Hours as Shared Capacity

NAT gateway hourly cost exists even with no traffic. Reasonable policies include:

- central network platform cost;
- equal split across subnets configured to use the gateway;
- split by active resource-hours behind the gateway;
- split by a trailing, rather than instantaneous, traffic share;
- direct assignment where one product requested a dedicated gateway.

Traffic bytes are not automatically the best driver for fixed availability. A quiet production subnet may require the gateway for readiness while a one-day batch creates most monthly bytes. Label this as a FinOps policy and version it.

A useful hybrid is:

```text
team_network_cost
  = traffic_weighted_processing
  + traffic_weighted_cross_az
  + policy_weighted_gateway_hours
```

Keep every term visible in the report.

## Handle Gaps Explicitly

Create residual reasons rather than guessing:

- `flow_logs_not_enabled`;
- `SKIPDATA_or_delivery_gap`;
- `source_ip_not_in_inventory`;
- `route_history_missing`;
- `shared_service_no_workload_identity`;
- `billing_row_not_topology_classified`.

If telemetry covers 92 percent of gateway bytes, allocate the supported 92 percent and send the remaining cost to a named residual under the approved fallback. Do not inflate known sources to 100 percent unless the policy explicitly permits normalization and reports the coverage ratio.

## Validate the Result

- NAT processing allocations sum to the CUR NAT processing pool.
- Gateway-hour allocations sum to the CUR gateway-hour pool.
- Cross-AZ allocations sum to the specifically classified transfer rows.
- No flow is present at multiple observation points.
- Source ownership is resolved as of the flow time, not query time.
- Flow-log coverage and skipped-record counts are reported.
- NAT CloudWatch byte metrics are directionally consistent with allocated flow bytes.
- Unallocated and central amounts remain visible.

The output should let a team reduce its cost by reducing egress, using an appropriate VPC endpoint, or correcting a cross-AZ route. That makes showback actionable rather than merely moving a networking bill.

## Official Documentation

- [Amazon VPC: Pricing for NAT gateways](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html)
- [Amazon VPC: NAT gateway basics and zonal resiliency](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html)
- [AWS Data Exports: Understanding data transfer charges](https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html)
- [Amazon VPC: VPC Flow Log record fields](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html)
- [Amazon VPC: Flow Log limitations](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html)
- [Amazon VPC: NAT gateway CloudWatch metrics](https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html)
- [Amazon VPC: Flow Log record examples for NAT traffic](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-records-examples.html)

## Conclusion

Charge NAT processing and attributable cross-AZ transfer to the workloads that generate the traffic, using CUR as the cost control and one deduplicated flow-log view as the driver. Allocate gateway hours with a documented shared-capacity policy. AWS records the charges and network telemetry; the choice of fixed-cost owner remains an explicit organizational decision.
