# How to Set Up AWS CLI Named Profiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, Profiles, Configuration

Description: Learn how to set up and manage multiple AWS CLI named profiles to work with different accounts, regions, and credentials from a single machine.

---

If you work with more than one AWS account - and most people do - you need named profiles. Without them, you're stuck exporting environment variables every time you switch contexts, or worse, overwriting your default credentials and accidentally deploying to production when you meant to hit staging.

Named profiles let you define multiple sets of credentials and configuration in your AWS CLI config files. Switching between accounts becomes a simple `--profile` flag or environment variable change. Let's set them up properly.

## How AWS CLI Configuration Works

The AWS CLI uses two files:

- `~/.aws/credentials` - stores access keys and secrets
- `~/.aws/config` - stores region, output format, and profile-specific settings

You can put everything in `~/.aws/config` if you prefer, but splitting them is the convention.

## Setting Up Basic Profiles

The simplest way to add a profile is with `aws configure`.

```bash
# Set up the default profile
aws configure
# AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name: us-east-1
# Default output format: json

# Set up a named profile for staging
aws configure --profile staging
# AWS Access Key ID: AKIA_STAGING_KEY
# AWS Secret Access Key: staging_secret_key
# Default region name: us-east-1
# Default output format: json

# Set up a profile for production
aws configure --profile production
# AWS Access Key ID: AKIA_PROD_KEY
# AWS Secret Access Key: prod_secret_key
# Default region name: us-east-1
# Default output format: json
```

This creates entries in both config files. Here's what they look like.

The credentials file stores your keys.

```ini
# ~/.aws/credentials

[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[staging]
aws_access_key_id = AKIA_STAGING_KEY
aws_secret_access_key = staging_secret_key

[production]
aws_access_key_id = AKIA_PROD_KEY
aws_secret_access_key = prod_secret_key
```

The config file stores everything else.

```ini
# ~/.aws/config

[default]
region = us-east-1
output = json

[profile staging]
region = us-east-1
output = json

[profile production]
region = us-east-1
output = table
```

Notice that in the config file, named profiles are prefixed with `profile `, but in the credentials file they're not. This inconsistency is a common gotcha.

## Using Named Profiles

There are three ways to use a named profile:

### Option 1: The --profile flag

```bash
# List S3 buckets in the staging account
aws s3 ls --profile staging

# Describe EC2 instances in production
aws ec2 describe-instances --profile production

# Deploy a CloudFormation stack to staging
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name my-app \
  --profile staging
```

### Option 2: The AWS_PROFILE environment variable

```bash
# Set the active profile for the current shell session
export AWS_PROFILE=staging

# Now all commands use the staging profile without --profile
aws s3 ls
aws ec2 describe-instances

# Switch to production
export AWS_PROFILE=production
```

### Option 3: The AWS_DEFAULT_PROFILE environment variable

```bash
# Similar to AWS_PROFILE, but lower priority
export AWS_DEFAULT_PROFILE=staging
```

`AWS_PROFILE` takes precedence over `AWS_DEFAULT_PROFILE`. The `--profile` flag overrides both.

## Advanced Profile Configurations

### Assume Role Profiles

Instead of storing long-term credentials for every account, you can configure profiles that assume a role in another account. You authenticate with one set of credentials, and the CLI automatically handles the STS AssumeRole call.

```ini
# ~/.aws/config

[profile dev]
region = us-east-1
output = json

[profile staging]
role_arn = arn:aws:iam::222222222222:role/CrossAccountAdmin
source_profile = dev
region = us-east-1

[profile production]
role_arn = arn:aws:iam::333333333333:role/CrossAccountAdmin
source_profile = dev
region = us-east-1
mfa_serial = arn:aws:iam::111111111111:mfa/myuser
```

