# How to Suppress GuardDuty False Positive Findings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, GuardDuty, Security, False Positives

Description: Learn how to use GuardDuty suppression rules and trusted IP lists to reduce false positive findings without disabling threat detection in your AWS environment.

---

After running GuardDuty for a few weeks, you'll notice that some findings keep showing up that aren't actual threats. Your penetration testing tools trigger reconnaissance findings. Your NAT gateway shows up as a "port probe" source. Your CI/CD pipeline's IP gets flagged for unusual API activity. These false positives create noise that makes it harder to spot real threats.

You've got two main tools for dealing with this: suppression rules (also called filter rules) and trusted IP lists. Each works differently, and using the right one matters.

## Suppression Rules vs. Trusted IP Lists

**Trusted IP lists** tell GuardDuty to skip threat detection entirely for specific IP addresses. Any traffic from those IPs won't generate findings at all. Use these for your own infrastructure IPs - office networks, VPN endpoints, corporate proxies.

**Suppression rules** (archive rules) don't prevent findings from being generated. Instead, they automatically archive findings that match specific criteria. The findings still exist and can be viewed, but they're hidden from the active findings list and won't trigger EventBridge notifications. Use these for everything else.

The distinction matters. Trusted IP lists create blind spots - if an attacker compromises a machine on your trusted network, GuardDuty won't see it. Suppression rules are safer because the findings still get generated and stored.

## Setting Up Trusted IP Lists

Create a text file with your trusted IPs, one per line, and upload it to S3.

```bash
# Create the trusted IPs file
# Each line should be an IP address or CIDR range
# Example content:
# 203.0.113.10
# 198.51.100.0/24
# 10.0.0.0/8

# Upload to S3
aws s3 cp trusted-ips.txt s3://my-security-bucket/guardduty/trusted-ips.txt
```

Then register the list with GuardDuty.

```bash
DETECTOR_ID=$(aws guardduty list-detectors --query 'DetectorIds[0]' --output text)

# Create the trusted IP set
aws guardduty create-ip-set \
  --detector-id $DETECTOR_ID \
  --name OfficeTrustedIPs \
  --format TXT \
  --location s3://my-security-bucket/guardduty/trusted-ips.txt \
  --activate
```

To update the list later, modify the file in S3 and then update the IP set.

```bash
# Get the IP set ID
IP_SET_ID=$(aws guardduty list-ip-sets --detector-id $DETECTOR_ID --query 'IpSetIds[0]' --output text)

# Update it (trigger a re-read of the file)
aws guardduty update-ip-set \
  --detector-id $DETECTOR_ID \
  --ip-set-id $IP_SET_ID \
  --location s3://my-security-bucket/guardduty/trusted-ips.txt \
  --activate
```

Note: GuardDuty limits you to one trusted IP list and six threat intelligence lists per detector.

## Creating Suppression Rules

Suppression rules use the same filter syntax as the GuardDuty console's finding filters. You define criteria, and any findings that match get automatically archived.

### Suppress Findings for a Specific Instance

If you've got a security scanning instance that legitimately generates port scan findings, suppress those.

```bash
aws guardduty create-filter \
  --detector-id $DETECTOR_ID \
  --name suppress-security-scanner \
  --action ARCHIVE \
  --finding-criteria '{
    "Criterion": {
      "resource.instanceDetails.instanceId": {
        "Eq": ["i-0abc123security"]
      },
      "type": {
        "Eq": ["Recon:EC2/PortProbeUnprotectedPort"]
      }
    }
  }' \
  --description "Suppress port scan findings from our security scanner instance"
```

### Suppress Findings for a DNS Pattern

If your application legitimately makes DNS queries that trigger GuardDuty findings, suppress based on the domain.

```bash
aws guardduty create-filter \
  --detector-id $DETECTOR_ID \
  --name suppress-known-domains \
  --action ARCHIVE \
  --finding-criteria '{
    "Criterion": {
      "service.action.dnsRequestAction.domain": {
        "Eq": ["pool.ntp.org", "time.aws.com"]
      },
      "type": {
        "Eq": ["Trojan:EC2/DNSDataExfiltration"]
      }
    }
  }' \
  --description "Suppress DNS findings for legitimate NTP domains"
```

### Suppress Low-Severity Findings for Specific Accounts

For sandbox or dev accounts where low-severity findings are expected.

```bash
aws guardduty create-filter \
  --detector-id $DETECTOR_ID \
  --name suppress-dev-low-severity \
  --action ARCHIVE \
  --finding-criteria '{
    "Criterion": {
      "accountId": {
        "Eq": ["999999999999"]
      },
      "severity": {
        "Lt": 4
      }
    }
  }' \
  --description "Suppress low-severity findings in dev account"
```

### Suppress Specific Finding Types

If a particular finding type generates too many false positives, suppress it globally (be careful with this).

