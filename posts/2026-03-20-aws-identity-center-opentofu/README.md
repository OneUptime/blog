# How to Set Up AWS Identity Center with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM Identity Center, SSO, SAML, Active Directory, Infrastructure as Code

Description: Learn how to configure AWS IAM Identity Center using OpenTofu to provide centralized SSO access for your AWS organization, including user provisioning and external identity provider integration.

## Introduction

AWS IAM Identity Center (formerly AWS SSO) provides centralized access management for AWS accounts and applications. It integrates with identity sources such as Active Directory, Okta, and Google Workspace, enabling single sign-on across your entire AWS organization.

## Prerequisites

- OpenTofu v1.6+
- AWS Organizations management account
- IAM Identity Center enabled in the console (first-time setup requires console)

## Step 1: Get the Identity Center Instance

```hcl
data "aws_ssoadmin_instances" "main" {}

locals {
  instance_arn      = tolist(data.aws_ssoadmin_instances.main.arns)[0]
  identity_store_id = tolist(data.aws_ssoadmin_instances.main.identity_store_ids)[0]
}
```

## Step 2: Create Users and Groups

If you use the built-in Identity Center directory, you can manage users and groups directly with OpenTofu. If you use an external IdP or Active Directory as the identity source, provision users and groups there instead because IAM Identity Center does not sync these changes back to the source.

```hcl
# Create a user in Identity Center

resource "aws_identitystore_user" "developer" {
  identity_store_id = local.identity_store_id

  display_name = "Jane Developer"
  user_name    = "jane.developer"

  name {
    given_name  = "Jane"
    family_name = "Developer"
  }

  emails {
    value   = "jane.developer@example.com"
    type    = "work"
    primary = true
  }
}

# Create a group for developers
resource "aws_identitystore_group" "developers" {
  identity_store_id = local.identity_store_id
  display_name      = "Developers"
  description       = "Application development team"
}

# Add user to group
resource "aws_identitystore_group_membership" "jane_developers" {
  identity_store_id = local.identity_store_id
  group_id          = aws_identitystore_group.developers.group_id
  member_id         = aws_identitystore_user.developer.user_id
}
```

## Step 3: Create Permission Sets

```hcl
resource "aws_ssoadmin_permission_set" "developer" {
  name             = "Developer"
  description      = "Developer access with production safeguards"
  instance_arn     = local.instance_arn
  session_duration = "PT8H"
}

resource "aws_ssoadmin_managed_policy_attachment" "developer" {
  depends_on = [aws_ssoadmin_account_assignment.developers_dev]

  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}
```

## Step 4: Assign Group to Accounts

```hcl
# Get all member accounts from the organization
data "aws_organizations_organization" "main" {}

# Assign developers to the dev account
resource "aws_ssoadmin_account_assignment" "developers_dev" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn

  principal_id   = aws_identitystore_group.developers.group_id
  principal_type = "GROUP"

  target_id   = var.dev_account_id
  target_type = "AWS_ACCOUNT"
}
```

## Step 5: Optionally Configure a SAML External Identity Provider

If you use an external IdP instead of the built-in Identity Center directory, complete this step in the IAM Identity Center console and provision users and groups from the IdP into IAM Identity Center.

```hcl
# Configure external IdP (e.g., Okta, Microsoft Entra ID) via SAML
# Note: Changing the identity source and uploading SAML metadata
# is a manual console step at the time of writing

# Output to guide manual configuration
output "sso_setup_instructions" {
  value = <<-EOF
    To connect an external identity provider:
    1. Go to IAM Identity Center > Settings > Identity source
    2. Choose Actions > Change identity source > External identity provider
    3. Download the AWS SAML metadata file
    4. Upload it to your IdP (Okta/Microsoft Entra ID/Google Workspace)
    5. Upload your IdP SAML metadata file to AWS
    6. Configure SCIM or manually provision users and groups into IAM Identity Center

    Your Identity Center ARN: ${local.instance_arn}
    Your Identity Store ID: ${local.identity_store_id}
  EOF
}
```

## Step 6: Assign a Read-Only Permission Set to Multiple Accounts

```hcl
# Assign an existing read-only permission set to multiple AWS accounts
# Users in this group can access those accounts through the AWS access portal
resource "aws_ssoadmin_account_assignment" "all_users_readonly" {
  for_each = toset(var.read_only_account_ids)

  instance_arn       = local.instance_arn
  permission_set_arn = var.readonly_permission_set_arn

  principal_id   = aws_identitystore_group.developers.group_id
  principal_type = "GROUP"

  target_id   = each.value
  target_type = "AWS_ACCOUNT"
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply

# Users can now sign in through the AWS access portal URL shown in IAM Identity Center
```

## Conclusion

AWS IAM Identity Center centralizes access management for your entire AWS organization. When integrated with an external IdP like Okta or Microsoft Entra ID, user provisioning and deprovisioning can be automated via SCIM. Users get a single AWS access portal for all their AWS account access, and your security team gets centralized audit visibility into IAM Identity Center activity through CloudTrail. This is the recommended approach over managing individual IAM users in each account.
