# How to Audit IAM Users and Roles with Credential Reports

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Auditing

Description: Learn how to use AWS IAM credential reports to audit users, identify stale accounts, check MFA compliance, and find security risks across your account.

---

You can't secure what you can't see. IAM credential reports give you a snapshot of every user in your AWS account - their passwords, access keys, MFA status, and activity. It's the single most useful tool for IAM security auditing, and it's completely free.

This guide shows you how to generate, parse, and act on credential reports to find security gaps before auditors (or attackers) do.

## What's in a Credential Report?

A credential report is a CSV file containing one row per IAM user (including the root account). Each row includes:

- Username and ARN
- Whether the user has a password and when it was last used
- Whether the user has access keys and when they were last used
- Whether the user has MFA enabled
- Password and key creation/rotation dates

## Generating a Credential Report

Credential reports are generated on demand. They take a few seconds to build.

```bash
# Generate a fresh credential report
aws iam generate-credential-report

# Wait for it to complete (usually 5-10 seconds)
sleep 10

# Download the report (it comes as base64-encoded CSV)
aws iam get-credential-report \
  --query 'Content' \
  --output text | base64 --decode > /tmp/credential-report.csv
```

You can also check when the last report was generated:

```bash
# Check the generation status and timestamp
aws iam generate-credential-report \
  --query '{State: State, Date: Description}'
```

## Reading the Report

The CSV has a lot of columns. Here are the most important ones:

| Column | What It Tells You |
|--------|-------------------|
| `user` | Username (first row is always `<root_account>`) |
| `password_enabled` | Does this user have console access? |
| `password_last_used` | When did they last log in to the console? |
| `mfa_active` | Is MFA enabled? |
| `access_key_1_active` | Does the user have an active first access key? |
| `access_key_1_last_used_date` | When was the first key last used? |
| `access_key_1_last_rotated` | When was the first key created/rotated? |
| `access_key_2_active` | Same for the second key |

## Comprehensive Audit Script

Here's a Python script that analyzes a credential report and flags common security issues:

```python
import boto3
import csv
from io import StringIO
from datetime import datetime, timezone, timedelta

def run_credential_audit():
    """
    Analyze the IAM credential report and flag security issues.
    """
    iam = boto3.client("iam")

    # Generate and fetch the report
    iam.generate_credential_report()

    import time
    time.sleep(10)

    report = iam.get_credential_report()
    content = report["Content"].decode("utf-8")
    reader = csv.DictReader(StringIO(content))

    now = datetime.now(timezone.utc)
    findings = []

    for row in reader:
        user = row["user"]
        arn = row["arn"]

        # Check 1: Root account MFA
        if user == "<root_account>":
            if row["mfa_active"] == "false":
                findings.append({
                    "severity": "CRITICAL",
                    "user": user,
                    "issue": "Root account does not have MFA enabled"
                })

            if row.get("access_key_1_active") == "true":
                findings.append({
                    "severity": "HIGH",
                    "user": user,
                    "issue": "Root account has active access keys"
                })
            continue

        # Check 2: Console users without MFA
        if row["password_enabled"] == "true" and row["mfa_active"] == "false":
            findings.append({
                "severity": "HIGH",
                "user": user,
                "issue": "Console access enabled but MFA not configured"
            })

        # Check 3: Unused console passwords (no login in 90+ days)
        if row["password_enabled"] == "true":
            last_used = row.get("password_last_used", "N/A")
            if last_used not in ("N/A", "no_information", "not_supported"):
                last_login = datetime.fromisoformat(
                    last_used.replace("Z", "+00:00")
                )
                days_idle = (now - last_login).days
                if days_idle > 90:
                    findings.append({
                        "severity": "MEDIUM",
                        "user": user,
                        "issue": f"Console password unused for {days_idle} days"
                    })

        # Check 4: Old access keys (not rotated in 90+ days)
        for key_num in ["1", "2"]:
            active = row.get(f"access_key_{key_num}_active", "false")
            if active != "true":
                continue

            rotated = row.get(f"access_key_{key_num}_last_rotated", "N/A")
            if rotated in ("N/A", "not_supported"):
                continue

            rotated_date = datetime.fromisoformat(
                rotated.replace("Z", "+00:00")
            )
            key_age = (now - rotated_date).days

            if key_age > 90:
                findings.append({
                    "severity": "HIGH",
                    "user": user,
                    "issue": f"Access key {key_num} is {key_age} days old (not rotated)"
                })

        # Check 5: Unused access keys (not used in 90+ days)
        for key_num in ["1", "2"]:
            active = row.get(f"access_key_{key_num}_active", "false")
            if active != "true":
                continue

            last_used = row.get(
                f"access_key_{key_num}_last_used_date", "N/A"
            )
            if last_used in ("N/A", "not_supported"):
                findings.append({
                    "severity": "MEDIUM",
                    "user": user,
                    "issue": f"Access key {key_num} has never been used"
                })
                continue

            used_date = datetime.fromisoformat(
                last_used.replace("Z", "+00:00")
            )
            days_unused = (now - used_date).days

            if days_unused > 90:
                findings.append({
                    "severity": "MEDIUM",
                    "user": user,
                    "issue": f"Access key {key_num} unused for {days_unused} days"
                })

    return findings

# Run the audit and display results
findings = run_credential_audit()

# Sort by severity
severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
findings.sort(key=lambda f: severity_order.get(f["severity"], 99))

print(f"\n{'='*70}")
print(f"IAM Credential Audit Report - {datetime.now().strftime('%Y-%m-%d')}")
print(f"{'='*70}\n")
print(f"Total findings: {len(findings)}\n")

for f in findings:
    print(f"[{f['severity']}] {f['user']}: {f['issue']}")
```

