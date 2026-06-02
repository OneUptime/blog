# Validation Summary: How to Set Up AWS AppConfig for Feature Flags

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS AppConfig
- AWS AppConfig feature flags
- AWS CLI
- AWS AppConfig Agent
- Python
- Node.js
- JSON Schema
- AWS Lambda validators

## Sources Consulted
- AWS AppConfig User Guide: Creating a feature flag configuration profile (command line) - https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-feature-flag-configuration-commandline.html
- AWS AppConfig User Guide: Understanding the type reference for AWS.AppConfig.FeatureFlags - https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-type-reference-feature-flags.html
- AWS AppConfig User Guide: How to use AWS AppConfig Agent to retrieve configuration data - https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-agent-how-to-use.html
- AWS AppConfig User Guide: Retrieving basic and multi-variant feature flags - https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-retrieving-feature-flags.html
- AWS AppConfig User Guide: Understanding validators - https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile-validators.html
- AWS CLI Command Reference: appconfig create-hosted-configuration-version - https://docs.aws.amazon.com/cli/latest/reference/appconfig/create-hosted-configuration-version.html
- AWS CLI Command Reference: appconfig create-deployment-strategy - https://docs.aws.amazon.com/cli/latest/reference/appconfig/create-deployment-strategy.html

## Issues Found
- The `create-hosted-configuration-version` example used `file://feature-flags.json` without AWS CLI v2's `--cli-binary-format raw-in-base64-out` option and omitted the required output file argument. Added both so the command works with JSON file input as documented by AWS.
- The gradual deployment strategy explanation depended on linear growth, but the command did not specify `--growth-type`. Added `--growth-type "LINEAR"` to make the behavior explicit.
- The validator section claimed JSON Schema validators apply to feature flags and showed a `JSON_SCHEMA` validator on an `AWS.AppConfig.FeatureFlags` profile. AWS documents JSON Schema validators for freeform configurations and says feature flags are automatically validated against the feature flag schema. Updated the section to use a Lambda validator for custom feature flag validation.
- The Lambda validator parsed `event['content']` directly as JSON. AWS AppConfig sends validator Lambda content as a base64-encoded string, so the example now base64-decodes the content before parsing JSON.

## Review Notes
The AppConfig Agent examples use the documented localhost endpoint and return the simplified feature flag JSON shape. For more advanced user targeting, AWS AppConfig Agent also supports entity-based gradual deployments with an `Entity-Id` header in recent agent versions.
