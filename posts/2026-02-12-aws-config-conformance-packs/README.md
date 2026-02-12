# How to Set Up AWS Config Conformance Packs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Config, Compliance, Conformance Packs, Governance

Description: Learn how to deploy AWS Config conformance packs to apply groups of compliance rules across your AWS accounts for frameworks like CIS, PCI DSS, and HIPAA.

---

Deploying Config rules one at a time works fine when you've got a handful of them. But when you need to implement an entire compliance framework - CIS Benchmarks, PCI DSS, HIPAA, or NIST - you're looking at dozens of rules. Adding them individually is tedious and error-prone. Conformance packs solve this by letting you deploy a collection of Config rules and remediation actions as a single unit.

Think of a conformance pack as a compliance template. AWS provides sample templates for common frameworks, and you can create your own custom packs for internal policies.

## What's in a Conformance Pack?

A conformance pack is a YAML template that contains:

- A list of AWS Config rules (managed or custom)
- Input parameters for those rules
- Optional remediation actions
- Optional conformance pack-level parameters

When you deploy a conformance pack, all the rules in it are created and evaluated. You get a compliance score for the pack as a whole, plus individual results for each rule.

## Deploying an AWS Sample Conformance Pack

AWS provides sample conformance packs for popular frameworks. Let's deploy the CIS AWS Foundations Benchmark pack.

First, download the sample template.

```bash
# Download the CIS Benchmark sample conformance pack
aws s3 cp s3://aws-configservice-us-east-1/cloudformation-templates-for-managed-rules/Operational-Best-Practices-for-CIS-AWS-v1.4-Level1.yaml \
  cis-level1-pack.yaml
```

Deploy it using the CLI.

```bash
# Deploy the conformance pack
aws configservice put-conformance-pack \
  --conformance-pack-name CIS-Level1-Benchmark \
  --template-body file://cis-level1-pack.yaml
```

Check the deployment status.

```bash
# Check the status of the conformance pack
aws configservice describe-conformance-pack-status \
  --conformance-pack-names CIS-Level1-Benchmark
```

It'll take a few minutes for all the rules to be created and the initial evaluation to complete.

## Available AWS Sample Packs

AWS provides sample packs for quite a few frameworks. Here are the most commonly used ones:

- **CIS AWS Foundations Benchmark** (Level 1 and Level 2)
- **PCI DSS**
- **HIPAA**
- **NIST 800-53**
- **SOC 2**
- **FedRAMP**
- **AWS Well-Architected Framework**
- **Operational Best Practices for various services** (S3, EC2, RDS, etc.)

You can browse all available samples in the Config console under "Conformance packs" or in the AWS Config Rules Repository on GitHub.

## Creating a Custom Conformance Pack

The real power comes from creating your own packs. Here's a template for a custom security baseline.

```yaml
# custom-security-baseline.yaml
Parameters:
  MaxAccessKeyAge:
    Type: String
    Default: "90"
  MaxPasswordAge:
    Type: String
    Default: "90"

Resources:

  # IAM Rules
  IamRootAccountMfa:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: root-mfa-enabled
      Source:
        Owner: AWS
        SourceIdentifier: ROOT_ACCOUNT_MFA_ENABLED

  IamUserMfa:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: iam-user-mfa
      Source:
        Owner: AWS
        SourceIdentifier: IAM_USER_MFA_ENABLED

  AccessKeysRotated:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: access-keys-rotated
      InputParameters:
        maxAccessKeyAge: !Ref MaxAccessKeyAge
      Source:
        Owner: AWS
        SourceIdentifier: ACCESS_KEYS_ROTATED

  IamPasswordPolicy:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: iam-password-policy
      InputParameters:
        MaxPasswordAge: !Ref MaxPasswordAge
        MinimumPasswordLength: "14"
        RequireSymbols: "true"
        RequireNumbers: "true"
        RequireUppercaseCharacters: "true"
        RequireLowercaseCharacters: "true"
        PasswordReusePrevention: "24"
      Source:
        Owner: AWS
        SourceIdentifier: IAM_PASSWORD_POLICY

  # Encryption Rules
  EncryptedVolumes:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: ebs-encryption
      Scope:
        ComplianceResourceTypes:
          - AWS::EC2::Volume
      Source:
        Owner: AWS
        SourceIdentifier: ENCRYPTED_VOLUMES

  RdsEncrypted:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: rds-encryption
      Source:
        Owner: AWS
        SourceIdentifier: RDS_STORAGE_ENCRYPTED

  S3BucketEncryption:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: s3-encryption
      Source:
        Owner: AWS
        SourceIdentifier: S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED

  # Network Rules
  RestrictedSsh:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: no-open-ssh
      Scope:
        ComplianceResourceTypes:
          - AWS::EC2::SecurityGroup
      Source:
        Owner: AWS
        SourceIdentifier: INCOMING_SSH_DISABLED

  VpcFlowLogs:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: vpc-flow-logs
      Source:
        Owner: AWS
        SourceIdentifier: VPC_FLOW_LOGS_ENABLED

  DefaultSecurityGroupClosed:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: default-sg-closed
      Source:
        Owner: AWS
        SourceIdentifier: VPC_DEFAULT_SECURITY_GROUP_CLOSED

  # Logging Rules
  CloudTrailEnabled:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: cloudtrail-on
      Source:
        Owner: AWS
        SourceIdentifier: CLOUD_TRAIL_ENABLED

  CloudTrailLogValidation:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: cloudtrail-validation
      Source:
        Owner: AWS
        SourceIdentifier: CLOUD_TRAIL_LOG_FILE_VALIDATION_ENABLED

  MultiRegionCloudTrail:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: multi-region-trail
      Source:
        Owner: AWS
        SourceIdentifier: MULTI_REGION_CLOUD_TRAIL_ENABLED
```

