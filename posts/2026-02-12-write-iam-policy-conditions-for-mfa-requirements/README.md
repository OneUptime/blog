# How to Write IAM Policy Conditions for MFA Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, MFA

Description: Learn how to enforce multi-factor authentication in IAM policies using condition keys, including practical patterns for console access, CLI usage, and sensitive operations.

---

Passwords get stolen. Access keys get leaked. MFA is the single most effective control you can add to your AWS account. But enabling MFA on a user account is only half the story - you also need policies that actually require MFA for sensitive operations. Without MFA conditions in your policies, a compromised password still gives an attacker full access to whatever the user can do.

Let's look at how to write IAM policies that enforce MFA, from basic requirements to advanced patterns.

## The MFA Condition Keys

AWS provides two condition keys for MFA:

- **`aws:MultiFactorAuthPresent`** - Boolean. True if the request was authenticated with MFA. Only present for temporary credentials (console sessions, assumed roles).
- **`aws:MultiFactorAuthAge`** - Numeric. The number of seconds since the MFA authentication. Useful for requiring recent MFA for sensitive operations.

There's an important caveat: `aws:MultiFactorAuthPresent` is NOT present in requests made with long-term access keys (the ones you get from `aws iam create-access-key`). This means you can't use it to require MFA for direct CLI calls with access keys. You need a different approach for that, which we'll cover.

## Denying Actions Without MFA

The most common pattern is a deny statement that blocks sensitive actions unless MFA is present:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowAllActions",
            "Effect": "Allow",
            "Action": "*",
            "Resource": "*"
        },
        {
            "Sid": "DenySensitiveWithoutMFA",
            "Effect": "Deny",
            "Action": [
                "ec2:TerminateInstances",
                "rds:DeleteDBInstance",
                "s3:DeleteBucket",
                "iam:DeleteUser",
                "iam:CreateUser",
                "iam:AttachUserPolicy",
                "iam:DetachUserPolicy"
            ],
            "Resource": "*",
            "Condition": {
                "BoolIfExists": {
                    "aws:MultiFactorAuthPresent": "false"
                }
            }
        }
    ]
}
```

Notice `BoolIfExists` instead of just `Bool`. This is deliberate. `BoolIfExists` evaluates to true both when the key is present and false, AND when the key isn't present at all (which happens with long-term access keys). This means sensitive actions are denied both when MFA wasn't used and when the request type doesn't even support MFA.

## The "Force MFA" Policy

A popular pattern forces users to set up MFA before they can do anything else. Here's the complete policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowViewAccountInfo",
            "Effect": "Allow",
            "Action": [
                "iam:GetAccountPasswordPolicy",
                "iam:ListVirtualMFADevices"
            ],
            "Resource": "*"
        },
        {
            "Sid": "AllowManageOwnMFA",
            "Effect": "Allow",
            "Action": [
                "iam:CreateVirtualMFADevice",
                "iam:EnableMFADevice",
                "iam:ResyncMFADevice",
                "iam:ListMFADevices"
            ],
            "Resource": [
                "arn:aws:iam::*:mfa/${aws:username}",
                "arn:aws:iam::*:user/${aws:username}"
            ]
        },
        {
            "Sid": "AllowManageOwnPassword",
            "Effect": "Allow",
            "Action": [
                "iam:ChangePassword",
                "iam:GetUser"
            ],
            "Resource": "arn:aws:iam::*:user/${aws:username}"
        },
        {
            "Sid": "DenyAllExceptMFASetupWithoutMFA",
            "Effect": "Deny",
            "NotAction": [
                "iam:CreateVirtualMFADevice",
                "iam:EnableMFADevice",
                "iam:GetUser",
                "iam:ListMFADevices",
                "iam:ListVirtualMFADevices",
                "iam:ResyncMFADevice",
                "iam:ChangePassword",
                "iam:GetAccountPasswordPolicy",
                "sts:GetSessionToken"
            ],
            "Resource": "*",
            "Condition": {
                "BoolIfExists": {
                    "aws:MultiFactorAuthPresent": "false"
                }
            }
        }
    ]
}
```

Here's what happens with this policy. When a user logs in without MFA, they can only manage their own MFA device and password. Everything else is denied. Once they set up MFA and authenticate with it, the deny condition no longer matches and their other permissions take effect.

The `NotAction` in the deny statement is the trick. It means "deny everything EXCEPT these actions" when MFA isn't present.

## Requiring MFA for CLI Access

