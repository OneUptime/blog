# How to Install the CloudWatch Agent on EC2 Windows Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, EC2, Windows, Monitoring

Description: Complete walkthrough for installing and configuring the CloudWatch Agent on Windows Server EC2 instances to collect performance counters, event logs, and custom metrics.

---

Windows EC2 instances, just like their Linux counterparts, only ship a handful of basic CloudWatch metrics out of the box. If you want memory usage, disk space, Windows performance counters, or Windows Event Logs shipped to CloudWatch, you need the CloudWatch Agent.

The process is similar to the Linux installation but with Windows-specific paths, services, and metric types. This guide covers the full setup from IAM role to agent configuration to verification.

## Prerequisites

Same as Linux - you need an IAM role with the `CloudWatchAgentServerPolicy` attached to your EC2 instance. If you've already set this up for Linux instances, the same role works for Windows too. If not, see the IAM setup in our [Linux installation guide](https://oneuptime.com/blog/post/2026-02-12-install-cloudwatch-agent-ec2-linux/view).

## Installation Method 1: Using Systems Manager

SSM is the cleanest installation method for Windows:

```powershell
# From your local machine, use SSM to install the agent
aws ssm send-command `
  --document-name "AWS-ConfigureAWSPackage" `
  --parameters '{"action":["Install"],"name":["AmazonCloudWatchAgent"]}' `
  --targets "Key=instanceids,Values=i-1234567890abcdef0" `
  --comment "Install CloudWatch Agent on Windows"
```

## Installation Method 2: Download and Install

RDP into your Windows instance and run these commands in PowerShell as Administrator:

```powershell
# Download the CloudWatch Agent MSI installer
Invoke-WebRequest -Uri "https://amazoncloudwatch-agent.s3.amazonaws.com/windows/amd64/latest/amazon-cloudwatch-agent.msi" -OutFile "C:\Users\Administrator\Downloads\amazon-cloudwatch-agent.msi"

# Install silently
Start-Process msiexec.exe -ArgumentList '/i "C:\Users\Administrator\Downloads\amazon-cloudwatch-agent.msi" /qn' -Wait

# Verify the installation
& "C:\Program Files\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent-ctl.ps1" -a status
```

