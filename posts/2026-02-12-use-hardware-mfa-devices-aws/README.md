# How to Use Hardware MFA Devices with AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, MFA

Description: Learn how to configure and use hardware MFA devices like YubiKeys and Gemalto tokens with AWS for maximum account security.

---

Virtual MFA apps are good. Hardware MFA devices are better. They can't be phished, they can't be cloned remotely, and they don't depend on a phone battery. For high-security environments - especially the root account and admin users - hardware MFA is the gold standard.

AWS supports two categories of hardware MFA: FIDO2 security keys (like YubiKeys) and time-based one-time password (TOTP) hardware tokens (like the Gemalto key fob). Let's go through both.

## FIDO2 Security Keys vs TOTP Hardware Tokens

Here's a quick comparison to help you decide.

| Feature | FIDO2 (YubiKey) | TOTP (Gemalto) |
|---------|-----------------|-----------------|
| Phishing resistant | Yes | No |
| Works with CLI | No (console only) | Yes |
| Battery required | No | Yes |
| Price | $25-$70 | $13-$25 |
| Works with root | Yes | Yes |
| Multiple accounts | Yes | No (one per device) |

FIDO2 keys are phishing-resistant because they bind to the specific website URL. Even if someone tricks you into entering credentials on a fake AWS login page, the key won't respond because the domain doesn't match. TOTP tokens generate codes that work regardless of where you type them.

## Setting Up a FIDO2 Security Key (YubiKey)

### Supported Keys

AWS supports any FIDO2-certified security key. Popular options include:

- YubiKey 5 series (USB-A, USB-C, NFC)
- YubiKey 5Ci (USB-C and Lightning)
- Feitian ePass FIDO2
- SoloKeys

### For the Root Account

1. Sign into the AWS Console with your root credentials
2. Go to Account name > Security credentials
3. Under MFA, click "Assign MFA device"
4. Enter a device name (e.g., "yubikey-root-primary")
5. Select "Security key"
6. Click Next
7. When prompted, insert your security key and tap it
8. The browser will communicate with the key using WebAuthn
9. Tap the key again to confirm
10. Done - your root account now requires the physical key to log in

### For IAM Users

The process through the console is nearly identical:

1. Go to IAM > Users > Select user
2. Security credentials tab
3. Assign MFA device
4. Select "Security key"
5. Follow the browser prompts to register the key

You can also do this via CLI, though it's more involved:

```bash
# Enable a FIDO2 security key for an IAM user
# First, start the registration from the console
# CLI registration for FIDO2 requires the WebAuthn API which is browser-based

# For TOTP hardware tokens, CLI works directly (see below)
```

Note that FIDO2 registration requires a browser since it uses the WebAuthn API. You can't register a FIDO2 key purely through the CLI.

## Setting Up a TOTP Hardware Token (Gemalto)

TOTP hardware tokens work like authenticator apps but in a dedicated physical device. The Gemalto token is a small key fob with a screen that displays a 6-digit code.

### Ordering Tokens

You can order Gemalto tokens from Amazon or directly from Thales. Each token has a unique serial number printed on the back.

### Registration via Console

1. Go to IAM > Users > Select user (or Security credentials for root)
2. Assign MFA device
3. Select "Hardware TOTP token"
4. Enter the serial number from the back of the device
5. Enter two consecutive codes from the device display
6. Click Assign

### Registration via CLI

```bash
# Enable a hardware TOTP MFA device for an IAM user
# The serial number is printed on the back of the physical token
aws iam enable-mfa-device \
  --user-name admin-user \
  --serial-number "arn:aws:iam::123456789012:mfa/hardware-token-serial" \
  --authentication-code1 123456 \
  --authentication-code2 789012
```

Wait for the code to change between entering the first and second codes. They need to be consecutive, not the same code entered twice.

## Using Hardware MFA with the CLI

This is where TOTP tokens have an advantage over FIDO2 keys. You can use TOTP codes to get temporary credentials via STS:

```bash
# Get temporary session credentials using hardware MFA token
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789012:mfa/hardware-token-serial \
  --token-code 123456 \
  --duration-seconds 43200
```

This returns temporary credentials valid for up to 12 hours:

```json
{
  "Credentials": {
    "AccessKeyId": "ASIAEXAMPLEKEY",
    "SecretAccessKey": "secretkey123",
    "SessionToken": "FwoGZXIvYXdzEP...",
    "Expiration": "2026-02-13T04:00:00Z"
  }
}
```

