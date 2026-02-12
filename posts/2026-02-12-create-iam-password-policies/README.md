# How to Create IAM Password Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security

Description: Learn how to create and configure IAM password policies in AWS to enforce strong passwords, rotation requirements, and compliance standards.

---

Weak passwords are low-hanging fruit for attackers. AWS lets you define a password policy for your entire account that sets minimum requirements for all IAM users. If you haven't configured one yet, your users can set "password1" as their password and call it a day. Let's fix that.

## Default Password Policy

When you create a new AWS account, there's a default password policy that's pretty loose:

- Minimum length: 8 characters
- No requirement for uppercase, lowercase, numbers, or symbols
- No expiration
- No reuse prevention

That's not going to pass any security audit. Let's set up something better.

## Creating a Strong Password Policy via CLI

Here's a password policy that aligns with most compliance frameworks (SOC 2, PCI DSS, HIPAA):

```bash
# Set a strong password policy for the AWS account
aws iam update-account-password-policy \
  --minimum-password-length 14 \
  --require-symbols \
  --require-numbers \
  --require-uppercase-characters \
  --require-lowercase-characters \
  --allow-users-to-change-password \
  --max-password-age 90 \
  --password-reuse-prevention 24 \
  --hard-expiry
```

Let me break down each parameter:

- **minimum-password-length 14**: Longer passwords are exponentially harder to crack. NIST recommends at least 8, but 14 gives you a much better margin.
- **require-symbols**: At least one special character (!, @, #, etc.)
- **require-numbers**: At least one digit
- **require-uppercase-characters**: At least one uppercase letter
- **require-lowercase-characters**: At least one lowercase letter
- **allow-users-to-change-password**: Users can change their own passwords without admin help
- **max-password-age 90**: Passwords expire after 90 days
- **password-reuse-prevention 24**: Users can't reuse their last 24 passwords
- **hard-expiry**: When a password expires, the user must contact an admin to reset it (can't just reset it themselves)

## Checking the Current Policy

Before changing anything, check what's currently in place:

```bash
# View the current account password policy
aws iam get-account-password-policy
```

If no custom policy has been set, you'll get an error: `NoSuchEntity`. That means the default (weak) policy is active.

## Creating a Policy via CloudFormation

If you manage infrastructure as code (and you should), here's the CloudFormation template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: IAM password policy configuration

Resources:
  # Custom resource to set the account password policy
  PasswordPolicy:
    Type: Custom::PasswordPolicy
    Properties:
      ServiceToken: !GetAtt PasswordPolicyFunction.Arn
      MinimumPasswordLength: 14
      RequireSymbols: true
      RequireNumbers: true
      RequireUppercaseCharacters: true
      RequireLowercaseCharacters: true
      AllowUsersToChangePassword: true
      MaxPasswordAge: 90
      PasswordReusePrevention: 24
      HardExpiry: false

  PasswordPolicyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: python3.12
      Handler: index.handler
      Role: !GetAtt PasswordPolicyRole.Arn
      Code:
        ZipFile: |
          import boto3
          import cfnresponse

          def handler(event, context):
              iam = boto3.client('iam')
              try:
                  if event['RequestType'] in ['Create', 'Update']:
                      props = event['ResourceProperties']
                      iam.update_account_password_policy(
                          MinimumPasswordLength=int(props['MinimumPasswordLength']),
                          RequireSymbols=props['RequireSymbols'] == 'true',
                          RequireNumbers=props['RequireNumbers'] == 'true',
                          RequireUppercaseCharacters=props['RequireUppercaseCharacters'] == 'true',
                          RequireLowercaseCharacters=props['RequireLowercaseCharacters'] == 'true',
                          AllowUsersToChangePassword=props['AllowUsersToChangePassword'] == 'true',
                          MaxPasswordAge=int(props['MaxPasswordAge']),
                          PasswordReusePrevention=int(props['PasswordReusePrevention']),
                          HardExpiry=props['HardExpiry'] == 'true'
                      )
                  cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
              except Exception as e:
                  cfnresponse.send(event, context, cfnresponse.FAILED, {'Error': str(e)})

  PasswordPolicyRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: UpdatePasswordPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - iam:UpdateAccountPasswordPolicy
                Resource: '*'
              - Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource: '*'
```

## Using Terraform

For Terraform users, it's much simpler:

```hcl
# Configure the IAM account password policy
resource "aws_iam_account_password_policy" "strict" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_numbers                = true
  require_uppercase_characters   = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 24
  hard_expiry                    = false
}
```

Clean, readable, version-controlled. This is the way to go for most teams.

## The Password Expiration Debate

Here's something interesting: NIST's latest guidelines (SP 800-63B) actually recommend against forced password rotation. Their reasoning is that when users are forced to change passwords regularly, they tend to make small, predictable changes ("Password1!" becomes "Password2!" becomes "Password3!").

Instead, NIST recommends:

- Long passwords (or passphrases)
- No expiration unless there's evidence of compromise
- Checking passwords against known breached password lists

However, most compliance frameworks (SOC 2, PCI DSS) still require password rotation. So you'll need to balance NIST best practices with your compliance requirements. If you're required to have expiration, set it to 90 days and pair it with MFA enforcement. Check out our guide on [enforcing MFA for IAM users](https://oneuptime.com/blog/post/enable-enforce-mfa-iam-users/view) for the full MFA setup.

## Monitoring Password Policy Compliance

Use AWS Config to continuously check that your password policy meets your standards:

```bash
# Create Config rules to monitor password policy settings
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "iam-password-policy-length",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "IAM_PASSWORD_POLICY"
    },
    "InputParameters": "{\"RequireUppercaseCharacters\":\"true\",\"RequireLowercaseCharacters\":\"true\",\"RequireSymbols\":\"true\",\"RequireNumbers\":\"true\",\"MinimumPasswordLength\":\"14\",\"PasswordReusePrevention\":\"24\",\"MaxPasswordAge\":\"90\"}"
  }'
