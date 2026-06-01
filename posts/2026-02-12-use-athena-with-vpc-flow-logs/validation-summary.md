# Validation Summary: How to Use Athena with VPC Flow Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS VPC Flow Logs
- Amazon S3
- Amazon Athena
- AWS CLI
- SQL
- IANA protocol numbers

## Sources Consulted
- Amazon Athena User Guide: Create and query a table for Amazon VPC flow logs using partition projection: https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs-partition-projection.html
- Amazon VPC User Guide: Flow log files: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3-path.html
- Amazon VPC User Guide: Flow log records: https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- Amazon Athena User Guide: Set up partition projection: https://docs.aws.amazon.com/athena/latest/ug/partition-projection-setting-up.html
- AWS CLI Command Reference: ec2 create-flow-logs: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- IANA Assigned Internet Protocol Numbers: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml

## Issues Found
- The post described default S3 flow logs as raw text files. AWS documents that VPC Flow Logs text delivery is Gzip-compressed, so the wording now says "Gzip-compressed text files."
- The post stated that a 600-second aggregation interval reduces log volume without qualification. AWS documents that Nitro-based instance network interfaces always use an aggregation interval of 60 seconds or less, regardless of the configured value, so the aggregation guidance now includes that caveat.
- The post described rejected flows only as security group or network ACL blocks. AWS also documents rejected records for packets that arrive after a connection is closed, so the rejected-traffic explanation now says "often" and mentions the additional case.
- The port scan section said 20+ ports is "almost certainly" scanning. That is too absolute for operational traffic analysis, so it now describes the result as a strong signal worth investigating.
- The asymmetric-flow query did not compare the original destination port to the return flow source port, which could hide missing return traffic if any reverse traffic existed between the same two IPs on the same protocol. The join now includes `AND o.dstport = i.srcport`.
- The troubleshooting text described missing response traffic as specifically a routing or security group issue. The wording now also includes network ACL and application issues.

## Review Notes
The Athena DDL, partition projection properties, S3 prefix structure, AWS CLI options, custom log format fields, and protocol number mappings are consistent with current AWS and IANA documentation. The local environment did not have the `aws` CLI installed, so CLI verification was performed against the current official AWS CLI documentation rather than local `--help` output.
