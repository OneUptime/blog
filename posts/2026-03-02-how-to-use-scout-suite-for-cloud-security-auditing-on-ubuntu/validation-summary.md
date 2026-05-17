# Validation Summary: How to Use Scout Suite for Cloud Security Auditing on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Scout Suite (multi-cloud security auditing tool)
- Ubuntu Linux
- Python 3 (venv, pip)
- AWS CLI and IAM (SecurityAudit policy, STS assume-role)
- AWS services: S3, IAM, EC2 (security groups), CloudTrail, VPC, RDS
- Azure CLI
- Google Cloud SDK (gcloud)
- Bash shell scripting, cron

## Sources Consulted
- Scout Suite GitHub repository: https://github.com/nccgroup/ScoutSuite
- Scout Suite Setup wiki: https://github.com/nccgroup/ScoutSuite/wiki/Setup
- Scout Suite Azure wiki: https://github.com/nccgroup/ScoutSuite/wiki/Azure
- Scout Suite GCP wiki: https://github.com/nccgroup/ScoutSuite/wiki/Google-Cloud-Platform
- Scout Suite source code: `ScoutSuite/core/cli_parser.py` (master branch)
- Scout Suite `setup.py` (master branch) for Python version requirements
- AWS IAM managed policy ARN reference (`arn:aws:iam::aws:policy/SecurityAudit`)
- AWS CLI documentation for `s3api put-public-access-block`, `ec2 describe-security-groups`, `iam get-credential-report`, and `sts assume-role`
- Microsoft Azure CLI install script (`https://aka.ms/InstallAzureCLIDeb`)
- Google Cloud SDK install documentation

## Issues Found
1. **Python version requirement was outdated**
   - The post stated Scout Suite requires Python 3.8 or later. According to Scout Suite's `setup.py` and Setup wiki, supported versions are Python 3.9, 3.10, and 3.11 (minimum 3.9).
   - Updated the prose and the inline comment in the installation block to say "Python 3.9 or later" and "needs 3.9+". Also updated the Ubuntu reference from 20.04 (ships Python 3.8) to 22.04 (ships Python 3.10) so the "ships a compatible Python by default" claim remains accurate.

2. **Azure CLI flag name was wrong**
   - The post used `--subscription-ids` for the Azure subscription option. The actual Scout Suite CLI argument (per `ScoutSuite/core/cli_parser.py`) is `--subscriptions` (the parser uses `dest='subscription_ids'`, but the flag exposed to users is `--subscriptions`).
   - Changed `--subscription-ids <subscription-id>` to `--subscriptions <subscription-id>`.

3. **Invalid `--regions all` value for AWS audit**
   - The post showed `scout aws --services iam s3 vpc cloudtrail --regions all`. The CLI parser defines `--regions` with `nargs='+'` and a default of `[]`, with help text "Name of regions to run the tool in, defaults to all". There is no special `all` value — passing `all` would be interpreted as a region literally named "all" (and would not match a real AWS region). To scan all regions, the flag must be omitted entirely.
   - Removed `--regions all` and updated the inline comment to explain that omitting `--regions` scans all regions.

## Review Notes
- The GCP example `scout gcp --user-account --project-id your-project-id` is correct; `--project-id` (singular) is the actual flag name.
- The IAM `SecurityAudit` managed policy ARN, S3 `put-public-access-block` configuration syntax, EC2 `describe-security-groups` filter names (`ip-permission.from-port`, `ip-permission.cidr`), and STS `assume-role` invocation are all valid as written.
- The `awk` snippet in the "IAM Issues" section that processes the IAM credential report (`$11=="false" && $14 != "N/A"`) is not a literally meaningful filter against the AWS credential report CSV schema — field 11 is `access_key_1_last_used_date` (a date or `N/A`, not `true`/`false`) and field 14 is `access_key_2_active`. It will not reliably identify "unused access keys older than 90 days" as the comment claims. Left untouched because it is a tangential illustrative example rather than a Scout Suite command, but a future revision should rework this snippet (e.g., using `aws iam list-access-keys` + `aws iam get-access-key-last-used` per user, or a Python helper) to actually surface keys unused for 90+ days.
- `sudo apt-get install -y awscli` installs AWS CLI v1 from the Ubuntu archive, which is in maintenance mode. AWS recommends installing AWS CLI v2 via the official bundled installer for new deployments. The post's approach still functions for the commands shown, but a future update could point readers at the v2 installer.
- `sudo apt-get install -y google-cloud-sdk` only works if the Google Cloud apt repository has been added beforehand; a future revision could include the repo setup steps or link to Google's documented install procedure.
- Scout Suite's `scout azure --cli` requires that the user has already authenticated via `az login` (which the post does mention) and that Azure CLI's `azure-identity` token cache is populated, so the ordering in the Azure section is correct.
