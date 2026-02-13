# How to Set Up GuardDuty EKS Protection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, GuardDuty, EKS, Kubernetes, Security

Description: Enable and configure GuardDuty EKS Protection to detect threats in your Kubernetes clusters including audit log monitoring and runtime monitoring.

---

Running Kubernetes on EKS gives you a lot of power, but it also opens up a whole new attack surface. Compromised pods, privilege escalation, crypto miners running in containers, unauthorized API calls - the list of things that can go wrong in a Kubernetes cluster is long. GuardDuty EKS Protection extends AWS's threat detection into your clusters, giving you visibility into both the Kubernetes API layer and the runtime behavior of your containers.

There are actually two distinct features here: EKS Audit Log Monitoring (which watches Kubernetes API activity) and EKS Runtime Monitoring (which watches what's happening inside your containers). Let's set up both.

## EKS Audit Log Monitoring

This feature analyzes Kubernetes audit logs from your EKS clusters. It detects things like anonymous API access, known malicious IPs interacting with your cluster, unusual API calls that could indicate reconnaissance, and more.

The nice thing is that it doesn't require any agent or DaemonSet. GuardDuty pulls the audit logs directly from the EKS control plane.

### Enabling via CLI

First, make sure GuardDuty is enabled, then activate the EKS audit log feature.

This enables EKS Audit Log Monitoring on your existing GuardDuty detector:

```bash
# Enable EKS Audit Log Monitoring
aws guardduty update-detector \
  --detector-id abc123def456 \
  --features '[
    {
      "Name": "EKS_AUDIT_LOGS",
      "Status": "ENABLED"
    }
  ]'
```

### Enabling via Terraform

This Terraform block enables GuardDuty with EKS audit log monitoring:

```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }
}
```

## EKS Runtime Monitoring

Runtime Monitoring goes deeper. It deploys a security agent (as a DaemonSet or managed add-on) on your EKS nodes that monitors OS-level activity inside containers. This catches things like reverse shells, file system tampering, suspicious process execution, and privilege escalation attempts.

### Enabling Runtime Monitoring

This enables both EKS Runtime Monitoring and the automated agent management:

```bash
# Enable EKS Runtime Monitoring with automated agent
aws guardduty update-detector \
  --detector-id abc123def456 \
  --features '[
    {
      "Name": "EKS_RUNTIME_MONITORING",
      "Status": "ENABLED",
      "AdditionalConfiguration": [
        {
          "Name": "EKS_ADDON_MANAGEMENT",
          "Status": "ENABLED"
        }
      ]
    }
  ]'
```

When `EKS_ADDON_MANAGEMENT` is enabled, GuardDuty automatically installs and manages the security agent as an EKS add-on. If you prefer to manage it yourself, set that to `DISABLED` and deploy the agent manually.

### Manual Agent Deployment

If you'd rather control the agent yourself, you can deploy it as an EKS add-on.

This installs the GuardDuty runtime monitoring agent on your EKS cluster:

```bash
# Create the GuardDuty agent add-on
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name aws-guardduty-agent \
  --addon-version v1.5.0-eksbuild.1
```

Check that the agent pods are running:

```bash
# Verify agent pods
kubectl get pods -n amazon-guardduty -l app=aws-guardduty-agent
```

You should see one agent pod per node, since it runs as a DaemonSet.

### Configuring Runtime Monitoring per Cluster

You might not want runtime monitoring on every cluster. Use tags to include or exclude specific clusters.

Tag your clusters to control which ones get monitored:

```bash
# Tag clusters you want monitored
aws eks tag-resource \
  --resource-arn arn:aws:eks:us-east-1:111111111111:cluster/production-cluster \
  --tags GuardDutyManaged=true

# Configure GuardDuty to use tag-based inclusion
aws guardduty update-detector \
  --detector-id abc123def456 \
  --features '[
    {
      "Name": "EKS_RUNTIME_MONITORING",
      "Status": "ENABLED",
      "AdditionalConfiguration": [
        {
          "Name": "EKS_ADDON_MANAGEMENT",
          "Status": "ENABLED"
        }
      ]
    }
  ]'
```

## Understanding EKS Findings

GuardDuty generates specific finding types for EKS. Here are the categories you'll encounter.

**Audit Log findings** (prefix `Kubernetes:`):
- `PrivilegeEscalation:Kubernetes/PrivilegedContainer` - A privileged container was launched
- `Discovery:Kubernetes/MaliciousIPCaller` - Kubernetes API called from a known malicious IP
- `Persistence:Kubernetes/ContainerWithSensitiveMount` - Container with sensitive host path mounted
- `CredentialAccess:Kubernetes/MaliciousIPCaller.Custom` - API call from IP on your threat list

**Runtime findings** (prefix `Runtime:`):
- `Runtime:Container/CryptoMiner` - Cryptomining activity detected in container
- `Runtime:Container/ReverseShell` - Reverse shell detected
- `Runtime:Container/SuspiciousTool` - Suspicious tool execution in container
- `Runtime:Container/MaliciousFileExecuted` - Known malicious file executed

## Listing and Filtering Findings

This retrieves all EKS-related GuardDuty findings:

```bash
# Get all Kubernetes findings
aws guardduty list-findings \
  --detector-id abc123def456 \
  --finding-criteria '{
    "Criterion": {
      "type": {
        "Eq": [
          "PrivilegeEscalation:Kubernetes/PrivilegedContainer",
          "Runtime:Container/CryptoMiner",
          "Runtime:Container/ReverseShell"
        ]
      }
    }
  }'
```

Get details on a specific finding:

```bash
aws guardduty get-findings \
  --detector-id abc123def456 \
  --finding-ids "finding-id-here" \
  --query 'Findings[0].{Type:Type,Severity:Severity,Resource:Resource.EksClusterDetails}'
```

## Automated Remediation

When a threat is detected in a container, you usually want to act fast. Here's an EventBridge rule and Lambda function for automated response.

This EventBridge pattern catches runtime container threats:

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "type": [{
      "prefix": "Runtime:Container/"
    }]
  }
}
```

This Lambda function kills the offending pod when a runtime threat is detected:

```python
import boto3
import subprocess
import json

