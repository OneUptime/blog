# How to Use AWS CLI with MFA Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, MFA, Security, Authentication

Description: Learn how to configure and use the AWS CLI with Multi-Factor Authentication to add an extra layer of security for sensitive AWS operations.

---

If your organization requires MFA for AWS console access (and it should), you should require it for CLI access too. Otherwise, someone who gets hold of an access key can bypass MFA entirely and do whatever the key allows. Setting up MFA for the CLI is a little more involved than the console - there's no popup asking for your code. But once you understand the flow, it's straightforward to automate.

## How CLI MFA Works

The basic flow is:

1. You have long-term credentials (access key + secret key) in a profile
2. When you need MFA-protected access, you call `sts:GetSessionToken` with your MFA device serial number and current token code
3. STS returns temporary credentials (access key + secret key + session token)
4. You use those temporary credentials for subsequent API calls

The temporary credentials are valid for up to 36 hours (configurable), so you don't need to enter your MFA code for every single command.

## Step 1: Find Your MFA Device ARN

```bash
# List MFA devices for your IAM user
aws iam list-mfa-devices --user-name your-username \
  --query "MFADevices[].SerialNumber" \
  --output text

# Output: arn:aws:iam::123456789:mfa/your-username
```

If you're using a virtual MFA device (like Google Authenticator or Authy), the ARN looks like `arn:aws:iam::123456789:mfa/your-username`. For hardware tokens, it's the device serial number.

## Step 2: Configure Profiles for MFA

Set up your AWS config with a base profile (long-term credentials) and an MFA profile that assumes a role.

```ini
# ~/.aws/credentials

[base-account]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

```ini
# ~/.aws/config

[profile base-account]
region = us-east-1
output = json

[profile production]
source_profile = base-account
role_arn = arn:aws:iam::333333333333:role/AdminRole
mfa_serial = arn:aws:iam::111111111111:mfa/your-username
region = us-east-1
```

When you use the `production` profile, the CLI will automatically prompt you for your MFA code.

```bash
# This will prompt for MFA code
aws s3 ls --profile production
# Enter MFA code for arn:aws:iam::111111111111:mfa/your-username: 123456
```

The CLI caches the temporary credentials, so subsequent commands with the same profile won't ask again until they expire.

## Step 3: Manual MFA Session (Without Role Assumption)

If you need MFA-protected access to the same account (no role assumption), the CLI doesn't have built-in support for the prompt. You need to manually get session tokens.

```bash
# Get temporary credentials with MFA
aws sts get-session-token \
  --serial-number "arn:aws:iam::123456789:mfa/your-username" \
  --token-code 123456 \
  --duration-seconds 43200

# Output:
# {
#     "Credentials": {
#         "AccessKeyId": "ASIATEMP...",
#         "SecretAccessKey": "tempSecret...",
#         "SessionToken": "FwoGZX...",
#         "Expiration": "2026-02-13T04:00:00Z"
#     }
# }
```

Then set those as environment variables or put them in a profile.

```bash
# Export as environment variables
export AWS_ACCESS_KEY_ID="ASIATEMP..."
export AWS_SECRET_ACCESS_KEY="tempSecret..."
export AWS_SESSION_TOKEN="FwoGZX..."

# Now commands use MFA-authenticated credentials
aws s3 ls
```

## Step 4: Automate It with a Script

Typing all that is tedious. Here's a script that handles the MFA flow automatically.

```bash
#!/bin/bash
# aws-mfa.sh - Get MFA-authenticated temporary credentials

# Configuration
MFA_SERIAL="arn:aws:iam::123456789:mfa/your-username"
DURATION=43200  # 12 hours
SOURCE_PROFILE="${1:-default}"
MFA_PROFILE="${2:-mfa}"

# Prompt for MFA code
read -p "Enter MFA code for $MFA_SERIAL: " MFA_CODE

if [ -z "$MFA_CODE" ]; then
    echo "Error: MFA code is required"
    exit 1
fi

# Get temporary credentials
echo "Getting temporary credentials..."
CREDS=$(aws sts get-session-token \
    --serial-number "$MFA_SERIAL" \
    --token-code "$MFA_CODE" \
    --duration-seconds "$DURATION" \
    --profile "$SOURCE_PROFILE" \
    --output json)

if [ $? -ne 0 ]; then
    echo "Error: Failed to get session token"
    exit 1
fi

# Parse the credentials
ACCESS_KEY=$(echo "$CREDS" | python3 -c "import sys, json; print(json.load(sys.stdin)['Credentials']['AccessKeyId'])")
SECRET_KEY=$(echo "$CREDS" | python3 -c "import sys, json; print(json.load(sys.stdin)['Credentials']['SecretAccessKey'])")
SESSION_TOKEN=$(echo "$CREDS" | python3 -c "import sys, json; print(json.load(sys.stdin)['Credentials']['SessionToken'])")
EXPIRATION=$(echo "$CREDS" | python3 -c "import sys, json; print(json.load(sys.stdin)['Credentials']['Expiration'])")

