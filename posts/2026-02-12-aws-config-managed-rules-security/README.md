# How to Use AWS Config Managed Rules for Security Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Config, Security, Compliance, Best Practices

Description: Learn how to deploy AWS Config managed rules that enforce security best practices across your AWS environment, covering IAM, encryption, networking, and logging.

---

AWS Config comes with over 300 managed rules that you can enable with a few clicks. These are pre-built compliance checks maintained by AWS, covering everything from IAM security to encryption requirements to network configuration. Instead of writing custom Lambda functions for every check, you can lean on these managed rules for the most common security requirements.

The challenge isn't that there aren't enough rules - it's knowing which ones to start with. Let me walk you through the most important security rules organized by category, and show you how to deploy them.

## IAM Security Rules

IAM misconfigurations are among the most common causes of security incidents in AWS. These rules help catch the most dangerous ones.

### Root Account Protection

The root account has unrestricted access to everything. These rules make sure it's properly secured.

```bash
# Check that the root account has MFA enabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "root-account-mfa-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ROOT_ACCOUNT_MFA_ENABLED"
    }
  }'

# Check that hardware MFA is enabled for root (not virtual)
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "root-account-hardware-mfa",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ROOT_ACCOUNT_HARDWARE_MFA_ENABLED"
    }
  }'
```

### IAM User Security

These rules check that individual IAM users follow security best practices.

```bash
# Check that all IAM users have MFA enabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "iam-user-mfa-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "IAM_USER_MFA_ENABLED"
    }
  }'

# Check that unused IAM credentials are disabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "iam-user-unused-credentials",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "IAM_USER_UNUSED_CREDENTIALS_CHECK"
    },
    "InputParameters": "{\"maxCredentialUsageAge\": \"90\"}"
  }'

# Check that IAM access keys are rotated within 90 days
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "access-keys-rotated",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ACCESS_KEYS_ROTATED"
    },
    "InputParameters": "{\"maxAccessKeyAge\": \"90\"}"
  }'

# Check that no IAM policies grant full "*" admin access
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "iam-no-inline-policy-check",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "IAM_POLICY_NO_STATEMENTS_WITH_ADMIN_ACCESS"
    }
  }'
```

## Encryption Rules

Data encryption should be non-negotiable. These rules verify that encryption is enabled where it matters.

```bash
# Check that EBS volumes are encrypted
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "encrypted-ebs-volumes",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ENCRYPTED_VOLUMES"
    },
    "Scope": {
      "ComplianceResourceTypes": ["AWS::EC2::Volume"]
    }
  }'

# Check that RDS instances are encrypted
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "rds-storage-encrypted",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "RDS_STORAGE_ENCRYPTED"
    }
  }'

# Check that S3 buckets have server-side encryption enabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "s3-bucket-server-side-encryption",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
    }
  }'

# Check that S3 buckets enforce SSL for data in transit
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "s3-bucket-ssl-requests-only",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "S3_BUCKET_SSL_REQUESTS_ONLY"
    }
  }'

# Check that CloudTrail logs are encrypted with KMS
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "cloud-trail-encryption-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "CLOUD_TRAIL_ENCRYPTION_ENABLED"
    }
  }'
```

## Network Security Rules

Network misconfigurations can expose your infrastructure to the internet. These rules are the safety net.

```bash
# Check that no security groups allow unrestricted SSH access
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "restricted-ssh",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "INCOMING_SSH_DISABLED"
    },
    "Scope": {
      "ComplianceResourceTypes": ["AWS::EC2::SecurityGroup"]
    }
  }'

# Check that no security groups allow unrestricted access to common ports
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "restricted-common-ports",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "RESTRICTED_INCOMING_TRAFFIC"
    },
    "InputParameters": "{\"blockedPort1\": \"3306\", \"blockedPort2\": \"3389\", \"blockedPort3\": \"5432\", \"blockedPort4\": \"1433\", \"blockedPort5\": \"6379\"}",
    "Scope": {
      "ComplianceResourceTypes": ["AWS::EC2::SecurityGroup"]
    }
  }'

# Check that the default security group restricts all traffic
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "vpc-default-security-group-closed",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "VPC_DEFAULT_SECURITY_GROUP_CLOSED"
    }
  }'

# Check that VPC flow logs are enabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "vpc-flow-logs-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "VPC_FLOW_LOGS_ENABLED"
    }
  }'
```

