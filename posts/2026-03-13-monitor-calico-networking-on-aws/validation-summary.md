# Validation Summary: Monitor Calico Networking on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Felix
- Kubernetes
- AWS VPC Flow Logs
- Amazon CloudWatch Logs and CloudWatch alarms
- Prometheus
- Grafana
- Prometheus Node Exporter

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- AWS CLI documentation: create-flow-logs - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon VPC documentation: Flow log records - https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- Amazon CloudWatch Logs documentation: Supported logs and discovered fields - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html
- Amazon CloudWatch Logs documentation: Sample queries for VPC flow logs - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html
- Amazon VPC documentation: CloudWatch metrics for your VPCs - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cloudwatch.html
- Prometheus Node Exporter project documentation - https://github.com/prometheus/node_exporter

## Issues Found
- The introduction said Felix metrics show policy enforcement decisions. Current Calico Felix Prometheus metrics primarily expose endpoint, policy, selector, and data plane health metrics; the post was updated to describe those accurately.
- The CloudWatch Logs Insights query was described as directly querying cross-AZ traffic. VPC Flow Logs provide flow metadata such as source IP, destination IP, bytes, and action, but same-AZ versus cross-AZ classification requires enrichment with node or pod IP-to-AZ inventory. The text and query were updated to reflect that requirement.
- The Grafana example used `felix_policy_passed_packets_total{node_az="us-east-1a"}`, which is not listed in the current Felix metric reference and included an unsupported example label. It was replaced with the documented `felix_active_local_endpoints` metric.
- The metrics table included `felix_policy_dropped_packets_total`, which is not listed in the current Felix metric reference. It was replaced with the documented `felix_int_dataplane_failures` metric.
- The CloudWatch alarm used an `AWS/VPC` `PacketsDropped` metric and `VPC` dimension. Amazon VPC CloudWatch metrics documentation does not expose that metric for VPC Flow Logs. The example was changed to create a CloudWatch Logs metric filter for VPC Flow Logs `REJECT` records and then alarm on the custom metric.
- The conclusion referred to packet drops and policy enforcement visibility in a way that implied unavailable Felix packet counters. It was updated to refer to rejected VPC flows and documented Felix health metrics.

## Review Notes
The post is now technically valid as a high-level monitoring guide. Cross-AZ reporting still depends on maintaining an accurate IP-to-AZ mapping outside the shown query; a future version could add an implementation-specific enrichment workflow for EKS node labels, pod IP inventories, or a log pipeline.
