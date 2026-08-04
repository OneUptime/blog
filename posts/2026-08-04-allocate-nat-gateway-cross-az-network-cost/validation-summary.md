# Validation Summary: Attribute NAT Gateway and Cross-AZ Cost to Traffic Generators

## Status

validated

## Post Type

Technical guide / FinOps allocation reference

## Technologies Covered

- Amazon Web Services (AWS)
- Amazon Virtual Private Cloud (Amazon VPC)
- Zonal and regional NAT gateways
- AWS Cost and Usage Reports (CUR) and AWS Data Exports
- VPC Flow Logs
- Amazon CloudWatch NAT gateway metrics
- Availability Zones and AZ IDs
- Cross-Availability-Zone data transfer
- FinOps showback and cost allocation

## Sources Consulted

- [Amazon VPC: Pricing for NAT gateways](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html)
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [Amazon VPC: NAT gateway basics](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html)
- [Amazon VPC: Regional NAT gateways for automatic multi-AZ expansion](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html)
- [AWS Data Exports: Understanding data transfer charges](https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html)
- [AWS Data Exports: Cost and Usage Report line item columns](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [Amazon VPC: VPC Flow Log record fields](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html)
- [Amazon VPC: Flow Log limitations](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html)
- [Amazon VPC: Flow Log record examples for NAT traffic](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-records-examples.html)
- [Amazon VPC: NAT gateway CloudWatch metrics and dimensions](https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html)
- [Amazon EC2: Delete a network interface](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/delete_eni.html)
- [Amazon VPC: Map shared subnets across Availability Zones](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing-share-subnet-working-with.html#vpc-sharing-map-availability-zones)

## Issues Found

- The hourly-charge description covered only the traditional zonal billing model. AWS also offers regional NAT gateways, whose gateway hours are billed for each Availability Zone in which the gateway is configured. The charge description and fixed-cost guidance now distinguish zonal and regional gateway hours and preserve AZ-level grain for regional gateways.
- The CloudWatch control-total statement described every NAT metric as gateway-grain data. Regional NAT gateway metrics use both `NatGatewayId` and `AvailabilityZone` dimensions. The statement now identifies gateway-and-AZ grain for regional gateways.
- The Flow Log field list used conceptual VPC, subnet, Region, and Availability Zone labels rather than the actual custom-format field names, and omitted the identifier needed for regional NAT gateway records. The list now uses `vpc-id`, `subnet-id`, `region`, `az-id`, and `resource-id`.
- The cross-account topology guidance did not account for account-specific Availability Zone name mappings. The post now requires normalizing AZ names to AZ IDs before comparing source and gateway locations across accounts.
- The inventory warning said that both addresses and interfaces could be reused after deletion. AWS documents that deleting a network interface releases its addresses for reuse; the deleted interface itself is not the reused identity. The text now states that addresses can be reassigned and interfaces can be deleted.
- The original NAT processing formula divided each source's observed bytes by all observed bytes and multiplied the result by the complete CUR pool. That necessarily normalized incomplete telemetry to 100 percent and contradicted the later residual-cost policy. The formula now applies an independently measured coverage ratio, allocates only the supported portion, and sends the remainder to a named residual. The same coverage-aware rule now applies to cross-AZ allocations.
- The validation checklist required reporting skipped-record counts, but `SKIPDATA` only indicates that some records were skipped during an aggregation interval; it does not provide the exact number skipped. The checklist now calls for reporting `SKIPDATA` indicators or affected intervals.
- The validation checklist said that no flow could be present at multiple observation points, even though the post correctly explains that the same traffic can appear on multiple monitored interfaces. It now requires that no flow be counted from multiple observation points.

## Review Notes

The post contains conceptual allocation formulas rather than executable code or terminal commands. After the corrections above, the formulas reconcile source allocations and named residuals to the CUR billing pools. Service-specific data-transfer pricing exceptions still need to be maintained in the implementation's reviewed product-and-usage-type mapping, as the post states.
