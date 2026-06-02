# Validation Summary: How to Troubleshoot EC2 Instance Status Check Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon EC2 status checks
- AWS CLI
- Amazon CloudWatch alarms
- AWS Systems Manager Run Command
- EC2 Serial Console
- Amazon EBS root volume recovery
- Linux boot, filesystem, memory, and kernel troubleshooting

## Sources Consulted
- AWS EC2 User Guide: Status checks for Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-system-instance-status-check.html
- AWS EC2 User Guide: Troubleshoot Amazon EC2 Linux instances with failed status checks - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstances.html
- AWS CLI Command Reference: describe-instance-status - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-status.html
- AWS CLI Command Reference: get-console-output - https://docs.aws.amazon.com/cli/latest/reference/ec2/get-console-output.html
- AWS CLI Command Reference: get-console-screenshot - https://docs.aws.amazon.com/cli/latest/reference/ec2/get-console-screenshot.html
- AWS CLI Command Reference: ssm send-command - https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch User Guide: Stop, terminate, reboot, or recover an EC2 instance - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/UsingAlarmActions.html
- AWS EC2 User Guide: Connect to the EC2 Serial Console - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-serial-console.html

## Issues Found
- The post described EC2 as having only two status checks. AWS now documents three status-check types, including attached EBS status checks for Nitro instances, so the wording was updated to focus on the two primary troubleshooting checks while noting attached EBS status checks.
- The impaired-instance `describe-instance-status` example said it checked all instances with issues, but it filtered only impaired instance status for running instances. The comment was corrected to match the actual filter behavior.
- The system-status stop/start guidance implied all instances can be moved this way. AWS documents this recovery path for EBS-backed instances and says it usually migrates to a new host, so the wording was made more precise.
- The console screenshot command wrote a JPEG payload to `screenshot.png`. AWS documents `get-console-screenshot` output as `.jpg`, so the filename was changed to `screenshot.jpg`.
- The rescue-volume workflow assumed the first block device mapping was the root volume and reattached it as `/dev/xvda`. The commands now capture `RootDeviceName`, query the matching EBS volume, and reattach using the original root device name.
- The rescue examples assumed `/dev/xvdf1` would always be the attached partition. Comments were added to verify the actual device with `lsblk`, especially on Nitro instances where EBS volumes can appear as NVMe devices.
- The EC2 Serial Console example only pushed the temporary public key and did not show the SSH connection step. The SSH command using the documented `instance-id.port0` username format and regional endpoint was added.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the current official AWS CLI Command Reference and EC2/CloudWatch documentation. The OneUptime links referenced by the post returned HTTP 200 during validation.
