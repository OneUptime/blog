# Validation Summary: How to Fix EC2 Instance Status Check Failed (System/Instance)

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Amazon EC2
- EC2 system status checks
- EC2 instance status checks
- EC2 attached EBS status checks
- AWS CLI
- Amazon CloudWatch alarms
- EC2 automatic instance recovery
- Linux file system recovery

## Sources Consulted
- AWS EC2 User Guide: Status checks for Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-system-instance-status-check.html
- AWS EC2 User Guide: Troubleshoot Amazon EC2 Linux instances with failed status checks - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstances.html
- AWS EC2 User Guide: Stop and start Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html
- AWS EC2 User Guide: Automatic instance recovery - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-recover.html
- AWS EC2 User Guide: Data persistence for Amazon EC2 instance store volumes - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-store-lifetime.html
- AWS CLI Command Reference: describe-instance-status - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-status.html
- AWS CLI Command Reference: get-console-output - https://docs.aws.amazon.com/cli/latest/reference/ec2/get-console-output.html
- AWS CLI Command Reference: put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The introduction said EC2 runs two status checks on every instance. AWS now documents three status check types: system, instance, and attached EBS. Updated the wording to keep the post focused on system and instance checks while noting the attached EBS check for supported Nitro instances.
- The instance store section implied any instance using instance store volumes cannot be stopped. Stop/start support depends on the root device type; EBS-backed instances can have instance store volumes, but instance store-backed root volumes cannot be stopped. Updated the section to refer to instance store root volumes and changed the example query to show `RootDeviceType` and `RootDeviceName`.
- The rescue-volume example assumed the first block-device mapping was the root volume and reattached it as `/dev/xvda`. Updated the commands to read the actual root device name, select the matching EBS volume, wait for detach completion, and reattach using the original root device name.

## Review Notes
The AWS CLI commands and CloudWatch alarm examples are consistent with current AWS CLI command references. The Linux rescue commands remain intentionally generic; on Nitro-based instances, Linux device names can appear as NVMe paths inside the operating system, so the `/dev/xvdf1` examples may need adjustment in a real rescue session.