## Logging and Monitoring Rules

You can't investigate what you don't log. These rules make sure logging is properly configured.

```bash
# Check that CloudTrail is enabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "cloudtrail-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "CLOUD_TRAIL_ENABLED"
    }
  }'

# Check that CloudTrail log file validation is enabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "cloudtrail-log-file-validation",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "CLOUD_TRAIL_LOG_FILE_VALIDATION_ENABLED"
    }
  }'

# Check that CloudTrail is multi-region
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "multi-region-cloudtrail",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "MULTI_REGION_CLOUD_TRAIL_ENABLED"
    }
  }'
```

## Deploying All Rules with Terraform

Here's a Terraform module that deploys all the essential security rules at once.

```hcl
locals {
  security_rules = {
    "root-account-mfa-enabled" = {
      source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
    }
    "iam-user-mfa-enabled" = {
      source_identifier = "IAM_USER_MFA_ENABLED"
    }
    "access-keys-rotated" = {
      source_identifier  = "ACCESS_KEYS_ROTATED"
      input_parameters   = "{\"maxAccessKeyAge\": \"90\"}"
    }
    "encrypted-volumes" = {
      source_identifier  = "ENCRYPTED_VOLUMES"
      resource_types     = ["AWS::EC2::Volume"]
    }
    "rds-storage-encrypted" = {
      source_identifier = "RDS_STORAGE_ENCRYPTED"
    }
    "s3-bucket-ssl-requests-only" = {
      source_identifier = "S3_BUCKET_SSL_REQUESTS_ONLY"
    }
    "restricted-ssh" = {
      source_identifier = "INCOMING_SSH_DISABLED"
      resource_types    = ["AWS::EC2::SecurityGroup"]
    }
    "vpc-flow-logs-enabled" = {
      source_identifier = "VPC_FLOW_LOGS_ENABLED"
    }
    "cloudtrail-enabled" = {
      source_identifier = "CLOUD_TRAIL_ENABLED"
    }
  }
}

resource "aws_config_config_rule" "security" {
  for_each = local.security_rules

  name             = each.key
  input_parameters = lookup(each.value, "input_parameters", null)

  source {
    owner             = "AWS"
    source_identifier = each.value.source_identifier
  }

  dynamic "scope" {
    for_each = contains(keys(each.value), "resource_types") ? [1] : []
    content {
      compliance_resource_types = each.value.resource_types
    }
  }
}
```

## Checking Compliance Status

After rules are deployed, check the overall compliance status.

```bash
# Get compliance summary by rule
aws configservice get-compliance-summary-by-config-rule

# Get details for non-compliant resources
aws configservice get-compliance-details-by-config-rule \
  --config-rule-name restricted-ssh \
  --compliance-types NON_COMPLIANT

# Get a per-resource compliance summary
aws configservice get-compliance-details-by-resource \
  --resource-type AWS::EC2::SecurityGroup \
  --resource-id sg-0123456789abcdef0
```

## Which Rules to Start With

If you're just getting started, don't enable all 300+ rules at once. Start with these high-impact ones:

1. **ROOT_ACCOUNT_MFA_ENABLED** - Protects the most powerful account
2. **INCOMING_SSH_DISABLED** - Catches open SSH to the world
3. **ENCRYPTED_VOLUMES** - Ensures data-at-rest encryption
4. **CLOUD_TRAIL_ENABLED** - Guarantees audit logging
5. **S3_BUCKET_SSL_REQUESTS_ONLY** - Enforces encryption in transit
6. **IAM_USER_MFA_ENABLED** - Basic user security
7. **VPC_DEFAULT_SECURITY_GROUP_CLOSED** - Prevents accidental exposure

Get these running, address the non-compliant resources, then expand to more rules. For a structured approach, check out [AWS Config conformance packs](https://oneuptime.com/blog/post/2026-02-12-aws-config-conformance-packs/view) which bundle rules together for specific compliance frameworks like CIS or PCI DSS.

When you need rules that don't exist as managed rules, you'll need to [write custom Config rules](https://oneuptime.com/blog/post/2026-02-12-create-custom-aws-config-rules/view). And to automatically fix non-compliant resources, look into [Config remediation actions](https://oneuptime.com/blog/post/2026-02-12-remediate-non-compliant-resources-aws-config/view).
