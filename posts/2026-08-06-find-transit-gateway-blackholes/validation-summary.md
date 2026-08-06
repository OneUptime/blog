# Validation Summary: Find Transit Gateway Blackholes with Metrics, Logs, and Route Analyzer

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS Transit Gateway route tables, attachments, associations, propagation, blackhole routes, and route precedence
- Amazon CloudWatch Transit Gateway metrics and alarms
- AWS Transit Gateway Flow Logs
- Amazon CloudWatch Logs Insights
- AWS Network Manager Route Analyzer
- AWS CLI v2

## Sources Consulted
- [CloudWatch metrics in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [Search AWS Transit Gateway Flow Logs records](https://docs.aws.amazon.com/vpc/latest/tgw/search-flow-log-records.html)
- [Create Transit Gateway Flow Logs with APIs or the AWS CLI](https://docs.aws.amazon.com/vpc/latest/tgw/flow-logs-api-cli.html)
- [AWS Transit Gateway Flow Logs records in Amazon CloudWatch Logs](https://docs.aws.amazon.com/vpc/latest/tgw/flow-logs-cwl.html)
- [CloudWatch Logs Insights `filter` syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Filter.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [AWS CLI v2: `cloudwatch get-metric-statistics`](https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html)
- [AWS CLI v2: `ec2 describe-transit-gateway-route-tables`](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-transit-gateway-route-tables.html)
- [AWS CLI v2: `ec2 get-transit-gateway-route-table-associations`](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-associations.html)
- [AWS CLI v2: `ec2 search-transit-gateway-routes`](https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html)

## Issues Found
- The post implied that destination prefixes can be recovered directly from Transit Gateway Flow Logs. Flow Log records expose the destination address (`dstaddr`), not the destination prefix of the route that matched it. Changed the guidance to map destination IP addresses from Flow Logs to the expected prefixes.

## Review Notes
- The CloudWatch namespace, metric names, supported dimensions, 60-second publication interval, and use of the `Sum` statistic match the current AWS documentation.
- The custom Transit Gateway Flow Log tokens are valid documented fields. The post correctly distinguishes its example underscore-style Logs Insights aliases from the hyphenated Flow Log field tokens and states that parsing must follow the configured record order.
- The AWS CLI command structures, option names, filter names, metric dimensions, and example values were checked against the current AWS CLI v2 documentation and locally validated with AWS CLI 2.27.31 command models. Resource IDs and incident timestamps are intentionally placeholders.
- The Route Analyzer capabilities and limitations, including its Transit Gateway-only scope, global-network registration requirement, unsupported intra-Region peering, and forward-path prerequisite for return-path results, match the current AWS Network Manager documentation.
- All six AWS documentation links included in the post returned HTTP 200 during validation.
