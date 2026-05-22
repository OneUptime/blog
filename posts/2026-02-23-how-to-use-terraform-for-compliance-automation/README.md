# How to Use Terraform for Compliance Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Compliance, Automation, Security, Policy as Code

Description: Learn how to automate compliance enforcement using Terraform, including policy-as-code integration, continuous compliance scanning, automated remediation, and audit-ready reporting.

---

Manual compliance verification is slow, error-prone, and does not scale. When your infrastructure spans hundreds of resources across multiple accounts and regions, checking each resource against compliance requirements by hand is impractical. Terraform enables compliance automation by expressing infrastructure as code and combining it with policy-as-code tools that enforce compliance automatically.

In this guide, we will cover how to build a comprehensive compliance automation system using Terraform.

## Compliance as Code Architecture

The compliance automation stack has three layers: preventive controls that block non-compliant resources before they are created, detective controls that find existing non-compliant resources, and corrective controls that automatically fix violations.

```rego
# compliance/preventive/encryption.rego

# Preventive control: Block unencrypted resources

package terraform.compliance.preventive

import rego.v1

# Deny S3 buckets without an explicit default encryption configuration
deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    actions := resource.change.actions
    actions[_] == "create"
    not has_bucket_encryption_resource(resource)
    msg := sprintf("S3 bucket %s must have encryption enabled", [resource.address])
}

has_bucket_encryption_resource(bucket) if {
    encryption := input.resource_changes[_]
    encryption.type == "aws_s3_bucket_server_side_encryption_configuration"
    encryption.change.actions[_] == "create"
    encryption.change.after.bucket == bucket.change.after.bucket
}

# Deny EBS volumes without encryption
deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_ebs_volume"
    resource.change.after.encrypted != true
    msg := sprintf("EBS volume %s must be encrypted", [resource.address])
}
```

## Detective Controls with Automated Scanning

```python
# scripts/compliance-scanner.py
# Detect existing non-compliant resources

import boto3
import json
from botocore.exceptions import ClientError
from datetime import UTC, datetime

class ComplianceScanner:
    def __init__(self, region="us-east-1"):
        self.session = boto3.Session(region_name=region)
        self.findings = []

    def scan_s3_encryption(self):
        """Check all S3 buckets for SSE-KMS default encryption."""
        s3 = self.session.client("s3")
        buckets = s3.list_buckets()["Buckets"]

        for bucket in buckets:
            try:
                encryption = s3.get_bucket_encryption(
                    Bucket=bucket["Name"]
                )
                rules = encryption.get("ServerSideEncryptionConfiguration", {}).get("Rules", [])
                uses_kms = any(
                    rule.get("ApplyServerSideEncryptionByDefault", {}).get("SSEAlgorithm") == "aws:kms"
                    for rule in rules
                )

                if uses_kms:
                    self.findings.append({
                        "resource": f"s3://{bucket['Name']}",
                        "check": "kms-encryption",
                        "status": "PASS",
                        "details": "SSE-KMS default encryption enabled"
                    })
                else:
                    self.findings.append({
                        "resource": f"s3://{bucket['Name']}",
                        "check": "kms-encryption",
                        "status": "FAIL",
                        "details": "Default encryption is not SSE-KMS",
                        "severity": "HIGH"
                    })
            except ClientError as exc:
                self.findings.append({
                    "resource": f"s3://{bucket['Name']}",
                    "check": "kms-encryption",
                    "status": "FAIL",
                    "details": f"Unable to read encryption configuration: {exc.response['Error']['Code']}",
                    "severity": "HIGH"
                })

    def scan_security_groups(self):
        """Check security groups for overly permissive rules."""
        ec2 = self.session.client("ec2")
        sgs = ec2.describe_security_groups()["SecurityGroups"]

        for sg in sgs:
            for rule in sg.get("IpPermissions", []):
                for ip_range in rule.get("IpRanges", []):
                    if ip_range["CidrIp"] == "0.0.0.0/0":
                        from_port = rule.get("FromPort", 0)
                        if from_port == 22 or from_port == 3389:
                            self.findings.append({
                                "resource": sg["GroupId"],
                                "check": "open-management-ports",
                                "status": "FAIL",
                                "details": f"Port {from_port} open to 0.0.0.0/0",
                                "severity": "CRITICAL"
                            })

    def generate_report(self):
        """Generate compliance report."""
        total = len(self.findings)
        passed = len([f for f in self.findings if f["status"] == "PASS"])
        failed = len([f for f in self.findings if f["status"] == "FAIL"])

        return {
            "scan_date": datetime.now(UTC).isoformat(),
            "total_checks": total,
            "passed": passed,
            "failed": failed,
            "compliance_rate": round(passed / total * 100, 1) if total > 0 else 100,
            "findings": self.findings
        }

if __name__ == "__main__":
    scanner = ComplianceScanner()
    scanner.scan_s3_encryption()
    scanner.scan_security_groups()

    with open("compliance-report.json", "w", encoding="utf-8") as report_file:
        json.dump(scanner.generate_report(), report_file, indent=2)
```