As mentioned, `aws:MultiFactorAuthPresent` isn't set for long-term access key requests. The workaround is to require users to call `sts:GetSessionToken` with MFA first, then use the temporary credentials:

```bash
# Get temporary credentials using MFA
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789012:mfa/jane.smith \
  --token-code 123456 \
  --duration-seconds 3600
```

This returns temporary credentials that have `aws:MultiFactorAuthPresent` set to true. The user then uses those temporary credentials for subsequent CLI commands.

To make this smoother, you can create a helper script:

```bash
#!/bin/bash
# mfa-login.sh - Get MFA-authenticated temporary credentials

MFA_SERIAL="arn:aws:iam::123456789012:mfa/${USER}"

echo -n "Enter MFA code: "
read MFA_CODE

# Request temporary credentials with MFA
CREDS=$(aws sts get-session-token \
  --serial-number "$MFA_SERIAL" \
  --token-code "$MFA_CODE" \
  --duration-seconds 43200 \
  --output json)

# Export the temporary credentials
export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r '.Credentials.SessionToken')

echo "MFA session active for 12 hours"
```

## Time-Based MFA Requirements

For extra-sensitive operations, you might want to require that MFA was used recently, not just at some point during the session:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyDeleteWithoutRecentMFA",
            "Effect": "Deny",
            "Action": [
                "s3:DeleteBucket",
                "rds:DeleteDBInstance",
                "ec2:TerminateInstances"
            ],
            "Resource": "*",
            "Condition": {
                "NumericGreaterThan": {
                    "aws:MultiFactorAuthAge": "300"
                }
            }
        }
    ]
}
```

This denies destructive actions if MFA was used more than 300 seconds (5 minutes) ago. The user needs to re-authenticate with MFA to perform these actions, even within an active session.

## MFA for Assuming Roles

You can require MFA when assuming a role by adding a condition to the role's trust policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowAssumeWithMFA",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::123456789012:root"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "Bool": {
                    "aws:MultiFactorAuthPresent": "true"
                }
            }
        }
    ]
}
```

When a user tries to assume this role, they must provide an MFA token:

```bash
# Assume a role that requires MFA
aws sts assume-role \
  --role-arn arn:aws:iam::987654321098:role/AdminRole \
  --role-session-name jane-admin-session \
  --serial-number arn:aws:iam::123456789012:mfa/jane.smith \
  --token-code 654321
```

This is the recommended pattern for cross-account access to sensitive accounts. For more details, see our guide on [creating IAM roles for cross-account access](https://oneuptime.com/blog/post/2026-02-12-create-iam-roles-for-cross-account-access/view).

## Combining MFA with Other Conditions

You can combine MFA requirements with IP restrictions for defense in depth:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyWithoutMFAAndCorrectIP",
            "Effect": "Deny",
            "Action": "*",
            "Resource": "*",
            "Condition": {
                "BoolIfExists": {
                    "aws:MultiFactorAuthPresent": "false"
                },
                "NotIpAddress": {
                    "aws:SourceIp": "203.0.113.0/24"
                }
            }
        }
    ]
}
```

Since conditions within a statement are ANDed, this denies access only when BOTH conditions are true - no MFA AND outside the corporate network. From the office without MFA? Allowed. From home with MFA? Allowed. From home without MFA? Denied.

## Testing MFA Conditions

Use the Policy Simulator with the MFA context key:

```bash
# Test with MFA present
aws iam simulate-custom-policy \
  --policy-input-list file://mfa-policy.json \
  --action-names ec2:TerminateInstances \
  --resource-arns arn:aws:ec2:us-east-1:123456789012:instance/i-abc123 \
  --context-entries \
    "ContextKeyName=aws:MultiFactorAuthPresent,ContextKeyType=boolean,ContextKeyValues=true"

# Test without MFA
aws iam simulate-custom-policy \
  --policy-input-list file://mfa-policy.json \
  --action-names ec2:TerminateInstances \
  --resource-arns arn:aws:ec2:us-east-1:123456789012:instance/i-abc123 \
  --context-entries \
    "ContextKeyName=aws:MultiFactorAuthPresent,ContextKeyType=boolean,ContextKeyValues=false"
```

## Wrapping Up

MFA conditions transform your IAM policies from "something you know" security to "something you know plus something you have." The key patterns are: use `BoolIfExists` for the deny condition (not just `Bool`), allow MFA setup actions without MFA, and require MFA for role assumption to sensitive accounts. Test thoroughly because getting the condition operators wrong can either lock everyone out or leave the door wide open.
