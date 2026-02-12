# How to Create an IAM User in AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security

Description: Learn how to create IAM users in AWS through the console and CLI, set up access credentials, configure MFA, and follow security best practices.

---

Every person or application that interacts with AWS needs an identity. For human users, that typically means an IAM user (though AWS increasingly recommends Identity Center for this). For programmatic access from external systems, IAM users with access keys are still common. Let's walk through creating IAM users the right way, with proper security from the start.

## What Is an IAM User?

An IAM user is an identity within your AWS account that represents a person or application. Each user has a unique name, can have a password for console access, can have access keys for API/CLI access, and gets permissions through policies attached directly or through groups.

Here's how IAM users fit into the broader picture:

```mermaid
graph TD
    A[AWS Account Root User] --> B[IAM Users]
    A --> C[IAM Roles]
    A --> D[IAM Groups]
    B --> D
    D --> E[IAM Policies]
    B --> E
    C --> E
```

The root user is the account owner - you should almost never use it for day-to-day work. IAM users are what people actually log in with.

## Creating a User via the Console

Head to the IAM console and click "Users" in the left sidebar, then "Create user."

**Step 1: User details**
Enter a username. A good convention is `firstname.lastname` or the person's email. Check "Provide user access to the AWS Management Console" if they need to log in to the web console.

**Step 2: Permissions**
You've got three options: add the user to a group (recommended), copy permissions from an existing user, or attach policies directly. Groups are the way to go - we'll cover that more in a bit.

**Step 3: Review and create**
Review the settings and create the user. If you enabled console access, you'll get a temporary password. Share it securely - never send passwords via email or Slack.

## Creating a User via the CLI

The CLI is faster and more repeatable. Here's how to create a user and set up their credentials:

```bash
# Create a new IAM user
aws iam create-user --user-name jane.smith
```

To enable console access with a temporary password:

```bash
# Set a login password for console access (user must change on first login)
aws iam create-login-profile \
  --user-name jane.smith \
  --password 'TemporaryP@ssw0rd!' \
  --password-reset-required
```

The `--password-reset-required` flag forces the user to change their password on first login. Always use this.

For programmatic access (CLI, SDK, API calls):

```bash
# Create access keys for programmatic access
aws iam create-access-key --user-name jane.smith
```

This outputs an Access Key ID and Secret Access Key. The secret key is shown only once - save it immediately and share it securely with the user.

## Setting Up MFA

MFA should be mandatory for every human user. Without it, a leaked password means full account compromise. Here's how to enable a virtual MFA device:

```bash
# Create a virtual MFA device
aws iam create-virtual-mfa-device \
  --virtual-mfa-device-name jane.smith-mfa \
  --outfile /tmp/QRCode.png \
  --bootstrap-method QRCodePNG
```

This generates a QR code image. The user scans it with their authenticator app (Google Authenticator, Authy, etc.) and provides two consecutive codes:

```bash
# Enable MFA for the user with two consecutive codes from their authenticator app
aws iam enable-mfa-device \
  --user-name jane.smith \
  --serial-number arn:aws:iam::123456789012:mfa/jane.smith-mfa \
  --authentication-code1 123456 \
  --authentication-code2 789012
```

## Password Policy

Before creating users, set up a strong password policy for the account:

```bash
# Configure the account password policy
aws iam update-account-password-policy \
  --minimum-password-length 14 \
  --require-symbols \
  --require-numbers \
  --require-uppercase-characters \
  --require-lowercase-characters \
  --max-password-age 90 \
  --password-reuse-prevention 12 \
  --allow-users-to-change-password
```

This requires 14-character passwords with mixed character types, forces rotation every 90 days, and prevents reusing the last 12 passwords.

## Attaching Policies

You can attach policies directly to users, but it's better to use groups. Still, here's how direct attachment works:

```bash
# Attach the ReadOnlyAccess policy directly to a user
aws iam attach-user-policy \
  --user-name jane.smith \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
```

For listing a user's current policies:

```bash
# List all policies attached to a user
aws iam list-attached-user-policies --user-name jane.smith

# List inline policies on a user
aws iam list-user-policies --user-name jane.smith
```

## Creating Users with CloudFormation

For infrastructure as code, define users in CloudFormation:

```yaml
# CloudFormation template for creating an IAM user
AWSTemplateFormatVersion: '2010-09-09'
Description: IAM User Creation

Resources:
  DeveloperUser:
    Type: AWS::IAM::User
    Properties:
      UserName: jane.smith
      Path: /developers/
      Groups:
        - !Ref DeveloperGroup
      Tags:
        - Key: Department
          Value: Engineering
        - Key: Team
          Value: Backend
      LoginProfile:
        Password: !Ref InitialPassword
        PasswordResetRequired: true

Parameters:
  InitialPassword:
    Type: String
    NoEcho: true
    Description: Initial password for the user
```

The `Path` property is optional but useful for organizing users. You can write policies that target all users under a specific path.

## Creating Users with Terraform

Terraform is another popular option for managing IAM users:

```hcl
# Create an IAM user with Terraform
resource "aws_iam_user" "developer" {
  name = "jane.smith"
  path = "/developers/"

  tags = {
    Department = "Engineering"
    Team       = "Backend"
  }
}

# Create a login profile for console access
resource "aws_iam_user_login_profile" "developer_login" {
  user                    = aws_iam_user.developer.name
  password_reset_required = true
}

# Add the user to a group
resource "aws_iam_user_group_membership" "developer_groups" {
  user = aws_iam_user.developer.name
  groups = [
    aws_iam_group.developers.name,
  ]
}
```

## Best Practices for IAM Users

**Use groups, not direct policy attachment.** When someone changes roles, you move them between groups instead of editing individual policies. It's cleaner and easier to audit. Check out our guide on [creating IAM groups and adding users](https://oneuptime.com/blog/post/create-iam-groups-and-add-users/view) for details.

**Require MFA for all human users.** You can enforce this with an IAM policy that denies everything except MFA setup until MFA is enabled.

**Rotate access keys regularly.** Set up a process to rotate programmatic access keys every 90 days. IAM Access Analyzer can flag stale credentials.

**Don't share credentials.** Each person gets their own user. Each application gets its own user or role. Shared credentials make it impossible to audit who did what.

**Prefer roles over long-term credentials.** For EC2 instances, Lambda functions, and other AWS services, use IAM roles instead of IAM users. Roles provide temporary credentials that rotate automatically.

**Monitor user activity.** Enable CloudTrail to log all API calls. Review the logs periodically to check for unusual activity or unnecessary permissions.

## Listing and Managing Existing Users

Some useful commands for day-to-day IAM user management:

```bash
# List all IAM users in the account
aws iam list-users

# Get detailed info about a specific user
aws iam get-user --user-name jane.smith

# List a user's access keys
aws iam list-access-keys --user-name jane.smith

# Deactivate an access key without deleting it
aws iam update-access-key \
  --user-name jane.smith \
  --access-key-id AKIAIOSFODNN7EXAMPLE \
  --status Inactive

# Delete a user (must remove all attached resources first)
aws iam delete-user --user-name jane.smith
```

Before deleting a user, you need to remove their login profile, access keys, MFA devices, group memberships, and attached policies. Otherwise the delete command will fail.

## Wrapping Up

Creating IAM users is straightforward, but doing it securely requires attention to detail. Always enforce MFA, use strong password policies, prefer groups over direct policy attachment, and monitor activity with CloudTrail. For applications running on AWS services, consider using IAM roles instead of users - they're more secure because they use temporary credentials that rotate automatically.
