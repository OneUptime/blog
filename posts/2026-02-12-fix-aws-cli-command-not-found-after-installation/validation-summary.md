# Validation Summary: How to Fix AWS CLI 'Command Not Found' After Installation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS CLI v2
- AWS CLI v1
- macOS
- Linux
- Windows PowerShell
- Docker
- GitHub Actions
- Python pip
- Shell PATH and symlinks

## Sources Consulted
- AWS CLI User Guide: Installing or updating to the latest version of the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- AWS CLI User Guide: Installing AWS CLI version 2 from AWS CLI version 1 - https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration-instructions.html
- AWS CLI v1 User Guide: Installing, updating, and uninstalling the AWS CLI version 1 on macOS - https://docs.aws.amazon.com/cli/v1/userguide/install-macos.html
- AWS CLI User Guide: Configuring command completion in the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-completion.html
- AWS DevOps & Developer Productivity Blog: Introducing universal installers for AWS CLI v2 on macOS - https://aws.amazon.com/blogs/devops/introducing-universal-installers-for-aws-cli-v2-on-macos/

## Issues Found
- The macOS section used the Linux ZIP installer layout (`/usr/local/aws-cli/v2/current/bin/aws`) for the macOS package installer. Updated the check and symlink commands to use the macOS package installer paths (`/usr/local/aws-cli/aws` and `/usr/local/aws-cli/aws_completer`) documented by AWS.
- The Apple silicon statement said the CLI distributes a universal binary without a version caveat. Updated it to note that universal macOS installer support starts with AWS CLI v2 version 2.30.0.
- The Docker and reinstall snippets used the Linux x86_64 AWS CLI ZIP download while presenting the examples as generic. Labeled those examples as x86_64-specific to avoid implying they work unchanged on Linux ARM.

## Review Notes
The remaining commands and explanations match AWS's documented installer behavior, PATH troubleshooting guidance, v1/v2 migration behavior, and pip-based AWS CLI v1 path guidance. Future improvements could add separate Linux ARM download examples, but the current x86_64 labels make the existing snippets technically accurate.
