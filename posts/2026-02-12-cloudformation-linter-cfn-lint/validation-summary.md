# Validation Summary: How to Use CloudFormation Linter (cfn-lint)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- cfn-lint
- Python / pip
- Docker
- YAML configuration
- GitHub Actions
- SARIF
- AWS SAM transforms
- Vim/Neovim ALE

## Sources Consulted
- cfn-lint official GitHub README: https://github.com/aws-cloudformation/cfn-lint
- cfn-lint official custom rules documentation: https://github.com/aws-cloudformation/cfn-lint/blob/main/docs/custom_rules.md
- cfn-lint PyPI package metadata: https://pypi.org/project/cfn-lint/
- AWS SAM documentation for cfn-lint validation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/validate-cfn-lint.html
- cfn-lint 1.51.3 local CLI help and command output

## Issues Found
- Updated the supported Python version from Python 3.8+ to Python 3.10 through 3.14, matching current cfn-lint package metadata and official install guidance.
- Corrected the Docker section. The post claimed an official Docker image was available, but the official repository documents building `cfn-lint:latest` from the repository Dockerfile before running it.
- Updated the sample lint output for current cfn-lint. The invalid S3 property still reports `E3002`, but the message text changed, and the missing EC2 `ImageId` now reports as `E3673`.
- Corrected the configuration-file lookup wording. cfn-lint checks `.cfnlintrc`, `.cfnlintrc.yaml`, or `.cfnlintrc.yml` in the current working directory, then `~/.cfnlintrc`.
- Corrected the inline suppression example so `W3045` suppresses the actual S3 `AccessControl` legacy-property warning instead of being attached to an unrelated hardcoded bucket name example.
- Clarified that Python rule classes are appended rules for advanced custom checks; cfn-lint also supports one-line custom rule files with `-z/--custom-rules`.
- Narrowed the Python custom rule example to selected taggable resource types so it does not claim to detect every taggable CloudFormation resource.
- Corrected SARIF output usage from `-o results.sarif` to `--output-file results.sarif`; `-o` is for override specs in current cfn-lint. Also added the `cfn-lint[sarif]` optional dependency needed for SARIF output.
- Updated the GitHub Actions recursive glob example to enable bash `globstar`, as cfn-lint's official docs note that recursive shell globs require shell support.
- Adjusted the intrinsic-function explanation to describe cfn-lint's validation as best-effort, matching the official warning about complex intrinsic values.

## Review Notes
The post is now technically accurate for current cfn-lint behavior as of cfn-lint 1.51.3. Future updates may need to revisit the exact supported Python range and rule IDs because cfn-lint rule mappings and package metadata change over time.