```bash
aws guardduty create-filter \
  --detector-id $DETECTOR_ID \
  --name suppress-policy-findings \
  --action ARCHIVE \
  --finding-criteria '{
    "Criterion": {
      "type": {
        "Eq": ["Policy:IAMUser/RootCredentialUsage"]
      },
      "service.action.awsApiCallAction.callerType": {
        "Eq": ["AWSService"]
      }
    }
  }' \
  --description "Suppress root usage findings when triggered by AWS services"
```

## Managing Suppression Rules

List and review your existing rules.

```bash
# List all filters
aws guardduty list-filters --detector-id $DETECTOR_ID

# Get details of a specific filter
aws guardduty get-filter \
  --detector-id $DETECTOR_ID \
  --filter-name suppress-security-scanner

# Delete a filter that is no longer needed
aws guardduty delete-filter \
  --detector-id $DETECTOR_ID \
  --filter-name old-suppression-rule
```

## Terraform Configuration

```hcl
# Trusted IP list
resource "aws_guardduty_ipset" "trusted" {
  activate    = true
  detector_id = aws_guardduty_detector.main.id
  format      = "TXT"
  location    = "s3://${aws_s3_bucket.security.id}/guardduty/trusted-ips.txt"
  name        = "OfficeTrustedIPs"
}

# Suppression rule for security scanner
resource "aws_guardduty_filter" "security_scanner" {
  name        = "suppress-security-scanner"
  action      = "ARCHIVE"
  detector_id = aws_guardduty_detector.main.id
  description = "Suppress port scan findings from security scanner"
  rank        = 1

  finding_criteria {
    criterion {
      field  = "resource.instanceDetails.instanceId"
      equals = ["i-0abc123security"]
    }
    criterion {
      field  = "type"
      equals = ["Recon:EC2/PortProbeUnprotectedPort"]
    }
  }
}

# Suppression rule for dev account low severity
resource "aws_guardduty_filter" "dev_low_severity" {
  name        = "suppress-dev-low-severity"
  action      = "ARCHIVE"
  detector_id = aws_guardduty_detector.main.id
  description = "Suppress low-severity findings in dev accounts"
  rank        = 2

  finding_criteria {
    criterion {
      field  = "accountId"
      equals = ["999999999999"]
    }
    criterion {
      field      = "severity"
      less_than  = ["4"]
    }
  }
}
```

## Best Practices for Suppression

1. **Start narrow, widen later** - Begin with very specific suppression rules targeting exact instance IDs or finding types. Broad rules can hide real threats.

2. **Review archived findings monthly** - Just because findings are suppressed doesn't mean they should be ignored forever. Periodically check if your suppression rules are still appropriate.

3. **Document why each rule exists** - Use the description field to explain the business reason for the suppression. Future you (or your replacement) will thank you.

4. **Prefer suppression rules over trusted IPs** - Suppression rules are reversible and the findings still exist. Trusted IPs create actual blind spots.

5. **Never suppress high-severity findings globally** - If high-severity findings are false positives, suppress them with very specific criteria (specific instance, specific finding type). Never suppress all high-severity findings.

6. **Tag instances that legitimately trigger findings** - If an instance runs security tools, tag it with something like `Purpose: SecurityScanner`. This makes it easier to write targeted suppression rules.

```bash
# Use tags in suppression rules
aws guardduty create-filter \
  --detector-id $DETECTOR_ID \
  --name suppress-tagged-scanners \
  --action ARCHIVE \
  --finding-criteria '{
    "Criterion": {
      "resource.instanceDetails.tags.value": {
        "Eq": ["SecurityScanner"]
      },
      "resource.instanceDetails.tags.key": {
        "Eq": ["Purpose"]
      },
      "type": {
        "Eq": ["Recon:EC2/PortProbeUnprotectedPort", "Recon:EC2/Portscan"]
      }
    }
  }'
```

## Checking Your Suppression Effectiveness

Query the ratio of active vs archived findings to see if your suppression rules are working well.

```bash
# Count active findings
ACTIVE=$(aws guardduty list-findings \
  --detector-id $DETECTOR_ID \
  --finding-criteria '{"Criterion": {"service.archived": {"Eq": ["false"]}}}' \
  --query 'FindingIds | length(@)' --output text)

# Count archived (suppressed) findings
ARCHIVED=$(aws guardduty list-findings \
  --detector-id $DETECTOR_ID \
  --finding-criteria '{"Criterion": {"service.archived": {"Eq": ["true"]}}}' \
  --query 'FindingIds | length(@)' --output text)

echo "Active findings: $ACTIVE"
echo "Archived findings: $ARCHIVED"
```

If your archived count is very high relative to active, your suppression rules might be too aggressive. If active count is overwhelming, you need more targeted suppression.

For setting up GuardDuty across your organization, see [GuardDuty multi-account setup](https://oneuptime.com/blog/post/guardduty-multiple-aws-accounts/view). To get all your security findings in one place, check out [integrating GuardDuty with Security Hub](https://oneuptime.com/blog/post/integrate-guardduty-security-hub/view).