## Scheduling Regular Audits

Run this audit weekly or monthly with a Lambda function. Send results to your team via SNS or Slack:

```python
import boto3
import json

def lambda_handler(event, context):
    # Run the audit (use the function from above)
    findings = run_credential_audit()

    if not findings:
        return {"statusCode": 200, "body": "No issues found"}

    # Format the findings for notification
    critical = [f for f in findings if f["severity"] == "CRITICAL"]
    high = [f for f in findings if f["severity"] == "HIGH"]
    medium = [f for f in findings if f["severity"] == "MEDIUM"]

    message = f"IAM Audit: {len(critical)} critical, {len(high)} high, {len(medium)} medium\n\n"

    for f in findings:
        message += f"[{f['severity']}] {f['user']}: {f['issue']}\n"

    # Send via SNS
    sns = boto3.client("sns")
    sns.publish(
        TopicArn="arn:aws:sns:us-east-1:123456789012:security-alerts",
        Subject=f"IAM Audit: {len(findings)} findings",
        Message=message
    )

    return {"statusCode": 200, "body": f"Published {len(findings)} findings"}
```

## Credential Report Limitations

There are a few things credential reports don't cover:

- **IAM roles**: The report only includes IAM users, not roles. For role auditing, you need to use other APIs.
- **Permission details**: The report shows credentials, not what permissions those credentials grant.
- **Real-time data**: Reports are snapshots. There can be a delay of up to 4 hours.
- **Service account usage**: The report shows when keys were used but not what they were used for.

For role-level auditing, use the IAM Access Advisor:

```bash
# Generate a service last accessed report for a role
aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::123456789012:role/MyRole

# Then retrieve the results using the job ID
aws iam get-service-last-accessed-details \
  --job-id "job-id-here"
```

## Comparing Reports Over Time

Save credential reports regularly and compare them to detect changes:

```bash
# Download today's report
aws iam generate-credential-report && sleep 10
aws iam get-credential-report \
  --query 'Content' \
  --output text | base64 --decode > "/tmp/cred-report-$(date +%Y-%m-%d).csv"
```

Then write a simple diff:

```python
import csv

def compare_reports(old_file, new_file):
    """Compare two credential reports and show differences."""
    def load_report(filename):
        with open(filename) as f:
            return {row["user"]: row for row in csv.DictReader(f)}

    old = load_report(old_file)
    new = load_report(new_file)

    # Find new users
    new_users = set(new.keys()) - set(old.keys())
    for user in new_users:
        print(f"[NEW USER] {user}")

    # Find removed users
    removed_users = set(old.keys()) - set(new.keys())
    for user in removed_users:
        print(f"[REMOVED USER] {user}")

    # Check for changes
    for user in set(old.keys()) & set(new.keys()):
        if old[user]["mfa_active"] == "true" and new[user]["mfa_active"] == "false":
            print(f"[MFA REMOVED] {user}")
        if old[user]["access_key_1_active"] == "false" and new[user]["access_key_1_active"] == "true":
            print(f"[NEW ACCESS KEY] {user}")

compare_reports("/tmp/cred-report-2026-01-12.csv", "/tmp/cred-report-2026-02-12.csv")
```

## Integration with Monitoring

Feed your audit results into your monitoring platform to track trends over time. If you're using OneUptime, you can create custom metrics for things like "number of users without MFA" or "number of stale access keys" and set up alerts when those numbers increase.

For the full picture on cleaning up what you find, see our guide on [deleting unused IAM users, roles, and policies](https://oneuptime.com/blog/post/delete-unused-iam-users-roles-policies/view). And make sure you're also [rotating access keys](https://oneuptime.com/blog/post/rotate-iam-access-keys-safely/view) that the audit flags as stale.

Credential reports aren't glamorous, but they're one of the most effective tools for maintaining IAM hygiene. Run them regularly, act on the findings, and your security posture will improve steadily over time.
