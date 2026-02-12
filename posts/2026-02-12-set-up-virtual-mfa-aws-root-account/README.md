# How to Set Up Virtual MFA for the AWS Root Account

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, MFA

Description: Step-by-step guide to securing your AWS root account with virtual MFA using an authenticator app, including recovery tips and best practices.

---

The root account is the keys to your entire AWS kingdom. If someone gets access to it, they can do literally anything - delete every resource, change billing, close the account. Securing it with MFA should be the very first thing you do after creating an AWS account. No exceptions.

This guide walks you through setting up virtual MFA on the root account using an authenticator app. We'll also cover what to do if you lose your MFA device and how to store backup codes safely.

## Why Virtual MFA?

AWS supports virtual MFA, hardware MFA tokens, and FIDO2 security keys for the root account. Virtual MFA using an authenticator app is the most accessible option - you probably already have an app on your phone. It's not as secure as a dedicated hardware token (see our guide on [using hardware MFA devices with AWS](https://oneuptime.com/blog/post/use-hardware-mfa-devices-aws/view)), but it's infinitely better than no MFA at all.

Popular authenticator apps that work with AWS:

- Google Authenticator
- Authy (supports cloud backup)
- Microsoft Authenticator
- 1Password (built-in TOTP support)

I personally recommend Authy or 1Password because they support backup and recovery. With Google Authenticator, if you lose your phone, you lose your codes.

## Step-by-Step Setup

### Step 1: Sign In as Root

Go to the AWS Management Console and sign in with your root account email and password. Don't use an IAM user - this has to be the root account.

### Step 2: Navigate to Security Credentials

Click on your account name in the top-right corner, then select "Security credentials." This takes you to the root account security settings.

### Step 3: Find the MFA Section

Scroll down to the "Multi-factor authentication (MFA)" section. Click "Assign MFA device."

### Step 4: Choose Device Type

Select "Authenticator app" and click Next. AWS will show you a QR code and a secret key.

### Step 5: Scan the QR Code

Open your authenticator app and scan the QR code. The app will start generating 6-digit codes that change every 30 seconds.

**Important**: Before moving on, save the secret key somewhere secure. If you ever need to re-register the MFA device on a new phone, you'll need this key. Store it in a password manager or a physical safe.

### Step 6: Enter Two Consecutive Codes

AWS requires two consecutive MFA codes to verify the setup. Wait for the first code, enter it, then wait for the code to rotate and enter the second one. This proves your device is synced correctly.

### Step 7: Confirm

Click "Assign MFA" and you're done. The next time you sign in as root, you'll be prompted for an MFA code.

## Verifying MFA Is Active

You can verify MFA is enabled through the CLI (using an IAM user with appropriate permissions):

```bash
# Check if the root account has MFA enabled
aws iam get-account-summary \
  --query 'SummaryMap.AccountMFAEnabled'
```

This returns `1` if MFA is enabled on the root account, or `0` if it's not.

You can also check via the credential report:

```bash
# Generate and download the credential report
aws iam generate-credential-report
sleep 10

# Check root account MFA status from the credential report
aws iam get-credential-report \
  --query 'Content' \
  --output text | base64 --decode | head -2
```

The first data row is always the root account. Look for the `mfa_active` column - it should say `true`.

## What to Do If You Lose Your MFA Device

This is the scenario that keeps people up at night. You dropped your phone in a lake, and now you can't log into your root account. Here's how to recover:

### Option 1: Use Backup Codes (If You Saved Them)

If you saved the secret key during setup, you can register it on a new authenticator app.

### Option 2: Use Authy Cloud Backup

If you used Authy, install it on a new device and restore from the cloud backup using your Authy password.

### Option 3: Contact AWS Support

If you have no backup, you'll need to contact AWS Support through the sign-in page. This process involves:

1. Click "Sign in using root account credentials"
2. Enter your email
3. Click "Forgot password?" (even though you know the password)
4. AWS will send you a password reset email
5. During the reset process, there's an option to request MFA removal
6. AWS will verify your identity through the email and possibly a phone call

This can take anywhere from a few hours to a couple of business days. During this time, you won't have root access to your account.

## Best Practices for Root Account MFA

### Register the MFA on Two Devices

Authy lets you register on multiple devices. Set it up on your phone and a tablet, or your phone and your partner's phone. That way, losing one device doesn't lock you out.

### Store the Secret Key Securely

When AWS shows you the QR code, it also displays a text secret key. Save this in:

- A password manager (1Password, Bitwarden, LastPass)
- A physical printout in a safe or safety deposit box
- An encrypted USB drive stored separately from your computer

### Don't Use Root for Daily Work

After setting up MFA, stop using the root account for daily tasks. Create IAM users or use [IAM Identity Center](https://oneuptime.com/blog/post/set-up-aws-iam-identity-center-sso/view) for everyday access. The root account should only be used for:

- Changing account settings
- Closing the account
- Restoring IAM user permissions (when locked out)
- Changing the support plan
- Certain billing operations

### Create a Break-Glass Procedure

Document the root account access procedure:

```
Root Account Access Procedure
=============================
1. Root email: admin@company.com
2. Password: stored in vault under "AWS Root Account"
3. MFA device: registered on:
   - Primary: CTO phone (Authy)
   - Backup: Office safe (printed secret key)
4. Recovery contact: AWS account ID 123456789012
5. Last accessed: [date] by [person] for [reason]
```

Store this document in a secure, shared location that at least two trusted people can access.

### Enable Billing Alerts

While you're in the root account, set up billing alerts so you'll know if someone compromises the account and starts spinning up resources:

```bash
# Enable billing alerts in CloudWatch (must be done as root or billing admin)
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "account-cost-monitor",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'
```

## Automating Root MFA Compliance Checks

For organizations managing multiple AWS accounts, check root MFA across all accounts:

```python
import boto3

# Check root account MFA status across all accounts in an organization
org_client = boto3.client("organizations")
accounts = org_client.list_accounts()["Accounts"]

for account in accounts:
    account_id = account["Id"]
    account_name = account["Name"]

    # Use assume-role to check each account
    sts = boto3.client("sts")
    try:
        creds = sts.assume_role(
            RoleArn=f"arn:aws:iam::{account_id}:role/OrganizationAccountAccessRole",
            RoleSessionName="mfa-check"
        )["Credentials"]

        iam = boto3.client(
            "iam",
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"]
        )

        summary = iam.get_account_summary()["SummaryMap"]
        mfa_enabled = summary.get("AccountMFAEnabled", 0)

        status = "OK" if mfa_enabled else "WARNING - NO MFA"
        print(f"{account_name} ({account_id}): {status}")

    except Exception as e:
        print(f"{account_name} ({account_id}): Error - {str(e)}")
```

## AWS Config Rule for Root MFA

You can also use AWS Config to continuously monitor root MFA:

```bash
# Create a Config rule that checks if root account MFA is enabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "root-account-mfa-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ROOT_ACCOUNT_MFA_ENABLED"
    }
  }'
```

This rule evaluates periodically and flags the account as non-compliant if root MFA isn't enabled.

## Summary

Setting up virtual MFA on the root account takes about five minutes. Recovering from a compromised root account without MFA can take weeks and cost you thousands. The math is pretty clear.

Do it now. Open a new tab, sign into your root account, and set up MFA. Then save the backup codes. Then stop using root for daily work. Your future self will thank you.
