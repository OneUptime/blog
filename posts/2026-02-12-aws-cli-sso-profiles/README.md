# How to Use AWS CLI with SSO Profiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, SSO, IAM Identity Center, Authentication

Description: Learn how to configure AWS CLI with SSO profiles using IAM Identity Center for secure, keyless authentication that integrates with your identity provider.

---

Long-term IAM access keys are a security liability. They sit in plaintext files on your laptop, they get committed to git repositories, they get shared in Slack messages. AWS IAM Identity Center (formerly AWS SSO) offers a better approach: you authenticate through your identity provider (Okta, Azure AD, Google Workspace, etc.), and the CLI gets short-lived credentials automatically. No access keys to manage, rotate, or accidentally leak.

If your organization uses IAM Identity Center (and if you're on [Control Tower](https://oneuptime.com/blog/post/2026-02-12-aws-control-tower-landing-zones/view), you already have it), setting up SSO for the CLI is one of the best security improvements you can make.

## How SSO CLI Authentication Works

The flow goes like this:

1. You run `aws sso login --profile myprofile`
2. The CLI opens your browser to the IAM Identity Center login page
3. You authenticate (username/password, MFA, whatever your IdP requires)
4. The browser confirms the authentication
5. The CLI receives short-lived credentials and caches them locally
6. Subsequent commands use the cached credentials until they expire

No access keys are ever written to `~/.aws/credentials`. The cached tokens are stored in `~/.aws/sso/cache/` and are automatically refreshed.

## Step 1: Configure an SSO Profile

The new (and recommended) way uses `aws configure sso` which walks you through the setup interactively.

```bash
# Configure a new SSO profile
aws configure sso

# SSO session name (Recommended): my-org
# SSO start URL [None]: https://my-org.awsapps.com/start
# SSO region [None]: us-east-1
# SSO registration scopes [sso:account:access]:
```

The CLI will open your browser for authentication. After you log in, it shows you available accounts and roles.

```
# There are N AWS accounts available to you.
# Using the account ID 123456789012
# The only role available to you is: AdministratorAccess

# CLI default client Region [us-east-1]:
# CLI default output format [json]:
# CLI profile name [AdministratorAccess-123456789012]: dev-admin
```

This creates the following configuration.

```ini
# ~/.aws/config

[profile dev-admin]
sso_session = my-org
sso_account_id = 123456789012
sso_role_name = AdministratorAccess
region = us-east-1
output = json

[sso-session my-org]
sso_start_url = https://my-org.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
```

The `sso-session` block is the key improvement over the old SSO config format. It lets multiple profiles share a single login session, so you authenticate once and access all your accounts.

## Step 2: Add More Profiles

Add profiles for each account and role combination you need. They all reference the same SSO session.

```ini
# ~/.aws/config

[sso-session my-org]
sso_start_url = https://my-org.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access

[profile dev-admin]
sso_session = my-org
sso_account_id = 111111111111
sso_role_name = AdministratorAccess
region = us-east-1
output = json

[profile staging-admin]
sso_session = my-org
sso_account_id = 222222222222
sso_role_name = AdministratorAccess
region = us-east-1
output = json

[profile prod-readonly]
sso_session = my-org
sso_account_id = 333333333333
sso_role_name = ReadOnlyAccess
region = us-east-1
output = json

[profile prod-admin]
sso_session = my-org
sso_account_id = 333333333333
sso_role_name = AdministratorAccess
region = us-east-1
output = json

[profile data-team]
sso_session = my-org
sso_account_id = 444444444444
sso_role_name = DataEngineerAccess
region = us-west-2
output = json
```

## Step 3: Log In and Use

```bash
# Log in (opens browser once for all profiles sharing the session)
aws sso login --profile dev-admin

# Now use any profile that shares the same sso-session
aws s3 ls --profile dev-admin
aws ec2 describe-instances --profile staging-admin
aws rds describe-db-instances --profile prod-readonly
```

One login gives you access to all profiles. That's the benefit of the `sso-session` approach.

## Step 4: Automatic Token Refresh

SSO tokens have a configurable expiration. By default, the access token lasts 8 hours. You can request longer sessions if your IdP supports it.

```bash
# Check when your current session expires
ls -la ~/.aws/sso/cache/

# Login again when tokens expire
aws sso login --profile dev-admin
```

For long-running scripts, handle token expiration gracefully.

```python
import boto3
from botocore.exceptions import UnauthorizedSSOTokenError, TokenRetrievalError
import subprocess
import sys

def get_sso_session(profile_name):
    """Get a boto3 session with SSO, handling expired tokens."""
    try:
        session = boto3.Session(profile_name=profile_name)
        # Test the credentials
        sts = session.client('sts')
        sts.get_caller_identity()
        return session
    except (UnauthorizedSSOTokenError, TokenRetrievalError):
        print(f"SSO token expired. Please log in again.")
        subprocess.run(['aws', 'sso', 'login', '--profile', profile_name])
        return boto3.Session(profile_name=profile_name)

# Usage
session = get_sso_session('dev-admin')
s3 = session.client('s3')
buckets = s3.list_buckets()
for bucket in buckets['Buckets']:
    print(bucket['Name'])
```

## Shell Helpers for SSO

Add these to your shell RC file for a smoother workflow.

```bash
# Quick SSO login
alias awslogin='aws sso login --profile'

# List all SSO profiles
aws-profiles() {
    grep -E '^\[profile ' ~/.aws/config | sed 's/\[profile //;s/\]//' | while read profile; do
        account=$(grep -A5 "^\[profile $profile\]" ~/.aws/config | grep sso_account_id | awk '{print $3}')
        role=$(grep -A5 "^\[profile $profile\]" ~/.aws/config | grep sso_role_name | awk '{print $3}')
        if [ -n "$account" ]; then
            printf "%-25s %-15s %s\n" "$profile" "$account" "$role"
        fi
    done
}

# Switch profile and verify
awsp() {
    export AWS_PROFILE="$1"
    echo "Switched to: $1"
    aws sts get-caller-identity --query "{Account:Account, Role:Arn}" --output table 2>/dev/null || \
        echo "Not authenticated. Run: aws sso login --profile $1"
}
```

## Using SSO with AWS SDKs

Boto3 and other AWS SDKs support SSO profiles natively. Just specify the profile name.

```python
import boto3

# Using SSO profile in boto3
session = boto3.Session(profile_name='staging-admin')
ec2 = session.client('ec2')

instances = ec2.describe_instances()
for reservation in instances['Reservations']:
    for instance in reservation['Instances']:
        print(f"{instance['InstanceId']}: {instance['State']['Name']}")
```

For tools that don't support SSO profiles directly, you can export temporary credentials.

```bash
# Export credentials for tools that need env vars
eval $(aws configure export-credentials --profile dev-admin --format env)

# Or for Docker/other tools
aws configure export-credentials --profile dev-admin --format env
# AWS_ACCESS_KEY_ID=ASIATEMP...
# AWS_SECRET_ACCESS_KEY=temp...
# AWS_SESSION_TOKEN=FwoG...
```

## Migrating from Access Keys to SSO

If you're moving from IAM access keys to SSO, here's the approach.

```bash
# Step 1: Set up SSO profiles (as shown above)

# Step 2: Test that SSO profiles work
aws sso login --profile dev-admin
aws sts get-caller-identity --profile dev-admin

# Step 3: Update your scripts and tools to use --profile
# Find scripts that reference old profiles
grep -r "AWS_PROFILE\|--profile\|aws_access_key" ~/projects/

# Step 4: Once everything works with SSO, remove old access keys
aws iam delete-access-key \
  --user-name your-username \
  --access-key-id AKIAOLDKEY123

# Step 5: Clean up old credentials file
# Remove entries from ~/.aws/credentials that are no longer needed
```

## SSO with CI/CD Pipelines

SSO is for interactive use. For CI/CD pipelines, use IAM roles instead. In GitHub Actions, for example, use OIDC federation.

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubDeployRole
          aws-region: us-east-1
      - run: aws s3 ls  # Uses OIDC-federated credentials
```

## Troubleshooting

**"Error loading SSO Token"** - Run `aws sso login --profile your-profile` to refresh.

**Browser doesn't open** - Set the `AWS_SSO_BROWSER` environment variable to your browser path, or use `--no-browser` and manually navigate to the URL.

**"The SSO session associated with this profile has expired"** - Your SSO session has timed out. Log in again.

```bash
# Force logout and login fresh
aws sso logout
aws sso login --profile dev-admin
```

For monitoring authentication patterns and detecting anomalies across your AWS accounts, [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can provide visibility into who's accessing what.

## Wrapping Up

SSO profiles are the modern way to authenticate with the AWS CLI. No more access keys, no more credential rotation headaches, no more secrets in config files. Your organization's identity provider handles authentication, IAM Identity Center handles authorization, and the CLI gets short-lived credentials automatically. If you haven't migrated yet, start with your most active users and accounts, verify everything works, then phase out the old access keys. Your security team will thank you.
