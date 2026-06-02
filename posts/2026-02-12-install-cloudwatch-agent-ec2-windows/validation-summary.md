# Validation Summary: How to Install the CloudWatch Agent on EC2 Windows Instances

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Amazon CloudWatch Agent
- Amazon EC2 Windows Server instances
- AWS Systems Manager Run Command
- AWS IAM managed policies
- PowerShell
- Windows Performance Counters
- Windows Event Logs
- IIS and ASP.NET performance counters
- .NET Framework CLR performance counters

## Sources Consulted
- AWS CloudWatch documentation: Installing the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-EC2-Instance.html
- AWS CloudWatch documentation: Manual installation on Amazon EC2 - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/manual-installation.html
- AWS CloudWatch documentation: Install the CloudWatch agent using AWS Systems Manager - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html
- AWS CloudWatch documentation: Manually create or edit the CloudWatch agent configuration file - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CloudWatch documentation: Starting the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- AWS CloudWatch documentation: Troubleshooting the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/troubleshooting-CloudWatch-Agent.html
- AWS CloudWatch documentation: Metrics collected by the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html
- Microsoft Learn: Win32_PerfRawData_PerfDisk_PhysicalDisk class - https://learn.microsoft.com/en-us/previous-versions/aa394308(v=vs.85)
- Microsoft Learn: Win32_PerfRawData_W3SVC_WebService class - https://learn.microsoft.com/en-us/previous-versions/aa394345(v=vs.85)
- Microsoft Learn: Performance Counters for ASP.NET - https://learn.microsoft.com/en-us/previous-versions/aspnet/fxk122b4(v=vs.100)
- Microsoft Learn: Performance Counters in .NET Framework - https://learn.microsoft.com/en-us/dotnet/framework/debug-trace-profile/performance-counters

## Issues Found
- The post tag used `Window` instead of `Windows`. Changed it to `Windows`.
- The main CloudWatch Agent configuration included `% Free Space` under `PhysicalDisk`. That counter belongs with disk space style counters already collected under `LogicalDisk`, while the PhysicalDisk counter reference covers physical disk I/O counters such as disk time and read/write bytes. Removed `% Free Space` from the `PhysicalDisk` measurement list.
- The IIS example used `Total Connection Attempts (all instances)/sec`, which is not the correct counter name. Changed it to the valid rate counter `Connection Attempts/sec`.
- The .NET section described the counters as generic .NET application metrics and used `_Global_`. Microsoft documents these as .NET Framework performance counters and notes `_Global_` values are not accurate for CLR counters. Changed the wording to `.NET Framework applications` and used `resources: ["*"]` to collect per-instance counter data.
- The troubleshooting note omitted `VERBOSE` from the valid CloudWatch Agent Windows event level values. Added `VERBOSE` for consistency with AWS documentation and the earlier event-log explanation.

## Review Notes
The CloudWatch Agent installation methods, MSI download URL, SSM package name, IAM policy reference, Windows control script path, local configuration path, Windows event log configuration fields, log retention fields, and agent start command were consistent with current AWS documentation. The user data example assumes the AWS Tools for PowerShell S3 cmdlet is available on the Windows AMI or installed before use.
