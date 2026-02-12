# How to Set Up AWS Audit Manager for Compliance Auditing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Compliance, Audit Manager, Security

Description: A complete guide to setting up AWS Audit Manager for automated compliance auditing, including framework selection, assessment creation, and evidence collection.

---

Compliance auditing is one of those tasks that nobody loves but everyone needs. Whether you're dealing with SOC 2, PCI DSS, HIPAA, or GDPR, the process of gathering evidence and proving compliance eats up enormous amounts of time. AWS Audit Manager automates a big chunk of that work by continuously collecting evidence from your AWS environment and mapping it to compliance framework controls.

Let's walk through setting it up properly.

## What Audit Manager Actually Does

At its core, Audit Manager does three things:

1. Collects evidence automatically from AWS services like CloudTrail, Config, and Security Hub
2. Maps that evidence to specific controls in compliance frameworks
3. Organizes everything so you can hand it to auditors without scrambling

It doesn't replace your auditor. It just makes their job (and yours) significantly easier.

## Enabling Audit Manager

Getting started is straightforward. You can enable it from the console or CLI.

This command enables Audit Manager in your account with a specified S3 bucket for evidence storage:

```bash
# Enable Audit Manager with an evidence destination
aws auditmanager register-account \
  --delegated-admin-account 123456789012
```

You'll also need an S3 bucket for storing assessment reports:

```bash
# Create a bucket for audit reports
aws s3 mb s3://my-org-audit-reports-123456789012 \
  --region us-east-1

# Enable versioning for audit trail integrity
aws s3api put-bucket-versioning \
  --bucket my-org-audit-reports-123456789012 \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket my-org-audit-reports-123456789012 \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## Understanding Frameworks

Audit Manager comes with pre-built frameworks for common compliance standards. These include:

- **SOC 2** - Service Organization Control reports
- **PCI DSS** - Payment Card Industry Data Security Standard
- **HIPAA** - Health Insurance Portability and Accountability Act
- **GDPR** - General Data Protection Regulation
- **CIS AWS Foundations Benchmark** - Center for Internet Security benchmarks
- **AWS Operational Best Practices** - AWS's own best practice controls

Each framework contains control sets, and each control set contains individual controls. Controls are mapped to data sources that tell Audit Manager where to look for evidence.

You can list available frameworks:

```bash
# List all available standard frameworks
aws auditmanager list-assessment-frameworks \
  --framework-type Standard

# List custom frameworks you've created
aws auditmanager list-assessment-frameworks \
  --framework-type Custom
```

## Creating Your First Assessment

An assessment is an instance of a framework applied to specific AWS accounts and services. Think of it as saying "evaluate these accounts against this standard."

Here's how to create a SOC 2 assessment:

```bash
# First, find the SOC 2 framework ID
aws auditmanager list-assessment-frameworks \
  --framework-type Standard \
  --query "frameworkMetadataList[?name=='SOC 2'].id" \
  --output text

# Create the assessment
aws auditmanager create-assessment \
  --name "SOC2-Q1-2026" \
  --description "SOC 2 Type II assessment for Q1 2026" \
  --framework-id "FRAMEWORK_ID_HERE" \
  --assessment-reports-destination '{
    "destinationType": "S3",
    "destination": "s3://my-org-audit-reports-123456789012"
  }' \
  --scope '{
    "awsAccounts": [
      {"id": "123456789012"},
      {"id": "234567890123"}
    ],
    "awsServices": [
      {"serviceName": "s3"},
      {"serviceName": "ec2"},
      {"serviceName": "iam"},
      {"serviceName": "rds"},
      {"serviceName": "lambda"}
    ]
  }' \
  --roles '[
    {
      "roleType": "PROCESS_OWNER",
      "roleArn": "arn:aws:iam::123456789012:role/AuditManagerAdmin"
    }
  ]'