Deploy your custom pack.

```bash
aws configservice put-conformance-pack \
  --conformance-pack-name Custom-Security-Baseline \
  --template-body file://custom-security-baseline.yaml \
  --conformance-pack-input-parameters '[
    {"ParameterName": "MaxAccessKeyAge", "ParameterValue": "60"},
    {"ParameterName": "MaxPasswordAge", "ParameterValue": "60"}
  ]'
```

## Deploying Across Multiple Accounts

If you're using AWS Organizations, you can deploy conformance packs to all member accounts from the management account.

```bash
# Deploy to all accounts in the organization
aws configservice put-organization-conformance-pack \
  --organization-conformance-pack-name Org-Security-Baseline \
  --template-body file://custom-security-baseline.yaml \
  --excluded-accounts '["999999999999"]'
```

The `--excluded-accounts` parameter lets you skip specific accounts that might have legitimate reasons for different configurations (like sandbox accounts).

Check deployment status across the organization.

```bash
# Check status across all accounts
aws configservice get-organization-conformance-pack-detailed-status \
  --organization-conformance-pack-name Org-Security-Baseline

# Get the compliance summary
aws configservice describe-organization-conformance-pack-statuses \
  --organization-conformance-pack-names Org-Security-Baseline
```

## Viewing Compliance Results

Once deployed, check how your resources stack up.

```bash
# Get compliance summary for the conformance pack
aws configservice get-conformance-pack-compliance-summary \
  --conformance-pack-names Custom-Security-Baseline

# Get detailed compliance results per rule
aws configservice get-conformance-pack-compliance-details \
  --conformance-pack-name Custom-Security-Baseline \
  --filters '{"ComplianceType": "NON_COMPLIANT"}'
```

The compliance dashboard in the Config console gives you a visual breakdown showing how many rules are compliant vs non-compliant, and which specific resources are causing failures.

## Adding Remediation Actions

You can include automatic remediation in your conformance pack. Here's how to add a remediation action that enables S3 bucket encryption when it's missing.

```yaml
S3BucketEncryption:
  Type: AWS::Config::ConfigRule
  Properties:
    ConfigRuleName: s3-encryption
    Source:
      Owner: AWS
      SourceIdentifier: S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED

S3BucketEncryptionRemediation:
  Type: AWS::Config::RemediationConfiguration
  Properties:
    ConfigRuleName: s3-encryption
    TargetType: SSM_DOCUMENT
    TargetId: AWS-EnableS3BucketEncryption
    Parameters:
      BucketName:
        ResourceValue:
          Value: RESOURCE_ID
      SSEAlgorithm:
        StaticValue:
          Values:
            - AES256
    Automatic: true
    MaximumAutomaticAttempts: 3
    RetryAttemptSeconds: 60
```

Be cautious with automatic remediation. Start with manual remediation to make sure the actions work as expected before enabling auto-remediation. You don't want a misconfigured remediation action making things worse across all your accounts.

## Terraform for Conformance Packs

```hcl
resource "aws_config_conformance_pack" "security_baseline" {
  name = "Custom-Security-Baseline"

  template_body = file("${path.module}/custom-security-baseline.yaml")

  input_parameter {
    parameter_name  = "MaxAccessKeyAge"
    parameter_value = "60"
  }

  input_parameter {
    parameter_name  = "MaxPasswordAge"
    parameter_value = "60"
  }
}
```

## Best Practices

1. **Start with AWS sample packs** and customize from there rather than building from scratch
2. **Test in a single account** before deploying organization-wide
3. **Use parameters** so you can adjust thresholds without modifying the template
4. **Review compliance results weekly** and set a goal to reduce non-compliant resources over time
5. **Combine with remediation** for rules where auto-fix is safe

For setting up Config itself, see [enabling AWS Config](https://oneuptime.com/blog/post/enable-aws-config-resource-compliance/view). For cross-account visibility, look into [Config aggregators](https://oneuptime.com/blog/post/aws-config-aggregators-multi-account/view). And for handling non-compliant resources, check out [remediation with AWS Config](https://oneuptime.com/blog/post/remediate-non-compliant-resources-aws-config/view).
