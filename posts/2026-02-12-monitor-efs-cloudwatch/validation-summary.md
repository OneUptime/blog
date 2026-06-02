# Validation Summary: How to Monitor EFS with CloudWatch

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Amazon EFS
- Amazon CloudWatch metrics, alarms, dashboards, and anomaly detection
- AWS CLI
- Python with boto3
- Terraform AWS provider

## Sources Consulted
- Amazon EFS User Guide, CloudWatch metrics for Amazon EFS: https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html
- Amazon EFS User Guide, performance specifications and throughput modes: https://docs.aws.amazon.com/efs/latest/ug/throughput-modes.html
- AWS CLI Command Reference, cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference, cloudwatch put-anomaly-detector: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-anomaly-detector.html
- Amazon CloudWatch User Guide, dashboard body structure and syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- boto3 EFS describe_file_systems reference: https://docs.aws.amazon.com/boto3/latest/reference/services/efs/client/describe_file_systems.html
- boto3 CloudWatch get_metric_statistics reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/metric/get_statistics.html
- Terraform AWS provider, aws_cloudwatch_dashboard resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard

## Issues Found
- The `ClientConnections` metric was described as a client count per mount target. AWS documents it as the number of client connections to the file system, with only the `FileSystemId` dimension. I changed the table to say it is the client count for the file system.
- The IOPS alarm guidance said consistent `PercentIOLimit` alarms mean it is time to consider Max I/O. Current EFS docs recommend General Purpose for all file systems because Max I/O has higher per-operation latency, is unsupported for One Zone file systems and Elastic throughput, and performance mode cannot be changed after creation. I changed the wording to make that caveat explicit.
- Two CloudWatch dashboard widgets were titled in GB even though the metric definitions plotted raw byte values. I changed the titles to bytes so the dashboard labels match the data shown.
- The Python report used the first datapoint returned by `get_metric_statistics`, but CloudWatch does not return datapoints in chronological order and a query can return multiple datapoints. I changed the script to aggregate returned datapoints according to the requested statistic.

## Review Notes
- The AWS CLI and Terraform binaries were not installed in the workspace, so command and Terraform resource validation was performed against official AWS CLI and Terraform provider documentation rather than local command execution.
- The Python code block was parsed successfully with Python, and the CloudWatch dashboard body was validated as JSON after the edits.
