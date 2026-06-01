# Validation Summary: How to Write Snapshot Tests for CDK Stacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- CDK assertions library
- Jest snapshot testing
- TypeScript
- CloudFormation templates

## Sources Consulted
- AWS CDK v2 API Reference: Template assertions API: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
- AWS CDK v2 Developer Guide: Testing CDK applications: https://docs.aws.amazon.com/cdk/v2/guide/testing.html
- AWS CDK v2 Developer Guide: Stack synthesis and deterministic logical ID hashes: https://docs.aws.amazon.com/cdk/v2/guide/configure-synth.html
- AWS CDK v2 Developer Guide: Assets and source hashes: https://docs.aws.amazon.com/cdk/v2/guide/assets.html
- Jest CLI Options: https://jestjs.io/docs/cli
- Jest Snapshot Testing guide: https://jestjs.io/docs/snapshot-testing
- Jest Configuration: snapshotSerializers: https://jestjs.io/docs/configuration

## Issues Found
- The post described CDK asset hashes, logical ID hash suffixes, and timestamps as values that change on every synthesis. AWS CDK documentation states logical ID hash generation is deterministic and remains the same across synthesis unless construct IDs or paths change, and asset hashes are based on asset contents. Updated the wording to explain that these values are usually stable but can change when inputs, bundling output, construct paths, or environment-specific dynamic values change.
- The command for filtering snapshot updates used `--testPathPattern`. Current Jest CLI documentation lists `--testPathPatterns`. Updated the command to `npm test -- --testPathPatterns snapshot -u`.

## Review Notes
The CDK assertion examples use current `aws-cdk-lib/assertions` APIs such as `Template.fromStack`, `Template.toJSON`, `Template.findResources`, `Template.hasResourceProperties`, and `Match` matchers. Jest snapshot usage with `toMatchSnapshot`, `--updateSnapshot`, `-u`, and `snapshotSerializers` is consistent with current Jest documentation.