The agent installs to `C:\Program Files\Amazon\AmazonCloudWatchAgent\`.

## Installation Method 3: Using the Configuration Wizard

The wizard works on Windows too and helps build the JSON config interactively:

```powershell
# Run the configuration wizard
cd "C:\Program Files\Amazon\AmazonCloudWatchAgent"
.\amazon-cloudwatch-agent-config-wizard.exe
```

The wizard asks about Windows-specific metrics like Performance Counters and Event Logs.

## Windows Agent Configuration

Here's a practical configuration file for a Windows web server:

```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "logfile": "C:\\ProgramData\\Amazon\\AmazonCloudWatchAgent\\Logs\\amazon-cloudwatch-agent.log"
  },
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "InstanceType": "${aws:InstanceType}"
    },
    "metrics_collected": {
      "Memory": {
        "measurement": [
          "% Committed Bytes In Use",
          "Available MBytes"
        ],
        "metrics_collection_interval": 60
      },
      "Paging File": {
        "measurement": [
          "% Usage"
        ],
        "resources": ["*"]
      },
      "PhysicalDisk": {
        "measurement": [
          "% Disk Time",
          "Disk Read Bytes/sec",
          "Disk Write Bytes/sec",
          "% Free Space"
        ],
        "resources": ["*"]
      },
      "LogicalDisk": {
        "measurement": [
          "% Free Space",
          "Free Megabytes"
        ],
        "resources": ["C:", "D:"]
      },
      "Processor": {
        "measurement": [
          "% Idle Time",
          "% User Time",
          "% Processor Time",
          "% Interrupt Time"
        ],
        "resources": ["_Total"]
      },
      "Network Interface": {
        "measurement": [
          "Bytes Sent/sec",
          "Bytes Received/sec",
          "Packets Sent/sec",
          "Packets Received/sec"
        ],
        "resources": ["*"]
      },
      "System": {
        "measurement": [
          "Processor Queue Length",
          "Context Switches/sec"
        ]
      },
      "TCPv4": {
        "measurement": [
          "Connections Established",
          "Connections Reset"
        ]
      }
    }
  },
  "logs": {
    "logs_collected": {
      "windows_events": {
        "collect_list": [
          {
            "event_name": "System",
            "event_levels": ["ERROR", "WARNING", "CRITICAL"],
            "log_group_name": "/windows/system-events",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          },
          {
            "event_name": "Application",
            "event_levels": ["ERROR", "WARNING"],
            "log_group_name": "/windows/application-events",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          },
          {
            "event_name": "Security",
            "event_levels": ["ERROR", "WARNING", "CRITICAL"],
            "log_group_name": "/windows/security-events",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 90
          }
        ]
      },
      "files": {
        "collect_list": [
          {
            "file_path": "C:\\inetpub\\logs\\LogFiles\\W3SVC1\\*.log",
            "log_group_name": "/windows/iis-logs",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          },
          {
            "file_path": "C:\\apps\\myservice\\logs\\*.log",
            "log_group_name": "/myapp/production/windows-service",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
```

Save this as `C:\ProgramData\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent.json`.

## Key Differences from Linux

There are several important differences in the Windows configuration:

**Performance Counters instead of Linux metrics**: Windows uses performance counter categories like `Memory`, `PhysicalDisk`, `Processor`, `LogicalDisk`, and `Network Interface`. These map to what you see in Windows Performance Monitor (perfmon).

**Windows Event Logs**: The `windows_events` section lets you collect from Windows Event Log channels (System, Application, Security, and custom channels). You specify event levels to filter: `INFORMATION`, `WARNING`, `ERROR`, `CRITICAL`, and `VERBOSE`.

**File paths use backslashes**: Remember to escape backslashes in JSON (`\\`) or use forward slashes (which Windows accepts in most contexts).

**IIS logs**: If you're running IIS, the default log location is `C:\inetpub\logs\LogFiles\W3SVC1\`. The agent supports wildcard patterns for log rotation.

## Starting the Agent on Windows

```powershell
# Start the agent with the configuration
& "C:\Program Files\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent-ctl.ps1" `
  -a fetch-config `
  -m ec2 `
  -s `
  -c "file:C:\ProgramData\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent.json"
```

Check the status:

```powershell
# Check agent status
& "C:\Program Files\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent-ctl.ps1" -a status
```

You should see output showing the agent is running.

## Managing the Windows Service

The CloudWatch Agent runs as a Windows service:

```powershell
# Check service status
Get-Service -Name "AmazonCloudWatchAgent"

# Restart the service
Restart-Service -Name "AmazonCloudWatchAgent"

# Stop the service
Stop-Service -Name "AmazonCloudWatchAgent"

# The service is set to auto-start by default
Get-Service -Name "AmazonCloudWatchAgent" | Select-Object Name, Status, StartType
```

## Collecting IIS Metrics

For web servers running IIS, add these performance counters to your configuration:

```json
{
  "Web Service": {
    "measurement": [
      "Current Connections",
      "Total Method Requests/sec",
      "Get Requests/sec",
      "Post Requests/sec",
      "Not Found Errors/sec",
      "Total Connection Attempts (all instances)/sec"
    ],
    "resources": ["_Total"]
  },
  "ASP.NET Applications": {
    "measurement": [
      "Requests/Sec",
      "Errors Total/Sec",
      "Request Wait Time",
      "Requests In Application Queue"
    ],
    "resources": ["__Total__"]
  }
}
```

## Collecting .NET Application Metrics

If you're running .NET applications, collect CLR-specific counters:

```json
{
  ".NET CLR Memory": {
    "measurement": [
      "% Time in GC",
      "# Gen 0 Collections",
      "# Gen 1 Collections",
      "# Gen 2 Collections",
      "Large Object Heap size"
    ],
    "resources": ["_Global_"]
  },
  ".NET CLR Exceptions": {
    "measurement": [
      "# of Exceps Thrown / sec"
    ],
    "resources": ["_Global_"]
  }
}
```

## Automating Installation with User Data

For Auto Scaling groups, include the installation in your launch template:

```powershell
<powershell>
# Install CloudWatch Agent
$installer = "C:\Users\Administrator\Downloads\amazon-cloudwatch-agent.msi"
Invoke-WebRequest -Uri "https://amazoncloudwatch-agent.s3.amazonaws.com/windows/amd64/latest/amazon-cloudwatch-agent.msi" -OutFile $installer
Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /qn" -Wait

# Download config from S3
Read-S3Object -BucketName "my-config-bucket" -Key "cw-agent-windows.json" -File "C:\ProgramData\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent.json"

# Start the agent
& "C:\Program Files\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent-ctl.ps1" -a fetch-config -m ec2 -s -c "file:C:\ProgramData\Amazon\AmazonCloudWatchAgent\amazon-cloudwatch-agent.json"
</powershell>
```

## Troubleshooting

**Agent won't start**: Check the log at `C:\ProgramData\Amazon\AmazonCloudWatchAgent\Logs\amazon-cloudwatch-agent.log`. JSON syntax errors in the config are the most common cause.

**Metrics not appearing**: Verify the IAM role permissions. Check that the performance counter names in your config match exactly what Windows exposes (use `perfmon` to browse available counters).

**Windows Event Logs not flowing**: Make sure the event level names are correct: `INFORMATION`, `WARNING`, `ERROR`, `CRITICAL`. Typos here fail silently.

**Permission issues**: The agent service runs as LocalSystem by default, which has access to most resources. If you've changed the service account, ensure it has read access to all configured log files and performance counters.

## Wrapping Up

Installing the CloudWatch Agent on Windows gives you the same depth of visibility you get on Linux - memory, disk, process metrics, plus Windows-specific features like Performance Counters and Event Log collection. The config format is slightly different to accommodate Windows conventions, but the principles are the same. For advanced configuration options, see our posts on [configuring custom metrics](https://oneuptime.com/blog/post/2026-02-12-configure-cloudwatch-agent-custom-metrics/view) and [collecting memory and disk metrics](https://oneuptime.com/blog/post/2026-02-12-collect-memory-disk-metrics-cloudwatch-agent/view).