## Corrective Controls with Auto-Remediation

```hcl
# compliance/corrective/remediation.tf
# Auto-remediation infrastructure

# Lambda function to fix compliance violations
resource "aws_lambda_function" "compliance_remediation" {
  function_name = "compliance-auto-remediation"
  runtime       = "python3.11"
  handler       = "remediation.handler"
  role          = aws_iam_role.remediation.arn
  timeout       = 300
  filename      = "remediation.zip"
}

# Trigger on Config rule violations
resource "aws_config_remediation_configuration" "s3_encryption" {
  config_rule_name = aws_config_config_rule.s3_encryption.name

  resource_type  = "AWS::S3::Bucket"
  target_id      = "AWS-EnableS3BucketEncryption"
  target_type    = "SSM_DOCUMENT"
  target_version = "1"

  parameter {
    name         = "AutomationAssumeRole"
    static_value = aws_iam_role.remediation.arn
  }

  parameter {
    name           = "BucketName"
    resource_value = "RESOURCE_ID"
  }

  parameter {
    name         = "SSEAlgorithm"
    static_value = "aws:kms"
  }

  automatic                  = true
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}
```

## CI/CD Compliance Integration

```yaml
# .github/workflows/compliance-automation.yaml
name: Compliance Automation Pipeline

on:
  pull_request:
    paths: ['infrastructure/**']
  schedule:
    - cron: '0 */6 * * *'

jobs:
  preventive-checks:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json

      - name: OPA Policy Check
        run: |
          opa eval --fail-defined --data compliance/preventive/ \
            --input plan.json \
            "data.terraform.compliance.preventive.deny[_]" \
            --format pretty

      - name: Checkov Scan
        run: checkov -d . --framework terraform --quiet

  detective-scan:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Compliance Scan
        run: python scripts/compliance-scanner.py

      - name: Upload Results
        run: |
          python scripts/upload-compliance-results.py \
            --results compliance-report.json
```

## Compliance Reporting for Auditors

Generate audit-ready reports automatically:

```python
# scripts/compliance-report.py
# Generate compliance reports for audit purposes

from datetime import UTC, datetime

def generate_audit_report(scan_results):
    """Create an audit-ready compliance report."""
    total = len(scan_results)
    passing = len([r for r in scan_results if r["status"] == "PASS"])
    failing = len([r for r in scan_results if r["status"] == "FAIL"])

    report = {
        "report_date": datetime.now(UTC).isoformat(),
        "framework": "SOC2",
        "total_controls_checked": total,
        "controls_passing": passing,
        "controls_failing": failing,
        "compliance_score": round(passing / total * 100, 1) if total > 0 else 100,
        "critical_findings": [
            r for r in scan_results
            if r["status"] == "FAIL" and r.get("severity") == "CRITICAL"
        ],
        "evidence": {
            "terraform_state_versioned": True,
            "changes_tracked_in_git": True,
            "approval_workflows_enabled": True,
            "encryption_enforced": True,
            "audit_logging_active": True
        }
    }
    return report
```

```hcl
# compliance/reporting.tf
# Infrastructure for compliance reporting

resource "aws_s3_bucket" "compliance_reports" {
  bucket = "compliance-reports-${var.environment}"
}

resource "aws_s3_bucket_lifecycle_configuration" "reports" {
  bucket = aws_s3_bucket.compliance_reports.id

  rule {
    id     = "retain-reports"
    status = "Enabled"

    # Keep compliance reports for 7 years
    expiration {
      days = 2555
    }
  }
}
```

## Best Practices

Implement all three control types. Preventive controls alone leave gaps for manual changes. Detective controls alone are reactive. Together with corrective controls, you create a comprehensive compliance posture that catches issues at every stage.

Start with the highest-severity checks. Focus on encryption, network security, and access control before moving to less critical compliance areas. A prioritized approach delivers the most security value quickly.

Make compliance transparent. Publish compliance dashboards and reports so teams can see their compliance status without asking. Transparency drives accountability and motivates teams to fix issues proactively.

Automate reporting for auditors. Generate audit-ready reports automatically so compliance teams always have current data. Manual report generation is slow and error-prone.

Test your compliance controls. Deliberately create non-compliant resources in a sandbox to verify that your controls detect and handle them correctly. Untested controls provide false confidence.

Map every compliance requirement to a specific Terraform control. This mapping serves as documentation for auditors and ensures no requirements are missed in your automation.

## Conclusion

Compliance automation with Terraform transforms compliance from a periodic, manual exercise into a continuous, automated practice. By combining preventive policy checks in CI/CD, detective scanning on a schedule, corrective auto-remediation, and automated reporting, you create a compliance posture that maintains itself. The result is fewer compliance violations, faster audit preparation, and more confidence in your infrastructure's security posture.
