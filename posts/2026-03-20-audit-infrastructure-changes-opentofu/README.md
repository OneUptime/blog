# How to Audit Infrastructure Changes Made by OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Audit, Compliance, Infrastructure as Code, Security, GitOps

Description: Learn how to build a comprehensive audit trail for OpenTofu-managed infrastructure using plan logs, cloud provider audit services, and structured apply output.

## Introduction

Knowing who changed what, when, and why is essential for compliance and incident response. OpenTofu itself does not maintain an audit log, but combining Git history, structured plan/apply output, and cloud provider audit services gives you a complete picture.

## Layer 1: Git as the Source of Truth

Every change to infrastructure configuration is a commit. Enforce meaningful commit messages and sign commits:

```bash
# Sign commits by default in this repository

git config commit.gpgsign true

# View infrastructure change history
git log --oneline -- "environments/prod/**/*.tf"

# See who changed a specific resource
git log -p -- "environments/prod/vpc/main.tf"
```

## Layer 2: Saving Plan Output to a File

Save structured plan output so reviewers can audit what will change before applying. Store the JSON securely because it can contain sensitive values in plain text:

```bash
# Save binary plan file
tofu plan -out=tfplan.binary

# Convert to JSON for structured logging
tofu show -json -plan=tfplan.binary > tfplan.json

# Extract a summary of changes
cat tfplan.json | jq '[.resource_changes[] | select(.change.actions != ["no-op"]) | {address, actions: .change.actions}]'
```

## Layer 3: Structured Apply Logging

Capture all apply output in structured format for audit systems:

```bash
# Save apply output with timestamp
mkdir -p apply-logs
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
tofu apply -json tfplan.binary | tee "apply-logs/apply-${TIMESTAMP}.json"

# Upload to S3 for long-term retention
aws s3 cp "apply-logs/apply-${TIMESTAMP}.json" \
  "s3://my-audit-bucket/opentofu-applies/${TIMESTAMP}.json"
```

## Layer 4: CI/CD Pipeline Audit Trail

GitHub Actions preserves workflow run history, logs, and artifacts. Capture structured metadata in each run:

```yaml
# .github/workflows/infra.yml
- name: Tofu Apply
  id: apply
  run: |
    tofu apply -json tfplan.binary | tee apply-output.json
    echo "applied_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_OUTPUT
    echo "actor=${{ github.actor }}" >> $GITHUB_OUTPUT
    echo "sha=${{ github.sha }}" >> $GITHUB_OUTPUT

- name: Upload audit log
  uses: actions/upload-artifact@v4
  with:
    name: apply-audit-${{ github.run_id }}
    path: apply-output.json
    retention-days: 90
```

## Layer 5: Cloud Provider Audit Logs

AWS control plane changes made by OpenTofu are also recorded in CloudTrail:

```hcl
# Enable AWS CloudTrail for API-level auditing of management-plane changes
resource "aws_cloudtrail" "infra_audit" {
  name                          = "opentofu-audit"
  s3_bucket_name                = aws_s3_bucket.audit.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "WriteOnly"   # Only capture write operations
    include_management_events = true
  }

  tags = {
    ManagedBy = "opentofu"
    Purpose   = "infrastructure-audit"
  }
}
```

## Layer 6: Querying the Audit Trail

Use Athena to query CloudTrail logs for infrastructure changes:

```sql
-- Find selected EC2 and VPC write events in the last 7 days
SELECT eventtime, useridentity.arn, requestparameters
FROM cloudtrail_logs
WHERE eventname IN ('RunInstances', 'CreateSecurityGroup', 'CreateSubnet')
  AND eventtime > date_add('day', -7, current_timestamp)
ORDER BY eventtime DESC;
```

## Conclusion

A complete OpenTofu audit trail combines Git commit history (who changed the code), saved plan files (what was planned), structured apply logs (what was applied), and cloud provider audit services (what API calls were made). Together these layers help satisfy infrastructure change management and auditability requirements in frameworks such as SOC 2, PCI-DSS, and ISO 27001.
