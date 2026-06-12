# Validation Summary: How to Test Pulumi Programs

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Pulumi IaC
- Pulumi mocks and unit testing
- Pulumi Automation API
- Pulumi CrossGuard policy packs
- Pulumi CLI policy commands
- AWS Pulumi provider
- TypeScript / JavaScript
- Python
- Go
- C#
- GitHub Actions

## Sources Consulted
- Pulumi Unit Testing guide: https://www.pulumi.com/docs/iac/guides/testing/unit/
- Pulumi Automation API guide: https://www.pulumi.com/docs/iac/guides/building-extending/automation-api/
- Pulumi Automation API concepts: https://www.pulumi.com/docs/iac/concepts/automation-api/
- Pulumi Policy CLI reference: https://www.pulumi.com/docs/insights/policy/cli/
- Pulumi `pulumi policy` CLI reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_policy/
- Pulumi `pulumi policy analyze` CLI reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_policy_analyze/
- Pulumi `pulumi policy publish` CLI reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_policy_publish/
- Pulumi policy pack authoring docs: https://www.pulumi.com/docs/insights/policy/policy-packs/authoring/
- Pulumi AWS S3 Bucket docs: https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucket/
- Pulumi AWS S3 BucketVersioning docs: https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketversioning/
- Pulumi AWS S3 BucketServerSideEncryptionConfiguration docs: https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketserversideencryptionconfiguration/
- Pulumi AWS S3 BucketPublicAccessBlock docs: https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketpublicaccessblock/
- Pulumi GitHub Actions docs: https://www.pulumi.com/docs/iac/operations/continuous-delivery/github-actions/
- Pulumi GitHub Action README: https://github.com/pulumi/actions
- Deprecated Pulumi setup action README: https://github.com/pulumi/setup-pulumi
- Codecov GitHub Action Marketplace page: https://github.com/marketplace/actions/codecov

## Issues Found
- The TypeScript S3 unit test asserted deprecated inline `aws.s3.Bucket` properties (`versioning`, lifecycle fields, and public access fields on the bucket). Updated the example to assert dedicated resources: `BucketVersioning`, `BucketPublicAccessBlock`, and `BucketLifecycleConfiguration`.
- The Go S3 unit test used deprecated inline bucket properties and did not wait for `ApplyT` callbacks before completing. Updated it to assert dedicated S3 configuration resources and added `sync.WaitGroup` waits for asynchronous output assertions.
- The TypeScript property test attempted to access `tags?.Name` directly on Pulumi `Output` values. Updated it to resolve the tags output before reading the `Name` key.
- The Automation API integration test comment described an inline program, but the code uses `workDir` for a local Pulumi program. Corrected the comment.
- The CrossGuard S3 encryption policy checked the deprecated inline bucket encryption property. Updated it to validate `aws.s3.BucketServerSideEncryptionConfiguration` rules.
- The policy command `pulumi policy validate ./policy --stack dev` is not a current Pulumi CLI command. Replaced it with `pulumi policy analyze --stack dev --policy-pack ./policy`.
- The policy publish command passed the policy directory as a positional argument. Updated it to use `pulumi policy publish --cwd ./policy`, matching the documented CLI shape.
- The C# example used LINQ without importing `System.Linq` and called `GetValueAsync()` without defining the helper extension. Added the import and helper, following Pulumi's unit testing documentation.
- The CI example used deprecated `pulumi/setup-pulumi@v2`. Updated installation-only steps to `pulumi/actions@v7`.
- The CI example used an older `codecov/codecov-action@v3`. Updated it to `codecov/codecov-action@v5`, which uses the newer Codecov wrapper/CLI path documented by Codecov.

## Review Notes
The examples remain illustrative and assume matching infrastructure exports such as `dataBucketVersioning` or `DataBucketEncryption`. In a real repository, exact exported names should be aligned with the Pulumi program under test.
