# Validation Summary: How to Write a CodeBuild buildspec.yml File

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS CodeBuild
- buildspec.yml
- YAML
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- AWS CodePipeline exported variables
- AWS CLI
- Amazon ECR
- Docker
- Node.js, Python, Go, Maven, and Gradle build caching examples

## Sources Consulted
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild build phase transitions: https://docs.aws.amazon.com/codebuild/latest/userguide/view-build-details-phases.html
- AWS CodeBuild environment variables reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html
- AWS CodeBuild runtime versions: https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html
- AWS CodeBuild available runtimes: https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- AWS CLI `codebuild create-project` reference: https://docs.aws.amazon.com/cli/v1/reference/codebuild/create-project.html
- Linked OneUptime CodeBuild project guide: https://oneuptime.com/blog/post/2026-02-12-create-aws-codebuild-projects/view

## Issues Found
- The post said buildspec version `0.2` is mandatory and version `0.1` is deprecated. AWS currently recommends `0.2`, while `0.1` remains supported. Updated the wording to say `0.2` should be used whenever possible and that `0.1` has different behavior.
- The Secrets Manager syntax was presented only as `secret-id:json-key`. AWS documents the full form as `secret-id:json-key:version-stage:version-id`. Updated the explanation while preserving the common short form used in the example.
- The phase failure explanation was too broad. AWS documents `finally` behavior, configurable `on-failure` behavior, and normal phase transitions. Updated the description to avoid implying all later phases are always skipped.
- The `on-failure` comment listed only `ABORT` and `CONTINUE`. AWS also supports `RETRY` variants. Updated the inline comment.
- The first artifacts example placed `secondary-artifacts` at the top level. AWS requires it under `artifacts`. Fixed the indentation and adjusted the nearby comment.
- The Common Gotchas section said each command runs in its own shell. That is true for buildspec version `0.1`, but AWS documents that version `0.2` runs commands in the same shell. Replaced the gotcha with accurate version `0.2` directory-state guidance.
- The Common Gotchas section said Parameter Store variables are unavailable during `install`, but AWS's buildspec reference does not document that limitation. Replaced this with the documented literal replacement behavior for Parameter Store environment variables.
- The cache gotcha said cache paths must use `**/*`. AWS documents multiple path forms, but recursive directory caching requires an appropriate glob. Updated the wording to avoid overstating the requirement.

## Review Notes
The runtime examples using `nodejs: 20` and `python: 3.12`, report formats such as `JUNITXML`, `CLOVERXML`, and `VISUALSTUDIOTRX`, local cache modes, exported variables, and artifact naming examples align with current AWS documentation. Some examples assume an Amazon Linux build image for package installation commands such as `yum`; that is acceptable as an example, but a future revision could note that Ubuntu images use `apt`.
