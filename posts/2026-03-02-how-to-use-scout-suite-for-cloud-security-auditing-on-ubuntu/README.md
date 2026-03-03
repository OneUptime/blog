# How to Use Scout Suite for Cloud Security Auditing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Cloud Security, AWS, Scout Suite

Description: Learn how to install and use Scout Suite on Ubuntu to audit AWS, Azure, and GCP cloud environments for security misconfigurations and compliance violations.

---

Scout Suite is an open-source multi-cloud security auditing tool that collects configuration data from cloud provider APIs and runs security checks against it. It identifies misconfigurations like publicly accessible S3 buckets, overly permissive IAM policies, unencrypted databases, and security groups with open ports - the kind of issues that lead to breaches. This guide covers installing Scout Suite on Ubuntu and running audits against AWS (with notes on Azure and GCP).

## Installing Scout Suite on Ubuntu

Scout Suite requires Python 3.8 or later. Ubuntu 20.04 and later include Python 3 by default.

```bash
# Install Python and pip
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv

# Verify Python version (needs 3.8+)
python3 --version
```

Install Scout Suite in a virtual environment to avoid dependency conflicts:

```bash
# Create a virtual environment for Scout Suite
python3 -m venv /opt/scoutsuite-env

# Activate the virtual environment
source /opt/scoutsuite-env/bin/activate

# Install Scout Suite
pip install scoutsuite

# Verify installation
scout --help
```

To use Scout Suite easily without activating the venv each time, create a wrapper script:

```bash
# Create a wrapper script
sudo tee /usr/local/bin/scout << 'EOF'
#!/bin/bash
source /opt/scoutsuite-env/bin/activate
exec scout "$@"
EOF

sudo chmod +x /usr/local/bin/scout

# Test it
scout --help
```

## Configuring AWS Credentials

Scout Suite needs read-only access to your AWS account. The recommended approach is creating a dedicated IAM user or role with the SecurityAudit managed policy.

### Creating an IAM User for Scout Suite

```bash
# Install AWS CLI
sudo apt-get install -y awscli

# Create IAM user and attach SecurityAudit policy (requires existing admin access)
aws iam create-user --user-name scoutsuite-audit

aws iam attach-user-policy \
  --user-name scoutsuite-audit \
  --policy-arn arn:aws:iam::aws:policy/SecurityAudit

# Create access keys for the user
aws iam create-access-key --user-name scoutsuite-audit
# Save the AccessKeyId and SecretAccessKey from the output
```

### Configuring AWS CLI Profile

```bash
# Configure a named profile for Scout Suite
aws configure --profile scoutsuite
# Enter the AccessKeyId, SecretAccessKey, and your default region
# Default output format: json

# Test the credentials
aws sts get-caller-identity --profile scoutsuite
```

Alternatively, use environment variables:

```bash
# Set credentials as environment variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"
```

## Running an AWS Audit

With credentials configured, run Scout Suite against your AWS account:

```bash
# Basic AWS audit using default credentials
scout aws

# Audit using a specific AWS CLI profile
scout aws --profile scoutsuite

# Audit specific services only (faster than full audit)
scout aws --services s3 iam ec2 rds

# Audit a specific AWS region only
scout aws --regions us-east-1 us-west-2

# Audit all regions with specific services
scout aws --services iam s3 vpc cloudtrail --regions all

# Save results to a specific output directory
scout aws --report-dir /tmp/scout-reports/$(date +%Y%m%d)
```

The audit can take 10-30 minutes depending on the size of your AWS environment and which services you include.

## Understanding the Scout Suite Report

Scout Suite generates an HTML report you can open in a browser:

```bash
# Find the generated report
ls /tmp/scout-reports/

# Open the report (if running with GUI)
xdg-open /tmp/scout-reports/scoutsuite-report/scoutsuite_results.html

# If running headlessly, copy the report directory to a machine with a browser
scp -r /tmp/scout-reports/scoutsuite-report/ user@local-machine:~/Desktop/
```

The report organizes findings by service, with each finding showing:

- **Severity** - Critical, High, Medium, Low, Good
- **Description** - What the issue is
- **Flagged Resources** - Which specific resources are affected
- **Rationale** - Why this is a security concern
- **Remediation** - How to fix it

## Common Findings and What They Mean

### S3 Bucket Misconfigurations

```text
Finding: s3-bucket-world-readable-acl
Severity: Critical
Description: S3 bucket has a public ACL allowing anyone to read its contents
Affected: s3://company-data-bucket

Remediation:
```

```bash
# Remove public access from an S3 bucket
aws s3api put-public-access-block \
  --bucket company-data-bucket \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### IAM Issues

```text
Finding: iam-root-account-no-mfa
Severity: Critical
Description: Root account does not have MFA enabled

Finding: iam-user-unused-access-key-90-days
Severity: Medium
Description: IAM user has access keys not used in 90+ days
```

```bash
# Identify unused access keys older than 90 days
aws iam generate-credential-report
aws iam get-credential-report --output text --query Content | base64 -d | \
  awk -F, 'NR>1 && $11=="false" && $14 != "N/A" {print $1, $14}'