```

## Evidence Types

Audit Manager collects four types of evidence:

**Automated evidence** comes from three sources:
- **AWS Config** - Configuration snapshots and compliance checks
- **CloudTrail** - API activity logs
- **Security Hub** - Security findings and checks

**Manual evidence** is anything you upload yourself - screenshots, policy documents, meeting notes, etc.

The automated evidence collection runs continuously. Once an assessment is active, Audit Manager starts gathering data immediately. You'll typically see evidence start appearing within 24 hours.

## Creating a Custom Framework

The built-in frameworks are great starting points, but most organizations need custom frameworks that match their specific control requirements.

This example creates a custom framework with a control set for access management:

```bash
# First, create a custom control
aws auditmanager create-control \
  --name "MFA-Enforcement" \
  --description "All IAM users must have MFA enabled" \
  --control-mapping-sources '[
    {
      "sourceName": "IAM_MFA_Check",
      "sourceType": "AWS_Config",
      "sourceKeyword": {
        "keywordInputType": "SELECT_FROM_LIST",
        "keywordValue": "iam-user-mfa-enabled"
      }
    }
  ]'
```

Then create a control set and framework:

```bash
# Create the custom framework
aws auditmanager create-assessment-framework \
  --name "Internal Security Standard v2" \
  --control-sets '[
    {
      "name": "Access Management",
      "controls": [
        {"id": "CONTROL_ID_FROM_PREVIOUS_STEP"}
      ]
    }
  ]'
```

## Delegating Controls

In larger organizations, different teams own different controls. Audit Manager lets you delegate individual controls to specific people.

```bash
# Delegate a control set to another team member
aws auditmanager batch-create-delegation-by-assessment \
  --assessment-id "assessment-abc123" \
  --create-delegation-requests '[
    {
      "controlSetId": "access-management",
      "roleType": "RESOURCE_OWNER",
      "roleArn": "arn:aws:iam::123456789012:role/SecurityTeamLead",
      "comment": "Please review the access management controls for Q1"
    }
  ]'
```

The delegate gets notified and can review evidence, add manual evidence, and mark controls as reviewed - all within Audit Manager.

## Generating Assessment Reports

When audit time comes, you can generate a comprehensive report:

```bash
# Generate the assessment report
aws auditmanager create-assessment-report \
  --name "SOC2-Q1-2026-Final" \
  --assessment-id "assessment-abc123" \
  --description "Final SOC 2 report for Q1 2026"
```

The report lands in your S3 bucket as a PDF. It includes all the evidence collected, organized by control set and control, with timestamps and source information.

## Setting Up Notifications

You'll want to know when controls go out of compliance. Set up an EventBridge rule to catch Audit Manager events:

```json
{
  "source": ["aws.auditmanager"],
  "detail-type": ["AWS Audit Manager Assessment Change"],
  "detail": {
    "eventName": ["UpdateAssessmentControl"]
  }
}
```

Wire that to an SNS topic or Lambda function to alert your team.

## Tips for a Smooth Audit

After running Audit Manager through several audit cycles, here's what works well:

- **Start assessments early** - Give Audit Manager at least 30 days to collect evidence before the audit period begins
- **Review evidence weekly** - Don't let it pile up. Have someone review new evidence each week
- **Use tags consistently** - Audit Manager evidence is easier to organize when your resources are well-tagged
- **Keep manual evidence organized** - Name files clearly and add descriptions
- **Run multiple assessments** - Use separate assessments for different compliance standards rather than trying to combine them

## Integration with AWS Config

Audit Manager works best when AWS Config is properly configured. Make sure you're running the Config rules that map to your compliance controls. For the CIS benchmarks specifically, check out our post on [implementing CIS AWS Foundations Benchmark](https://oneuptime.com/blog/post/cis-aws-foundations-benchmark/view).

## Costs

Audit Manager charges per resource assessment per month. A resource assessment happens when evidence is collected for a specific resource against a specific control. The first 10,000 resource assessments per month are free, after which it's $1.25 per 1,000 assessments.

For most small to mid-size organizations, the free tier is plenty. Larger environments with hundreds of accounts and thousands of resources will see costs scale up, but it's still far cheaper than manual compliance work.

## Wrapping Up

AWS Audit Manager won't make compliance fun, but it takes away a lot of the manual drudgery. Automated evidence collection means you're not scrambling at audit time, and the continuous nature of the collection means you catch compliance drift early rather than discovering problems when the auditor shows up.

Start with a standard framework that matches your compliance needs, let evidence accumulate for a month, and then review what you've got. You'll likely find that 70-80% of the evidence you need is collected automatically, leaving you to focus on the manual controls that genuinely need human attention.