# Update the credentials file
aws configure set aws_access_key_id "$ACCESS_KEY" --profile "$MFA_PROFILE"
aws configure set aws_secret_access_key "$SECRET_KEY" --profile "$MFA_PROFILE"
aws configure set aws_session_token "$SESSION_TOKEN" --profile "$MFA_PROFILE"

echo "Temporary credentials saved to profile '$MFA_PROFILE'"
echo "Credentials expire at: $EXPIRATION"
echo ""
echo "Usage: aws <command> --profile $MFA_PROFILE"
echo "   or: export AWS_PROFILE=$MFA_PROFILE"
```

Make it executable and use it.

```bash
chmod +x aws-mfa.sh

# Get MFA credentials (stores in 'mfa' profile by default)
./aws-mfa.sh default mfa

# Now use the mfa profile
aws s3 ls --profile mfa
```

## Step 5: Python Helper for MFA

If you prefer Python, here's a more robust version.

```python
#!/usr/bin/env python3
"""
AWS MFA credential helper.
Gets temporary credentials and stores them in a named profile.
"""

import boto3
import configparser
import os
import sys
from pathlib import Path

def get_mfa_credentials(
    mfa_serial,
    source_profile='default',
    mfa_profile='mfa',
    duration=43200
):
    # Get MFA code from user
    mfa_code = input(f"Enter MFA code for {mfa_serial}: ").strip()

    if not mfa_code or len(mfa_code) != 6:
        print("Error: MFA code must be 6 digits")
        sys.exit(1)

    # Create a session with the source profile
    session = boto3.Session(profile_name=source_profile)
    sts = session.client('sts')

    try:
        response = sts.get_session_token(
            SerialNumber=mfa_serial,
            TokenCode=mfa_code,
            DurationSeconds=duration
        )
    except Exception as e:
        print(f"Error getting session token: {e}")
        sys.exit(1)

    creds = response['Credentials']

    # Write to credentials file
    creds_path = Path.home() / '.aws' / 'credentials'
    config = configparser.ConfigParser()
    config.read(creds_path)

    if mfa_profile not in config:
        config.add_section(mfa_profile)

    config[mfa_profile]['aws_access_key_id'] = creds['AccessKeyId']
    config[mfa_profile]['aws_secret_access_key'] = creds['SecretAccessKey']
    config[mfa_profile]['aws_session_token'] = creds['SessionToken']

    with open(creds_path, 'w') as f:
        config.write(f)

    print(f"\nCredentials saved to profile '{mfa_profile}'")
    print(f"Expires: {creds['Expiration']}")

    # Verify the credentials work
    test_session = boto3.Session(profile_name=mfa_profile)
    identity = test_session.client('sts').get_caller_identity()
    print(f"Authenticated as: {identity['Arn']}")

if __name__ == '__main__':
    get_mfa_credentials(
        mfa_serial='arn:aws:iam::123456789:mfa/your-username',
        source_profile='default',
        mfa_profile='mfa'
    )
```

## Enforcing MFA with IAM Policies

To make MFA truly required (not just optional), add a condition to your IAM policies that denies access without MFA.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAllActionsWithMFA",
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    },
    {
      "Sid": "AllowMFAManagementWithoutMFA",
      "Effect": "Allow",
      "Action": [
        "iam:ListMFADevices",
        "iam:GetUser",
        "sts:GetSessionToken"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyAllWithoutMFA",
      "Effect": "Deny",
      "NotAction": [
        "iam:ListMFADevices",
        "iam:GetUser",
        "sts:GetSessionToken",
        "iam:ChangePassword"
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

This policy allows basic identity operations without MFA (so users can get session tokens), but blocks everything else unless MFA credentials are present.

## Credential Duration and Caching

The CLI caches assumed-role credentials in `~/.aws/cli/cache/`. You can control the duration with the `duration_seconds` setting in your config.

```ini
# ~/.aws/config

[profile production]
source_profile = base-account
role_arn = arn:aws:iam::333333333333:role/AdminRole
mfa_serial = arn:aws:iam::111111111111:mfa/your-username
duration_seconds = 3600  # 1 hour for production (shorter = safer)
```

For production access, consider shorter durations. For development, longer durations reduce the frequency of MFA prompts.

## Troubleshooting

**"Access denied" even with correct MFA code** - Check that the IAM role's trust policy allows your account and that the condition for MFA is correct.

**"Token has expired"** - Re-run the MFA script or assume the role again. Cached credentials have expired.

**"Invalid MFA code"** - Make sure your device's clock is synchronized. TOTP codes are time-sensitive.

For monitoring access patterns and detecting unusual authentication attempts, [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can help track API call patterns across your AWS accounts.

## Wrapping Up

MFA on the CLI adds friction, no question. But that friction is what stands between an attacker with stolen access keys and your production infrastructure. Automate the credential retrieval with scripts, use reasonable session durations, and make it part of your daily workflow. After a week, entering a 6-digit code becomes second nature, and the security benefit far outweighs the inconvenience.
