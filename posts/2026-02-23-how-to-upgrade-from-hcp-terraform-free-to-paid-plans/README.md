# How to Upgrade from HCP Terraform Free to Paid Plans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Pricing, Upgrade, Infrastructure as Code

Description: A practical guide to upgrading from HCP Terraform free tier to paid plans, including what changes, migration steps, and cost planning.

---

At some point, every growing team hits the limits of the HCP Terraform free tier. Maybe you need more concurrent runs, or Sentinel policies, or your team has grown beyond five users. Whatever the trigger, upgrading should be a smooth process if you plan ahead. This guide covers when to upgrade, which plan fits your needs, and how to make the transition without disrupting your workflows.

## Understanding the Plan Tiers

HCP Terraform currently offers three tiers: Free, Standard, and Plus. Each step up adds significant capabilities.

The Free tier includes 500 managed resources, one concurrent run, five users, and basic features like remote state and VCS integration. The Standard tier bumps you up to team management, role-based access control, Sentinel policy enforcement, and multiple concurrent runs. The Plus tier adds everything in Standard plus audit logging, SSO/SAML, custom agents, and self-service infrastructure through no-code provisioning.

## Signs You Need to Upgrade

Before pulling the trigger, make sure you actually need the upgrade. Here are the clearest indicators:

```bash
# Check your current resource count via the API
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-org" | \
  jq '.data.attributes | {
    "managed-resource-count": .["managed-resource-count"],
    "plan": .["plan"],
    "user-count": .["user-count"]
  }'
```

If your resource count is approaching 500, you are queuing runs regularly because of the single concurrent run limit, or you have team members waiting for access, it is time.

Other triggers include:

- Needing to enforce policies before infrastructure changes apply
- Requiring different permission levels (some people should only plan, not apply)
- Compliance requirements demanding audit logs
- More than five people needing access to workspaces

## Planning the Upgrade Cost

HCP Terraform Standard pricing is based on the number of managed resources. Before upgrading, audit your workspaces to understand your actual resource footprint.

```bash
# List all workspaces and their resource counts
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces?page%5Bsize%5D=100" | \
  jq -r '.data[] | "\(.attributes.name)\t\(.attributes["resource-count"])"' | \
  sort -t$'\t' -k2 -nr
```

This gives you a sorted list of workspaces by resource count. You might be surprised - some workspaces may have resources that could be cleaned up or moved out of Terraform management.

## Cleaning Up Before Upgrading

Before you upgrade and start paying per resource, do some housekeeping:

```hcl
# Remove resources from state that do not need management
# For example, a bootstrap IAM role you created once and never change

# First, check what is in your state
# terraform state list

# Remove resources that do not need ongoing management
# terraform state rm aws_iam_role.bootstrap
```

Review each workspace and ask: does this resource genuinely need Terraform management? One-time setup resources, manually managed resources, and resources managed by other tools should be removed from state.

```hcl
# Consider using data sources instead of managing shared resources
# This does not count toward your resource limit
data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}
```

## Performing the Upgrade

The actual upgrade process is straightforward. Log into HCP Terraform, navigate to your organization settings, and select the billing section.

Steps:

1. Go to **Organization Settings** in the HCP Terraform UI
2. Click **Plan & Billing**
3. Select the plan that fits your needs
4. Enter payment information
5. Confirm the upgrade

The upgrade takes effect immediately. There is no downtime, and your existing workspaces, state files, and configurations remain untouched.

```bash
# Verify the upgrade via API
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-org" | \
  jq '.data.attributes.plan'
```

## Post-Upgrade Configuration

After upgrading, you unlock new features that need configuration.

### Setting Up Teams and Permissions

With the Standard plan, you can create teams with different access levels:

```bash
# Create a team via the API
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "teams",
      "attributes": {
        "name": "developers",
        "organization-access": {
          "manage-workspaces": false,
          "manage-policies": false,
          "manage-vcs-settings": false
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/teams"
```

### Configuring Sentinel Policies

Sentinel policies let you enforce governance rules. Start with simple policies and build up:

```python
# policy.sentinel - Require tags on all AWS instances
import "tfplan/v2" as tfplan

# Find all AWS instances in the plan
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check that all instances have required tags
required_tags = ["Name", "Environment", "Owner"]

violations = filter ec2_instances as _, instance {
    any required_tags as tag {
        instance.change.after.tags not contains tag
    }
}

# Main rule - fail if any violations found
main = rule {
    length(violations) is 0
}
```

### Increasing Concurrent Runs

With paid plans, you can run multiple plans and applies simultaneously. This alone is often worth the upgrade cost for teams where the single-run bottleneck was causing delays.

No configuration is needed for this - it is automatically available once you upgrade.

## Migrating Team Members

Invite new team members and assign them to appropriate teams:

```bash
# Invite a user to the organization
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "organization-memberships",
      "attributes": {
        "email": "newdev@company.com"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/organization-memberships"
```

## Monitoring Costs After Upgrade

Keep an eye on your resource count as it directly affects billing. Set up a simple monitoring script:

```bash
#!/bin/bash
# monitor-resources.sh
# Track HCP Terraform resource count over time

ORG="my-org"
DATE=$(date +%Y-%m-%d)

RESOURCE_COUNT=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/$ORG" | \
  jq '.data.attributes["managed-resource-count"]')

# Log the count
echo "$DATE,$RESOURCE_COUNT" >> /var/log/terraform-resources.csv

# Alert if approaching a threshold
if [ "$RESOURCE_COUNT" -gt 900 ]; then
  echo "WARNING: Resource count is $RESOURCE_COUNT" | \
    mail -s "HCP Terraform Resource Alert" ops@company.com
fi
```

## Downgrading if Needed

If you decide the paid plan is not worth it, you can downgrade back to the free tier. Be aware that you will lose access to paid features immediately, and if your resource count exceeds 500, new runs will be blocked until you reduce it.

Plan your downgrade by first removing excess resources from state, reducing your team to five members, and removing Sentinel policies that will no longer be enforced.

## Making the Decision

Upgrading from the free tier is a business decision, not just a technical one. Calculate the cost based on your resource count, compare it against the engineering time saved (fewer queue waits, better permissions, policy enforcement), and factor in the risk reduction from governance features.

For most growing teams, the Standard plan pays for itself quickly through improved velocity and reduced risk. Start there, and move to Plus only when you need SSO, audit logging, or custom agents.