def handler(event, context):
    finding = event['detail']
    finding_type = finding['type']
    severity = finding['severity']

    # Only auto-remediate high severity findings
    if severity < 7:
        print(f"Finding {finding_type} severity {severity} - alerting only")
        return

    # Extract cluster and pod details
    eks_details = finding['resource']['eksClusterDetails']
    cluster_name = eks_details['name']

    # Get container details from the finding
    runtime_details = finding.get('service', {}).get('runtimeDetails', {})
    context_details = runtime_details.get('context', {})

    print(f"High severity finding: {finding_type} in cluster {cluster_name}")

    # Send alert via SNS
    sns = boto3.client('sns')
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:111111111111:security-alerts',
        Subject=f'GuardDuty EKS Alert: {finding_type}',
        Message=json.dumps(finding, indent=2, default=str)
    )

    return {
        'statusCode': 200,
        'body': f'Processed finding: {finding_type}'
    }
```

## Coverage Monitoring

It's important to verify that the runtime agent is actually running on all your nodes. GuardDuty provides coverage statistics.

This checks which clusters have healthy runtime monitoring coverage:

```bash
# Check runtime monitoring coverage
aws guardduty list-coverage \
  --detector-id abc123def456 \
  --filter-criteria '{
    "FilterCriterion": [
      {
        "CriterionKey": "COVERAGE_STATUS",
        "FilterCondition": {
          "Equals": ["HEALTHY"]
        }
      }
    ]
  }'
```

Also check for unhealthy coverage:

```bash
# Find clusters with coverage issues
aws guardduty list-coverage \
  --detector-id abc123def456 \
  --filter-criteria '{
    "FilterCriterion": [
      {
        "CriterionKey": "COVERAGE_STATUS",
        "FilterCondition": {
          "Equals": ["UNHEALTHY"]
        }
      }
    ]
  }'
```

## Multi-Account Organization Setup

For organizations, enable EKS Protection across all member accounts from the delegated admin.

This auto-enables EKS protection features for all accounts in the organization:

```bash
aws guardduty update-organization-configuration \
  --detector-id abc123def456 \
  --features '[
    {
      "Name": "EKS_AUDIT_LOGS",
      "AutoEnable": "ALL"
    },
    {
      "Name": "EKS_RUNTIME_MONITORING",
      "AutoEnable": "ALL",
      "AdditionalConfiguration": [
        {
          "Name": "EKS_ADDON_MANAGEMENT",
          "AutoEnable": "ALL"
        }
      ]
    }
  ]'
```

## Best Practices

**Enable both audit logs and runtime monitoring.** They catch different things. Audit logs spot API-level threats while runtime monitoring catches in-container activity. You want both layers.

**Use network policies alongside GuardDuty.** GuardDuty is detective, not preventive. Combine it with Kubernetes network policies to limit blast radius.

**Monitor agent health.** The runtime agent needs to be running for container-level detection to work. Set up alerts for unhealthy coverage status.

**Test with known patterns.** AWS provides a GuardDuty tester that generates sample findings. Use it to verify your alerting pipeline works before you need it for real.

For complete AWS security coverage, also enable [GuardDuty S3 Protection](https://oneuptime.com/blog/post/2026-02-12-guardduty-s3-protection/view) and [GuardDuty Malware Protection for EC2](https://oneuptime.com/blog/post/2026-02-12-guardduty-malware-protection-ec2/view). And pair your findings with [OneUptime](https://oneuptime.com) for centralized monitoring and incident management across all your security tools.