Here's a helper script that makes CLI usage with hardware MFA easier:

```bash
#!/bin/bash
# Script to authenticate CLI sessions with hardware MFA

MFA_SERIAL="arn:aws:iam::123456789012:mfa/hardware-token-serial"
PROFILE="default"

echo "Enter MFA code from your hardware token:"
read -r MFA_CODE

# Get temporary credentials using the hardware MFA code
CREDS=$(aws sts get-session-token \
  --serial-number "$MFA_SERIAL" \
  --token-code "$MFA_CODE" \
  --duration-seconds 43200 \
  --output json)

# Extract credentials from the response
ACCESS_KEY=$(echo "$CREDS" | jq -r '.Credentials.AccessKeyId')
SECRET_KEY=$(echo "$CREDS" | jq -r '.Credentials.SecretAccessKey')
SESSION_TOKEN=$(echo "$CREDS" | jq -r '.Credentials.SessionToken')

# Set up a temporary profile with MFA credentials
aws configure set aws_access_key_id "$ACCESS_KEY" --profile mfa
aws configure set aws_secret_access_key "$SECRET_KEY" --profile mfa
aws configure set aws_session_token "$SESSION_TOKEN" --profile mfa

echo "MFA session configured. Use --profile mfa with your commands."
echo "Session expires in 12 hours."
```

## Assuming Roles with Hardware MFA

For cross-account access that requires MFA, you can use the hardware token with `assume-role`:

```bash
# Assume a role in another account using hardware MFA
aws sts assume-role \
  --role-arn arn:aws:iam::987654321098:role/AdminRole \
  --role-session-name hardware-mfa-session \
  --serial-number arn:aws:iam::123456789012:mfa/hardware-token-serial \
  --token-code 654321 \
  --duration-seconds 3600
```

The target role's trust policy needs to allow MFA-authenticated sessions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
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

## Managing Multiple Hardware Tokens

For critical accounts, register two hardware tokens - a primary and a backup. AWS allows up to 8 MFA devices per IAM user.

```bash
# List MFA devices for a user to see what is registered
aws iam list-mfa-devices --user-name admin-user
```

Store the backup token in a different physical location from the primary. A fireproof safe at the office for the primary and a safety deposit box for the backup works well.

## Deactivating a Lost Hardware Token

If a hardware token is lost or compromised, deactivate it immediately:

```bash
# Deactivate a compromised or lost MFA device
aws iam deactivate-mfa-device \
  --user-name admin-user \
  --serial-number arn:aws:iam::123456789012:mfa/lost-token-serial

# Then register the replacement device
aws iam enable-mfa-device \
  --user-name admin-user \
  --serial-number arn:aws:iam::123456789012:mfa/new-token-serial \
  --authentication-code1 111111 \
  --authentication-code2 222222
```

## Token Synchronization Issues

Hardware TOTP tokens can drift out of sync over time. If your codes aren't being accepted:

```bash
# Resynchronize a hardware MFA device that has drifted
aws iam resync-mfa-device \
  --user-name admin-user \
  --serial-number arn:aws:iam::123456789012:mfa/hardware-token-serial \
  --authentication-code1 111111 \
  --authentication-code2 222222
```

Enter two consecutive codes and AWS will recalibrate its time offset for your device.

## Cost Considerations

Hardware tokens aren't free, but they're cheap compared to a security breach:

- YubiKey 5 NFC: ~$45 each
- YubiKey 5C: ~$55 each
- Gemalto TOTP token: ~$15 each

For an organization with 10 admin users, each needing a primary and backup token, you're looking at around $900 for YubiKeys or $300 for Gemalto tokens. That's a rounding error on most AWS bills.

## When to Use Hardware MFA

Hardware MFA is most important for:

- The root account (always)
- Break-glass emergency access accounts
- Admin users with broad permissions
- Users with access to billing and cost management
- Anyone who handles sensitive data (PII, financial records, healthcare data)

For regular developers who primarily use roles via [IAM Identity Center](https://oneuptime.com/blog/post/2026-02-12-set-up-aws-iam-identity-center-sso/view), virtual MFA through the SSO portal is usually sufficient. Reserve hardware tokens for the accounts where compromise would be catastrophic.

Hardware MFA is a small investment that dramatically reduces your attack surface. If you haven't set it up for your root account yet, that should be your next task. Check out our guide on [enforcing MFA for all IAM users](https://oneuptime.com/blog/post/2026-02-12-enable-enforce-mfa-iam-users/view) for the policy side of things.