```

### Security Group Issues

```text
Finding: ec2-security-group-opens-ssh-to-world
Severity: High
Description: Security group allows SSH (port 22) from 0.0.0.0/0
```

```bash
# Find security groups with open SSH
aws ec2 describe-security-groups \
  --filters Name=ip-permission.from-port,Values=22 Name=ip-permission.cidr,Values='0.0.0.0/0' \
  --query 'SecurityGroups[*].{ID:GroupId,Name:GroupName}'
```

## Auditing Multiple AWS Accounts

For organizations with multiple AWS accounts:

```bash
#!/bin/bash
# /usr/local/bin/multi-account-audit.sh
# Runs Scout Suite against multiple AWS accounts

ACCOUNTS=(
    "production:arn:aws:iam::123456789012:role/ScoutSuiteAuditRole"
    "staging:arn:aws:iam::098765432109:role/ScoutSuiteAuditRole"
    "development:arn:aws:iam::111222333444:role/ScoutSuiteAuditRole"
)

REPORT_BASE="/var/reports/scoutsuite/$(date +%Y%m%d)"
mkdir -p "$REPORT_BASE"

for ACCOUNT_ENTRY in "${ACCOUNTS[@]}"; do
    ACCOUNT_NAME="${ACCOUNT_ENTRY%%:*}"
    ROLE_ARN="${ACCOUNT_ENTRY#*:}"

    echo "Auditing account: $ACCOUNT_NAME ($ROLE_ARN)"

    # Assume the audit role in the target account
    CREDS=$(aws sts assume-role \
        --role-arn "$ROLE_ARN" \
        --role-session-name "ScoutSuiteAudit" \
        --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
        --output text)

    export AWS_ACCESS_KEY_ID=$(echo $CREDS | awk '{print $1}')
    export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | awk '{print $2}')
    export AWS_SESSION_TOKEN=$(echo $CREDS | awk '{print $3}')

    # Run Scout Suite with assumed role credentials
    scout aws \
        --report-dir "$REPORT_BASE/$ACCOUNT_NAME" \
        --no-browser \
        2>&1 | tee "$REPORT_BASE/${ACCOUNT_NAME}.log"

    # Clear credentials before next account
    unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

    echo "Completed audit for $ACCOUNT_NAME"
done

echo "All audits complete. Reports in: $REPORT_BASE"
```

## Auditing Azure and GCP

Scout Suite supports Azure and GCP with similar workflows:

### Azure

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Run Scout Suite against Azure subscription
scout azure --cli \
  --subscription-ids <subscription-id>
```

### GCP

```bash
# Install Google Cloud SDK
sudo apt-get install -y google-cloud-sdk

# Authenticate
gcloud auth application-default login

# Run Scout Suite against GCP project
scout gcp --user-account \
  --project-id your-project-id
```

## Automating Regular Audits

Run Scout Suite weekly and alert on new critical findings:

```bash
#!/bin/bash
# /usr/local/bin/weekly-cloud-audit.sh

source /opt/scoutsuite-env/bin/activate

REPORT_DIR="/var/reports/scoutsuite/$(date +%Y%m%d)"
LAST_REPORT=$(ls -d /var/reports/scoutsuite/*/scoutsuite_results.json 2>/dev/null | tail -1)

mkdir -p "$REPORT_DIR"

# Run audit
scout aws --profile scoutsuite --report-dir "$REPORT_DIR" --no-browser

# Extract critical findings count
CRITICAL_COUNT=$(python3 -c "
import json
with open('$REPORT_DIR/scoutsuite_results.json') as f:
    data = json.load(f)
count = sum(1 for service in data.get('services', {}).values()
            for finding in service.get('findings', {}).values()
            if finding.get('level') == 'danger')
print(count)
" 2>/dev/null || echo "0")

echo "Scout Suite audit complete. Critical findings: $CRITICAL_COUNT"

if [[ "$CRITICAL_COUNT" -gt 0 ]]; then
    echo "WARNING: $CRITICAL_COUNT critical findings in cloud audit" | \
        mail -s "Cloud Security Alert: $CRITICAL_COUNT Critical Findings" \
        security@example.com
fi

# Archive old reports older than 90 days
find /var/reports/scoutsuite/ -maxdepth 1 -type d -mtime +90 | \
  xargs -I {} tar -czf {}.tar.gz {} && xargs -I {} rm -rf {}
```

Add to crontab:

```bash
# Weekly audit every Sunday at 1 AM
0 1 * * 0 /usr/local/bin/weekly-cloud-audit.sh >> /var/log/scoutsuite-weekly.log 2>&1
```

Scout Suite won't catch every cloud security issue, but it systematically covers the most common misconfiguration patterns that lead to breaches. Running it regularly and tracking findings over time gives you a clear picture of your cloud security posture and a way to measure improvement.
