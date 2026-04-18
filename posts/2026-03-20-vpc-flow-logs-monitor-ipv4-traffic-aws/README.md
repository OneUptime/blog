# How to Use VPC Flow Logs to Monitor IPv4 Traffic on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, VPC, Flow Logs, IPv4, Monitoring, Network Security

Description: Learn how to enable and analyze AWS VPC Flow Logs to monitor IPv4 traffic patterns, detect anomalies, and troubleshoot connectivity issues in your VPC.

## Introduction

VPC Flow Logs capture information about IP traffic flowing through network interfaces in your VPC. For IPv4 monitoring, flow logs provide source and destination IPs, ports, protocols, packet counts, and whether traffic was accepted or rejected by security groups and NACLs.

## Enabling VPC Flow Logs

### Via AWS Console

1. Navigate to VPC → Your VPC → Flow logs tab
2. Click **Create flow log**
3. Configure:
   - Filter: All / Accept / Reject
   - Destination: CloudWatch Logs or S3
   - IAM Role (for CloudWatch)

### Via AWS CLI

```bash
# To CloudWatch Logs

aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxxxxxxxxxxxxxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs \
  --deliver-logs-permission-arn arn:aws:iam::123456789:role/flowlogs-role
```

```bash
# To S3
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxxxxxxxxxxxxxx \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/vpc-logs/
```

## Understanding Flow Log Format

Default flow log fields:

```text
version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status
```

Example record:

```text
2 123456789012 eni-abcdef01 10.0.1.10 10.0.2.20 54321 443 6 10 4340 1609459200 1609459260 ACCEPT OK
```

## Querying Flow Logs with CloudWatch Insights

Find rejected IPv4 traffic:

```text
fields @timestamp, srcAddr, dstAddr, dstPort, action
| filter action = "REJECT" and ispresent(srcAddr)
| filter srcAddr not like /:/
| stats count() as rejectCount by srcAddr, dstPort
| sort rejectCount desc
| limit 20
```

Top talkers by traffic volume:

```text
fields @timestamp, srcAddr, dstAddr, bytes
| stats sum(bytes) as totalBytes by srcAddr
| sort totalBytes desc
| limit 10
```

## Querying Flow Logs with Athena (S3 Destination)

Create an Athena table:

```sql
CREATE EXTERNAL TABLE vpc_flow_logs (
  version int,
  account string,
  interfaceid string,
  sourceaddress string,
  destinationaddress string,
  sourceport int,
  destinationport int,
  protocol int,
  numpackets int,
  numbytes bigint,
  starttime int,
  endtime int,
  action string,
  logstatus string
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ' '
LOCATION 's3://my-flow-logs-bucket/vpc-logs/';
```

Query rejected traffic:

```sql
SELECT sourceaddress, destinationport, count(*) as rejects
FROM vpc_flow_logs
WHERE action = 'REJECT'
GROUP BY sourceaddress, destinationport
ORDER BY rejects DESC
LIMIT 20;
```

## Conclusion

VPC Flow Logs provide essential visibility into IPv4 traffic in your AWS environment. Use CloudWatch Logs Insights for real-time analysis and Athena for historical queries against S3-stored logs to understand traffic patterns, detect threats, and resolve connectivity issues.
