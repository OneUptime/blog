# How to Enable and Enforce MFA for IAM Users

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, MFA

Description: A complete guide to enabling and enforcing multi-factor authentication for AWS IAM users using policies, CLI commands, and best practices.

---

Multi-factor authentication is one of the single most effective security controls you can implement in AWS. It's free, it's straightforward to set up, and it blocks the vast majority of credential-based attacks. Yet I still see AWS accounts where MFA isn't enforced. Let's fix that.

This guide covers both enabling MFA for individual users and creating IAM policies that force every user to set up MFA before they can do anything else.

## Why MFA Matters

Passwords get leaked. They get phished. They get reused across services. When an attacker gets hold of an IAM user's password, MFA is the last line of defense. Without it, they have full access to whatever that user can do - which might include deleting production databases or spinning up crypto mining instances on your bill.

AWS supports three types of MFA:

- **Virtual MFA devices** (authenticator apps like Google Authenticator or Authy)
- **Hardware MFA devices** (physical key fobs or YubiKeys)
- **FIDO2 security keys** (WebAuthn-compatible keys)

For most teams, virtual MFA is the quickest to deploy. For the root account, hardware MFA is strongly recommended. Check our guide on [setting up virtual MFA for the root account](https://oneuptime.com/blog/post/set-up-virtual-mfa-aws-root-account/view) for that specific case.

## Enabling MFA for a Single User via Console

The quickest way to enable MFA for one user:

1. Sign in to the AWS Console
2. Go to IAM > Users > Select the user
3. Click the "Security credentials" tab
4. Under "Multi-factor authentication (MFA)", click "Assign MFA device"
5. Choose "Authenticator app"
6. Scan the QR code with your authenticator app
7. Enter two consecutive codes to verify

That's it for one user. But what if you have 50 users? And what about making sure new users set up MFA too?

## Enabling MFA via CLI

For scripting and automation, you can enable MFA through the AWS CLI.

```bash
# Create a virtual MFA device for a user
aws iam create-virtual-mfa-device \
  --virtual-mfa-device-name user-jane-mfa \
  --outfile /tmp/QRCode.png \
  --bootstrap-method QRCodePNG
```

The QR code gets saved as an image. The user scans it with their authenticator app, then you link it:

```bash
# Associate the virtual MFA device with the IAM user
# You need two consecutive TOTP codes from the authenticator app
aws iam enable-mfa-device \
  --user-name jane \
  --serial-number arn:aws:iam::123456789012:mfa/user-jane-mfa \
  --authentication-code1 123456 \
  --authentication-code2 789012
```

## The Real Power: Enforcing MFA with IAM Policies

Enabling MFA is optional by default. Users can log in without it, and there's nothing stopping them from ignoring the setup. To actually enforce MFA, you need an IAM policy that denies everything unless MFA is present.

Here's the policy that does it. This is sometimes called the "MFA self-management" policy:

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
        "iam:DeleteVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:ListMFADevices",
        "iam:ResyncMFADevice"
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
        "iam:ChangePassword",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
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

Let me break down what this policy does:

- **AllowViewAccountInfo**: Users can see account-level info even without MFA.
- **AllowManageOwnMFA**: Users can set up their own MFA device.
- **AllowManageOwnPassword**: Users can change their password.
- **DenyAllExceptMFASetupWithoutMFA**: This is the critical statement. It denies everything except MFA-related actions when MFA isn't present.

## Attaching the Policy

Save the above policy and attach it to a group that all users belong to.

```bash
# Create the enforce-MFA policy
aws iam create-policy \
  --policy-name EnforceMFA \
  --policy-document file://enforce-mfa-policy.json

# Create a group for all users
aws iam create-group --group-name AllUsers

# Attach the MFA enforcement policy to the group
aws iam attach-group-policy \
  --group-name AllUsers \
  --policy-arn arn:aws:iam::123456789012:policy/EnforceMFA

# Add users to the group
aws iam add-user-to-group --group-name AllUsers --user-name jane
aws iam add-user-to-group --group-name AllUsers --user-name bob
```

## What Users Experience

When a user logs into the console without MFA configured:

1. They can see the dashboard but can't actually do anything useful
2. They get "Access Denied" on nearly every action
3. They can navigate to their security credentials and set up MFA
4. After setting up MFA and signing in again, everything works normally

It's a bit of a rough first experience, so I'd recommend sending users instructions before applying the policy. Something like: "You have 24 hours to set up MFA. Here's how."

## Checking MFA Status for All Users

Here's a script to check which users have MFA enabled and which don't:

```bash
# List all IAM users and their MFA status
aws iam generate-credential-report
sleep 5
aws iam get-credential-report \
  --query 'Content' \
  --output text | base64 --decode | \
  cut -d',' -f1,4,8 | column -t -s','
```

For a more detailed view, here's a Python script:

```python
import boto3

# Check MFA enrollment status for all IAM users
iam = boto3.client("iam")
users = iam.list_users()["Users"]

print(f"{'Username':<25} {'MFA Enabled':<15} {'Last Login'}")
print("-" * 65)

for user in users:
    username = user["UserName"]
    mfa_devices = iam.list_mfa_devices(UserName=username)["MFADevices"]
    has_mfa = "Yes" if mfa_devices else "NO - ACTION NEEDED"

    login_profile = None
    try:
        iam.get_login_profile(UserName=username)
        has_console = True
    except iam.exceptions.NoSuchEntityException:
        has_console = False

    last_login = user.get("PasswordLastUsed", "Never")

    # Only flag users with console access but no MFA
    if has_console:
        print(f"{username:<25} {has_mfa:<15} {last_login}")
```

## Handling Programmatic Access

One important nuance: the MFA enforcement policy works well for console access, but it affects CLI/SDK users too. If someone uses access keys without MFA, they'll be denied.

For programmatic access with MFA, users need to call `sts:GetSessionToken` first:

```bash
# Get temporary credentials with MFA for CLI usage
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789012:mfa/jane \
  --token-code 123456 \
  --duration-seconds 3600
```

This returns temporary access keys that include the MFA context. You can set up a shell alias to make this easier:

```bash
# Shell function to get MFA-authenticated session
mfa-login() {
  local MFA_ARN="arn:aws:iam::123456789012:mfa/$1"
  local TOKEN="$2"

  CREDS=$(aws sts get-session-token \
    --serial-number "$MFA_ARN" \
    --token-code "$TOKEN" \
    --output json)

  export AWS_ACCESS_KEY_ID=$(echo $CREDS | jq -r '.Credentials.AccessKeyId')
  export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | jq -r '.Credentials.SecretAccessKey')
  export AWS_SESSION_TOKEN=$(echo $CREDS | jq -r '.Credentials.SessionToken')

  echo "MFA session active. Expires in 1 hour."
}

# Usage: mfa-login jane 123456
```

## For Service Accounts

Don't apply MFA enforcement to service accounts or roles used by applications. Those should use IAM roles (ideally with instance profiles or IRSA for EKS) rather than long-lived access keys. If you must use access keys for a service, exclude those specific users from the MFA enforcement group.

## Monitoring MFA Compliance

Set up a CloudWatch Events rule to detect when users log in without MFA, or create a Config rule to check compliance:

```bash
# Create an AWS Config rule to check MFA compliance
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "iam-user-mfa-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "IAM_USER_MFA_ENABLED"
    },
    "Scope": {
      "ComplianceResourceTypes": ["AWS::IAM::User"]
    }
  }'
```

You can also integrate this with your monitoring stack. If you're using OneUptime, set up alerts that trigger when the Config rule finds non-compliant users, so your security team can follow up quickly.

## Key Takeaways

- Enable MFA for every IAM user with console access
- Use an IAM policy to enforce MFA - don't rely on users doing it voluntarily
- The root account should always have hardware MFA
- Handle programmatic access carefully with `sts:GetSessionToken`
- Monitor compliance continuously with AWS Config or credential reports
- Consider moving to [IAM Identity Center (SSO)](https://oneuptime.com/blog/post/set-up-aws-iam-identity-center-sso/view) for centralized MFA management

MFA enforcement isn't optional anymore. It's a baseline security control that every AWS account should have in place.
