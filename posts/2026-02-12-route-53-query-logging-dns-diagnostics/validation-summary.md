# Validation Summary: How to Use Route 53 Query Logging for DNS Diagnostics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 public DNS query logging
- Amazon Route 53 Resolver query logging
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- AWS CLI
- Amazon S3
- Amazon Data Firehose / Kinesis Data Firehose

## Sources Consulted
- Amazon Route 53 Developer Guide: Public DNS query logging: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/query-logs.html
- Amazon Route 53 API Reference: CreateQueryLoggingConfig: https://docs.aws.amazon.com/Route53/latest/APIReference/API_CreateQueryLoggingConfig.html
- Amazon Route 53 Developer Guide: Resolver query logging: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html
- Amazon Route 53 Developer Guide: Values that appear in VPC Resolver query logs: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs-format.html
- Amazon Route 53 Developer Guide: Route 53 VPC Resolver query log example: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs-example-json.html
- Amazon Route 53 API Reference: CreateResolverQueryLogConfig: https://docs.aws.amazon.com/Route53/latest/APIReference/API_route53resolver_CreateResolverQueryLogConfig.html
- Amazon CloudWatch Logs User Guide: Logs Insights string functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html

## Issues Found
- Corrected the scope of hosted-zone DNS query logging. AWS Route 53 DNS query logging applies to public hosted zones only; private hosted zone diagnostics are covered through Route 53 Resolver query logging.
- Corrected overbroad statements that Resolver query logging captures every VPC DNS query. AWS documents that repeated queries answered from the Route 53 Resolver cache are not logged.
- Corrected the public DNS query log field order and example line to match AWS's documented format: version, query timestamp, hosted zone ID, query name, query type, response code, protocol, edge location, resolver IP address, and EDNS client subnet.
- Corrected the Resolver query log JSON example and CloudWatch Logs Insights queries to use AWS's documented field names, such as `query_name`, `query_type`, `query_class`, `query_timestamp`, and `transport`.
- Updated the CloudWatch Logs destination ARN in the Resolver query logging example to include the log group wildcard suffix used in AWS's documented valid CloudWatch Logs ARN example.
- Removed unsupported cost-management advice about capture-time log group filters and sampling. Route 53 query logging does not provide record-type/rcode filtering or sampling controls at collection time, so the post now recommends filtering or aggregating after delivery.

## Review Notes
The AWS CLI was not installed in the local environment, so command syntax was verified against official AWS API and AWS CLI documentation rather than local `aws --help` output.
