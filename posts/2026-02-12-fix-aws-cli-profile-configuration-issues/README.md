# How to Fix AWS CLI Profile Configuration Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, Configuration, Troubleshooting

Description: Resolve common AWS CLI profile configuration problems including credential file errors, named profile issues, SSO configuration, and environment variable conflicts.

---

The AWS CLI profile system is powerful but has a few quirks that trip people up. Whether it's credentials not being picked up, the wrong profile being used, or SSO tokens expiring, profile configuration issues are something every AWS user runs into eventually. Let's go through the common problems and their fixes.

## How AWS CLI Credentials Work

The CLI looks for credentials in this order (first match wins):

1. Command-line options (`--profile`, `--region`)
2. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_PROFILE`)
3. Credentials file (`~/.aws/credentials`)
4. Config file (`~/.aws/config`)
5. Container credentials (ECS)
6. Instance profile (EC2)

Understanding this order is key to debugging most profile issues.

## Problem 1: Wrong Profile Being Used

If you're getting unexpected results, you might be using a different profile than you think. Check which identity is being used.

```bash
# See which AWS identity the CLI is currently using
aws sts get-caller-identity
```

This tells you the account, user/role ARN, and user ID. If it's not what you expected, check for environment variables that might be overriding your profile.

```bash
# Check for AWS environment variables
env | grep AWS_
```

Common culprits include:
- `AWS_PROFILE` set to a different profile
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` set directly
- `AWS_DEFAULT_PROFILE` from an older CLI version

Clear them if they're causing problems.

```bash
# Unset all AWS credential environment variables
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN
unset AWS_PROFILE
unset AWS_DEFAULT_PROFILE
```

## Problem 2: Named Profile Not Found

When you get `The config profile (myprofile) could not be found`, the profile name in your command doesn't match what's in your config files.

```bash
# List all configured profiles
aws configure list-profiles
```

Check that the profile name matches exactly (it's case-sensitive). Then look at the actual configuration.

```bash
# Show the current configuration for a specific profile
aws configure list --profile myprofile
```

Profiles are defined in two files. Here's the correct format for each.

The credentials file at `~/.aws/credentials`:

```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[myprofile]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

The config file at `~/.aws/config`:

```ini
[default]
region = us-east-1
output = json

[profile myprofile]
region = us-west-2
output = table
```

Notice the important difference: in the credentials file, profile sections are just `[myprofile]`. In the config file, they're `[profile myprofile]`. The default profile is `[default]` in both files. Getting this syntax wrong is a very common mistake.

## Problem 3: Credentials File Permissions

On Linux and macOS, if your credentials file has overly permissive permissions, the CLI might refuse to use it or other users could read your secrets.

```bash
# Check current permissions on AWS config files
ls -la ~/.aws/

# Set correct permissions
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config
chmod 700 ~/.aws/
```

## Problem 4: SSO Profile Configuration

AWS SSO (now called IAM Identity Center) profiles require specific configuration. A common issue is the SSO token expiring or the profile being configured incorrectly.

Here's the correct SSO profile format in `~/.aws/config`.

```ini
[profile sso-dev]
sso_start_url = https://mycompany.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
region = us-east-1
output = json
```

To log in and get a fresh token:

```bash
# Log in to AWS SSO to get a fresh token
aws sso login --profile sso-dev

# Verify the identity
aws sts get-caller-identity --profile sso-dev
```

If the token expires (they typically last 8 hours), just run `aws sso login` again.

For the newer SSO session format that shares tokens across profiles:

```ini
[sso-session my-sso]
sso_start_url = https://mycompany.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access

[profile sso-dev]
sso_session = my-sso
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
region = us-east-1
```

## Problem 5: Assume Role Configuration

If you need to assume a role, the profile configuration needs a `source_profile` or `credential_source`.

```ini
[profile base-account]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[profile cross-account-role]
role_arn = arn:aws:iam::987654321098:role/CrossAccountRole
source_profile = base-account
region = us-east-1
```

Common issues with assume role:
- The source profile credentials are wrong or expired
- The role ARN is incorrect
- The role's trust policy doesn't allow the source identity to assume it
- MFA is required but not configured

If the role requires MFA, add the MFA serial.

```ini
[profile mfa-role]
role_arn = arn:aws:iam::987654321098:role/MFAProtectedRole
source_profile = base-account
mfa_serial = arn:aws:iam::123456789012:mfa/myuser
region = us-east-1
```

The CLI will prompt you for the MFA code when you use this profile.

## Problem 6: Region Not Configured

If you get `You must specify a region` errors, the profile doesn't have a default region set.

```bash
# Set the default region for a profile
aws configure set region us-east-1 --profile myprofile

# Or set it as an environment variable
export AWS_DEFAULT_REGION=us-east-1
```

## Problem 7: Credential Process Configuration

For advanced setups where credentials come from an external program, use `credential_process`.

```ini
[profile custom-creds]
credential_process = /path/to/credential-helper --arg1 value1
region = us-east-1
```

The program must output JSON in this format:

```json
{
  "Version": 1,
  "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "SessionToken": "optional-session-token",
  "Expiration": "2026-02-12T12:00:00Z"
}
```

If the credential process fails silently, test it directly.

```bash
# Test the credential process command directly
/path/to/credential-helper --arg1 value1
```

## Debugging CLI Configuration

The CLI has a built-in debug mode that shows exactly where it's getting credentials from.

```bash
# Run any CLI command with debug output to see credential resolution
aws sts get-caller-identity --debug 2>&1 | grep -i "credential\|profile\|config"
```

This shows which files are being read, which profile is being used, and where the credentials are coming from.

## Troubleshooting Checklist

1. Run `aws sts get-caller-identity` to see current identity
2. Check for interfering environment variables with `env | grep AWS_`
3. Verify profile name matches exactly in config files
4. Confirm the correct syntax (`[profile name]` in config, `[name]` in credentials)
5. Check file permissions (600 for files, 700 for directory)
6. For SSO, run `aws sso login` to refresh the token
7. For assume role, verify the source profile and role trust policy
8. Use `--debug` to trace credential resolution

Getting your CLI profiles right is foundational to working with AWS. Once the configuration is solid, you can manage multiple accounts and roles seamlessly. For the next step, check out our guide on [using AWS CloudShell](https://oneuptime.com/blog/post/2026-02-12-setup-aws-cloudshell-quick-command-line-access/view) when you need quick CLI access without any local setup.
