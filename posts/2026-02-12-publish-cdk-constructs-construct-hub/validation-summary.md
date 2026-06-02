# Validation Summary: How to Publish CDK Constructs to Construct Hub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Construct Hub
- jsii
- jsii-pacmak
- jsii-diff
- Projen
- npm
- PyPI / Twine
- Maven Central
- GitHub Actions
- TypeScript

## Sources Consulted
- jsii configuration reference: https://aws.github.io/jsii/user-guides/lib-author/configuration/
- jsii Go target configuration: https://aws.github.io/jsii/user-guides/lib-author/configuration/targets/go/
- jsii Python target configuration: https://aws.github.io/jsii/user-guides/lib-author/configuration/targets/python/
- jsii TypeScript restrictions: https://aws.github.io/jsii/user-guides/lib-author/typescript-restrictions/
- jsii features and supported target languages: https://aws.github.io/jsii/overview/features/
- AWS CDK RDS IDatabaseCluster API reference: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/IDatabaseCluster.html
- AWS CDK CloudWatch Alarm API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html
- AWS CDK CloudWatch Actions documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch_actions-readme.html
- Construct Hub FAQ / eligibility information: https://constructs.dev/faq
- npm package metadata queried with `npm view` for `jsii`, `jsii-pacmak`, `jsii-diff`, and `projen`
- CLI help output checked with `npx projen --help`, `npx jsii --help`, and `npx jsii-pacmak --help`

## Issues Found
- The post said a TypeScript construct "automatically becomes available" in Python, Java, C#, and Go. Updated the wording to say it can be packaged for those languages, because jsii requires configured targets and generated/published artifacts for non-TypeScript package managers.
- The post implied publishing to npm alone was enough for Construct Hub. Updated the wording to specify a public, JSII-compatible npm package with a supported open-source license and a CDK keyword such as `aws-cdk`.
- The sample `package.json` keywords did not include a Construct Hub CDK keyword. Added `aws-cdk`.
- The text mentioned Go support, but the `jsii.targets` example did not configure a Go target. Added a valid `go` target with `moduleName` and `packageName`.
- The sample `compat` script used `jsii-diff`, but `jsii-diff` was not listed in `devDependencies`. Added it.
- The sample `test` script used `jest`, but `jest` was not listed in `devDependencies`. Added it.
- The `alarmNamePrefix` JSDoc said the default was the cluster identifier, but the code defaults to `"Aurora"`. Corrected the JSDoc.
- The Construct Hub indexing timeline said "within a few hours." Updated it to "usually in about 30 minutes" to match Construct Hub's published FAQ wording.
- The Python publish command uploaded only source tarballs. Changed it to upload all generated Python artifacts from `dist/python/*`.
- The jsii compatibility section said exported type aliases "won't work." Updated it to say they are de-sugared in non-TypeScript languages, matching jsii's documented behavior.
- The jsii compatibility section broadly warned against `Record`, but jsii supports `Record<string, T>`. Updated the warning to target unsupported `Pick`, `Omit`, and custom generic utility types.
- The jsii compatibility section claimed default exports "won't work with jsii." Reworded it as guidance to avoid default exports for the public construct API.

## Review Notes
The CDK construct example uses current AWS CDK v2 APIs for `IDatabaseCluster` metrics, CloudWatch alarms, SNS alarm actions, dashboards, and graph widgets. The example still declares threshold fields for memory and read latency that are not used by the sample alarms; this is not a syntax or API error, but it would be better to either implement those alarms or remove those fields in a future content pass.
