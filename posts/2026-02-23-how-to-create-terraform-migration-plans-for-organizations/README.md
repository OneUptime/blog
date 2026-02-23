# How to Create Terraform Migration Plans for Organizations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Migration, Infrastructure as Code, DevOps, Planning

Description: Learn how to create comprehensive Terraform migration plans that help organizations transition from manual infrastructure management or other IaC tools to Terraform effectively and safely.

---

Migrating an organization to Terraform is a significant undertaking. Whether you are moving from manual infrastructure management, CloudFormation, Pulumi, or another tool, the migration requires careful planning to avoid disruption while maintaining the reliability teams depend on.

In this guide, we will walk through how to create a comprehensive migration plan that accounts for the technical, organizational, and operational aspects of transitioning to Terraform.

## Assessing the Current State

Before writing any migration plan, understand where you are starting from:

```yaml
# migration/assessment.yaml
# Infrastructure assessment for Terraform migration

current_state:
  total_resources: 4500
  management_methods:
    manual_console: 35%
    cloudformation: 40%
    scripts: 15%
    existing_terraform: 10%

  environments:
    production:
      resources: 1800
      criticality: "high"
      change_frequency: "weekly"
    staging:
      resources: 1200
      criticality: "medium"
      change_frequency: "daily"
    development:
      resources: 1500
      criticality: "low"
      change_frequency: "hourly"

  teams:
    - name: "platform"
      terraform_experience: "advanced"
      resources_managed: 800
    - name: "backend"
      terraform_experience: "beginner"
      resources_managed: 1200
    - name: "data"
      terraform_experience: "none"
      resources_managed: 900
    - name: "frontend"
      terraform_experience: "beginner"
      resources_managed: 600
    - name: "security"
      terraform_experience: "intermediate"
      resources_managed: 1000

  dependencies:
    - type: "cross-account"
      count: 15
    - type: "cross-region"
      count: 8
    - type: "cross-team"
      count: 42
```

## Defining Migration Phases

Break the migration into manageable phases:

```yaml
# migration/phases.yaml
# Phased migration plan

phases:
  phase_0:
    name: "Foundation"
    duration: "4 weeks"
    objectives:
      - Set up Terraform state backend
      - Configure CI/CD pipelines
      - Establish coding standards
      - Create base modules
      - Train platform team
    deliverables:
      - Remote state backend (S3 + DynamoDB)
      - CI/CD pipeline templates
      - Coding standards document
      - Base networking module
      - Base IAM module

  phase_1:
    name: "Quick Wins"
    duration: "6 weeks"
    objectives:
      - Migrate development environments
      - Import non-critical production resources
      - Onboard platform and security teams
    criteria:
      - Low-risk resources only
      - No production databases
      - No customer-facing services

  phase_2:
    name: "Core Infrastructure"
    duration: "8 weeks"
    objectives:
      - Migrate staging environments
      - Migrate production networking
      - Migrate production IAM
      - Onboard backend team
    criteria:
      - Careful sequencing of dependencies
      - Rollback plans for each migration batch

  phase_3:
    name: "Application Infrastructure"
    duration: "10 weeks"
    objectives:
      - Migrate production compute
      - Migrate production databases
      - Migrate production storage
      - Onboard remaining teams
    criteria:
      - Maintenance windows for critical migrations
      - Parallel running period

  phase_4:
    name: "Cleanup and Optimization"
    duration: "4 weeks"
    objectives:
      - Decommission old tooling
      - Optimize module library
      - Address technical debt
      - Final documentation
```

## Resource Import Strategy

For existing resources, you need a systematic import approach:

```bash
#!/bin/bash
# scripts/import-resources.sh
# Systematic resource import script

# Step 1: Generate resource inventory
echo "Generating resource inventory..."
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].[InstanceId,Tags[?Key==`Name`].Value|[0],State.Name]' \
  --output table

# Step 2: Write Terraform configuration for each resource
# This is typically done by hand or using tools like terraformer

# Step 3: Import resources into state
echo "Importing EC2 instances..."
terraform import aws_instance.web_server_1 i-0123456789abcdef0
terraform import aws_instance.web_server_2 i-0123456789abcdef1

# Step 4: Verify the import matches reality
echo "Running plan to check for drift..."
terraform plan

# Step 5: Fix any differences between config and actual state
# This is the most time-consuming part of migration
```

```hcl
# migration/import-helpers.tf
# Helper configuration for resource imports

# Use data sources to discover existing resources
data "aws_instances" "existing" {
  filter {
    name   = "tag:Team"
    values = [var.team_name]
  }

  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}

# Generate import commands
output "import_commands" {
  value = [
    for instance in data.aws_instances.existing.ids :
    "terraform import 'aws_instance.team_instances[\"${instance}\"]' ${instance}"
  ]
}
```

## Handling CloudFormation to Terraform Migration

If migrating from CloudFormation, use a structured approach:

