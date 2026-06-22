# Validation Summary: How to Install and Configure AWS CLI on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CLI v2
- Ubuntu (20.04 / 22.04 / 24.04)
- AWS IAM (users, roles, policies, instance profiles, MFA)
- Amazon S3, EC2, Lambda, RDS, CloudWatch, CloudTrail, CloudFront
- AWS STS (get-session-token, assume-role, get-caller-identity)
- AWS Systems Manager Session Manager (+ plugin)
- JMESPath (`--query`)
- Bash/Zsh shell completion, fzf

## Sources Consulted
- AWS CLI v2 install/update guide (https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) — install/update/uninstall commands, x86_64 and aarch64 download URLs
- AWS CLI configuration & credential precedence (https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html, .../cli-configure-files.html, .../cli-configure-envvars.html)
- AWS CLI named profiles & role assumption with MFA (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html)
- AWS STS `get-session-token` reference (https://docs.aws.amazon.com/cli/latest/reference/sts/get-session-token.html) — duration limits
- AWS CLI binary format change in v2 (https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration-changes.html) — `--cli-binary-format raw-in-base64-out`
- Session Manager plugin install for Ubuntu (https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-debian-and-ubuntu.html)
- IAM roles for EC2 / instance profiles (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html)

## Issues Found
- **`get-session-token` duration mislabeled as max (line ~839).** The script comment read `DURATION_SECONDS=43200  # 12 hours (max for session tokens)`. 43200 seconds (12 hours) is the *default* for `aws sts get-session-token`; the maximum for IAM user sessions is 129,600 seconds (36 hours) (root account sessions are capped at 1 hour). Changed the comment to `# 12 hours (default; IAM users can request up to 129600s / 36 hours)` for accuracy. The chosen value of 43200 itself is valid, so no code behavior changed.

## Review Notes
- The high-level `aws s3` commands (e.g., `aws s3 ls`) do **not** honor the `--output table`/`--output json` global option — only the low-level `aws s3api` commands and other services respect `--output`. The examples `aws s3 ls --output table` (Table Format section) and `aws s3 ls --output json` (Setting Default Output Format) run without error but their output is unaffected by the flag. Left as-is since the commands are not broken, but worth tightening in a future revision (e.g., use `aws s3api list-buckets --output table`).
- The "Environment Variable Precedence" list is a correct simplification. The full AWS CLI precedence chain also includes assume-role/web-identity, IAM Identity Center (SSO), and `credential_process` entries between the file-based and instance-profile sources; the ordering shown is accurate as far as it goes.
- The Best Practices alias named `bucket-sizes` actually lists bucket *names* (`s3api list-buckets --query 'Buckets[].Name'`), not sizes. Cosmetic naming mismatch only; not a technical error.
- Install URLs (`awscli-exe-linux-x86_64.zip`, `awscli-exe-linux-aarch64.zip`), the Session Manager plugin `.deb` URL, install/update/uninstall steps, IAM role + instance-profile workflow, `--cli-binary-format raw-in-base64-out` note for Lambda, MFA `mfa_serial`/`source_profile` config, JMESPath `--query` examples, and the shell-completion setup were all verified as correct and current for AWS CLI v2.