```

## Checking User Password Ages

Want to know which users have old passwords that need rotating? Use the credential report:

```python
import boto3
import csv
from io import StringIO
from datetime import datetime, timezone

# Find users with passwords older than 90 days
iam = boto3.client("iam")

# Generate the credential report
iam.generate_credential_report()

import time
time.sleep(5)

# Download and parse the report
report = iam.get_credential_report()
content = report["Content"].decode("utf-8")
reader = csv.DictReader(StringIO(content))

now = datetime.now(timezone.utc)
stale_threshold = 90  # days

print(f"{'User':<25} {'Password Age (days)':<22} {'Status'}")
print("-" * 60)

for row in reader:
    user = row["user"]
    password_last_changed = row.get("password_last_changed", "N/A")

    if password_last_changed in ("N/A", "not_supported", "no_information"):
        continue

    try:
        last_changed = datetime.fromisoformat(
            password_last_changed.replace("Z", "+00:00")
        )
        age_days = (now - last_changed).days
        status = "STALE" if age_days > stale_threshold else "OK"
        print(f"{user:<25} {age_days:<22} {status}")
    except ValueError:
        continue
```

## Notifying Users About Expiring Passwords

AWS doesn't send notifications when passwords are about to expire. You'll need to build this yourself. Here's a Lambda function that checks daily and sends email notifications:

```python
import boto3
import csv
from io import StringIO
from datetime import datetime, timezone

def lambda_handler(event, context):
    iam = boto3.client("iam")
    ses = boto3.client("ses")

    # Get password policy to know the max age
    policy = iam.get_account_password_policy()["PasswordPolicy"]
    max_age = policy.get("MaxPasswordAge", 90)

    # Generate credential report
    iam.generate_credential_report()

    import time
    time.sleep(5)

    report = iam.get_credential_report()
    content = report["Content"].decode("utf-8")
    reader = csv.DictReader(StringIO(content))

    now = datetime.now(timezone.utc)
    warning_days = 14  # warn 14 days before expiry

    for row in reader:
        user = row["user"]
        pw_changed = row.get("password_last_changed", "N/A")

        if pw_changed in ("N/A", "not_supported"):
            continue

        last_changed = datetime.fromisoformat(pw_changed.replace("Z", "+00:00"))
        age_days = (now - last_changed).days
        days_until_expiry = max_age - age_days

        if 0 < days_until_expiry <= warning_days:
            # Look up user tags for email address
            tags = iam.list_user_tags(UserName=user)["Tags"]
            email = next(
                (t["Value"] for t in tags if t["Key"] == "email"), None
            )

            if email:
                ses.send_email(
                    Source="security@company.com",
                    Destination={"ToAddresses": [email]},
                    Message={
                        "Subject": {
                            "Data": f"AWS Password Expires in {days_until_expiry} Days"
                        },
                        "Body": {
                            "Text": {
                                "Data": f"Hi {user}, your AWS console password "
                                       f"expires in {days_until_expiry} days. "
                                       f"Please sign in and change it."
                            }
                        }
                    }
                )
                print(f"Notified {user} ({email}): {days_until_expiry} days left")
```

## Recommendations by Compliance Framework

| Framework | Min Length | Rotation | Complexity | MFA Required |
|-----------|-----------|----------|------------|--------------|
| SOC 2 | 8+ | 90 days | Yes | Recommended |
| PCI DSS | 7+ | 90 days | Yes | Yes |
| HIPAA | 8+ | Periodic | Yes | Recommended |
| NIST 800-63B | 8+ | No (unless breach) | No | Yes |
| CIS Benchmark | 14+ | 90 days | Yes | Yes |

For most organizations, I'd recommend following the CIS AWS Foundations Benchmark: 14-character minimum, 90-day rotation, full complexity requirements, and mandatory MFA.

## Moving Beyond Passwords

Honestly, the best password policy is one you don't need. If you move to [IAM Identity Center (SSO)](https://oneuptime.com/blog/post/set-up-aws-iam-identity-center-sso/view) with federation from your identity provider, your users authenticate through your corporate IdP. Password policies are managed centrally in Active Directory, Okta, or Google Workspace rather than in each AWS account.

That said, you'll always need IAM users for some things - break-glass accounts, service accounts, or small teams without an IdP. For those cases, a strong password policy is essential.