```python
# scripts/cfn-to-terraform.py
# Convert CloudFormation templates to Terraform configurations

import json
import yaml

# Mapping of CloudFormation resource types to Terraform
CFN_TO_TF_MAP = {
    "AWS::EC2::Instance": "aws_instance",
    "AWS::EC2::VPC": "aws_vpc",
    "AWS::EC2::Subnet": "aws_subnet",
    "AWS::EC2::SecurityGroup": "aws_security_group",
    "AWS::S3::Bucket": "aws_s3_bucket",
    "AWS::RDS::DBInstance": "aws_db_instance",
    "AWS::IAM::Role": "aws_iam_role",
    "AWS::ECS::Service": "aws_ecs_service",
    "AWS::ElasticLoadBalancingV2::LoadBalancer": "aws_lb",
}

def convert_cfn_to_tf(cfn_template_path):
    """Convert a CloudFormation template to Terraform configuration."""
    with open(cfn_template_path) as f:
        if cfn_template_path.endswith('.json'):
            template = json.load(f)
        else:
            template = yaml.safe_load(f)

    resources = template.get("Resources", {})
    tf_resources = []

    for logical_id, resource in resources.items():
        cfn_type = resource["Type"]
        tf_type = CFN_TO_TF_MAP.get(cfn_type)

        if tf_type:
            tf_name = logical_id.lower().replace("-", "_")
            tf_resources.append({
                "tf_type": tf_type,
                "tf_name": tf_name,
                "cfn_logical_id": logical_id,
                "properties": resource.get("Properties", {})
            })
        else:
            print(f"WARNING: No mapping for {cfn_type}")

    return tf_resources
```

## Risk Management

Identify and mitigate risks throughout the migration:

```yaml
# migration/risk-register.yaml
# Risk register for Terraform migration

risks:
  - id: RISK-001
    title: "State file corruption during import"
    likelihood: "medium"
    impact: "high"
    mitigation:
      - "Always backup state before imports"
      - "Import one resource at a time"
      - "Verify with terraform plan after each import"
    contingency:
      - "Restore from state backup"
      - "Re-import affected resources"

  - id: RISK-002
    title: "Unplanned resource modifications during migration"
    likelihood: "high"
    impact: "high"
    mitigation:
      - "Use terraform plan extensively"
      - "Set lifecycle ignore_changes for initial import"
      - "Review every plan output carefully"
    contingency:
      - "Revert using previous state version"
      - "Manual rollback if needed"

  - id: RISK-003
    title: "Team resistance to new tooling"
    likelihood: "medium"
    impact: "medium"
    mitigation:
      - "Provide comprehensive training"
      - "Start with willing teams"
      - "Show quick wins early"
      - "Provide ongoing support"
    contingency:
      - "Assign dedicated migration support"
      - "Adjust timeline for struggling teams"

  - id: RISK-004
    title: "Production downtime during migration"
    likelihood: "low"
    impact: "critical"
    mitigation:
      - "Never modify production resources during import"
      - "Use lifecycle prevent_destroy"
      - "Schedule migrations during maintenance windows"
      - "Have rollback procedures ready"
    contingency:
      - "Immediate manual intervention"
      - "Restore from infrastructure backups"
```

## Tracking Migration Progress

Create a dashboard to track migration progress:

```python
# scripts/migration-tracker.py
# Track and report migration progress

migration_status = {
    "overall_progress": "42%",
    "resources_migrated": 1890,
    "resources_remaining": 2610,
    "phase": "Phase 2 - Core Infrastructure",

    "by_team": {
        "platform": {"migrated": 720, "total": 800, "progress": "90%"},
        "security": {"migrated": 500, "total": 1000, "progress": "50%"},
        "backend": {"migrated": 360, "total": 1200, "progress": "30%"},
        "data": {"migrated": 180, "total": 900, "progress": "20%"},
        "frontend": {"migrated": 130, "total": 600, "progress": "22%"}
    },

    "by_resource_type": {
        "networking": {"migrated": 95, "total": 100, "progress": "95%"},
        "iam": {"migrated": 80, "total": 120, "progress": "67%"},
        "compute": {"migrated": 600, "total": 1500, "progress": "40%"},
        "storage": {"migrated": 400, "total": 800, "progress": "50%"},
        "database": {"migrated": 50, "total": 200, "progress": "25%"}
    },

    "blockers": [
        "Cross-account IAM roles need manual verification",
        "Legacy VPN configuration has no API support"
    ]
}
```

## Communication Plan

Keep stakeholders informed throughout the migration:

```yaml
# migration/communication.yaml
# Communication plan for stakeholders

communications:
  weekly_update:
    audience: "Engineering teams"
    format: "Slack message in #infrastructure"
    content:
      - Migration progress percentage
      - Completed this week
      - Planned for next week
      - Known blockers

  biweekly_report:
    audience: "Engineering management"
    format: "Written report"
    content:
      - Phase progress
      - Risk status
      - Resource utilization
      - Timeline adherence

  monthly_executive:
    audience: "VP Engineering, CTO"
    format: "Slide deck"
    content:
      - High-level progress
      - Budget status
      - Key risks and mitigations
      - Business impact and benefits realized
```

## Best Practices

Never import and modify in the same step. Import the resource first, verify the plan shows no changes, and only then start managing the resource with Terraform.

Use lifecycle blocks strategically during migration. The prevent_destroy and ignore_changes settings help protect existing resources while you get the Terraform configuration aligned with reality.

Migrate in order of dependency. Start with foundational resources like VPCs and IAM roles before migrating resources that depend on them.

Keep the old tooling running in parallel. Do not decommission CloudFormation stacks or manual processes until the Terraform migration is verified and stable.

Plan for the long tail. The first 80% of resources will migrate quickly. The last 20% will take longer because they involve the most complex, interconnected, or unusual resources.

## Conclusion

A successful Terraform migration requires thorough assessment, careful planning, phased execution, and constant communication. By breaking the migration into manageable phases, managing risks proactively, and tracking progress transparently, you can transition your organization to Terraform without disrupting the infrastructure your business depends on. The investment in proper planning pays off in a smoother migration and a stronger foundation for infrastructure management going forward.