With this setup, your `dev` profile has the actual credentials. The `staging` and `production` profiles use those credentials to assume a role in another account. The `production` profile also requires MFA (more on that in our [MFA authentication guide](https://oneuptime.com/blog/post/aws-cli-mfa-authentication/view)).

### Region-Specific Profiles

Create profiles for the same account but different regions.

```ini
# ~/.aws/config

[profile myapp-us]
region = us-east-1
output = json

[profile myapp-eu]
region = eu-west-1
output = json

[profile myapp-ap]
region = ap-southeast-1
output = json
```

```ini
# ~/.aws/credentials
# All profiles use the same credentials

[myapp-us]
aws_access_key_id = AKIA_MYAPP_KEY
aws_secret_access_key = myapp_secret

[myapp-eu]
aws_access_key_id = AKIA_MYAPP_KEY
aws_secret_access_key = myapp_secret

[myapp-ap]
aws_access_key_id = AKIA_MYAPP_KEY
aws_secret_access_key = myapp_secret
```

Or more elegantly, use a source profile to avoid duplicating credentials.

```ini
# ~/.aws/config

[profile myapp]
region = us-east-1

[profile myapp-eu]
source_profile = myapp
region = eu-west-1

[profile myapp-ap]
source_profile = myapp
region = ap-southeast-1
```

### Custom Endpoints

For working with LocalStack, MinIO, or other AWS-compatible services.

```ini
# ~/.aws/config

[profile localstack]
region = us-east-1
output = json
endpoint_url = http://localhost:4566
```

```ini
# ~/.aws/credentials

[localstack]
aws_access_key_id = test
aws_secret_access_key = test
```

## Profile Management Shell Functions

Add these to your `.bashrc` or `.zshrc` for easier profile switching.

```bash
# Quick profile switcher
awsp() {
  if [ -z "$1" ]; then
    echo "Current profile: ${AWS_PROFILE:-default}"
    echo ""
    echo "Available profiles:"
    grep '\[profile ' ~/.aws/config | sed 's/\[profile /  /g' | sed 's/\]//g'
    echo "  default"
  else
    export AWS_PROFILE="$1"
    echo "Switched to profile: $1"
    # Show the account ID to confirm
    aws sts get-caller-identity --query "Account" --output text 2>/dev/null || echo "Could not verify credentials"
  fi
}

# Tab completion for the awsp function (bash)
_awsp_completions() {
  local profiles=$(grep '\[profile ' ~/.aws/config | sed 's/\[profile //g' | sed 's/\]//g')
  COMPREPLY=($(compgen -W "$profiles default" "${COMP_WORDS[1]}"))
}
complete -F _awsp_completions awsp

# Show current profile in your shell prompt
aws_prompt() {
  if [ -n "$AWS_PROFILE" ]; then
    echo " [aws:$AWS_PROFILE]"
  fi
}
# Add to PS1: export PS1="\u@\h \w$(aws_prompt) $ "
```

## Verifying Which Profile Is Active

Always verify before running destructive commands.

```bash
# Check current identity
aws sts get-caller-identity
# {
#     "UserId": "AIDAIOSFODNN7EXAMPLE",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/myuser"
# }

# Check with a specific profile
aws sts get-caller-identity --profile production
```

## Security Best Practices

1. **Never commit credentials to git.** Add `~/.aws/` to your global gitignore.
2. **Use assume-role profiles** instead of long-term credentials for each account.
3. **Require MFA for production profiles.** Add `mfa_serial` to sensitive profiles.
4. **Rotate access keys regularly.** Use `aws iam create-access-key` and `aws iam delete-access-key`.
5. **Consider using [SSO profiles](https://oneuptime.com/blog/post/aws-cli-sso-profiles/view)** instead of IAM access keys entirely.
6. **Set file permissions** on your credentials file.

```bash
# Restrict permissions on credentials file
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config
```

## Common Issues

**"The config profile (xyz) could not be found"** - Check that the profile name matches exactly. Remember the `profile ` prefix in the config file.

**Wrong account for default profile** - Unset any profile environment variables: `unset AWS_PROFILE AWS_DEFAULT_PROFILE`

**Credentials not found** - Check the credential resolution order: environment variables > config files > instance metadata

## Wrapping Up

Named profiles are foundational to working efficiently with AWS. Set them up early, use descriptive names (account name + environment works well), and always verify which profile you're using before running commands. The couple of minutes spent setting up profiles saves you from the inevitable "I just ran that against production" mistake that haunts every AWS practitioner at some point.
