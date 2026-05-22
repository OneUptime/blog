# Validation Summary: How to Test CDKTF Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- CDK for Terraform (CDKTF)
- TypeScript
- Jest
- ts-jest
- Terraform AWS Provider
- GitHub Actions

## Sources Consulted
- HashiCorp CDKTF Unit Tests documentation: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- HashiCorp CDKTF TypeScript API reference: https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript/classes
- CDKTF npm package type definitions for `cdktf@0.21.0`: https://www.npmjs.com/package/cdktf
- Terraform JSON Configuration Syntax: https://developer.hashicorp.com/terraform/language/syntax/json
- Terraform AWS Provider `aws_s3_bucket_server_side_encryption_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Jest getting started and snapshot testing documentation: https://jestjs.io/docs/getting-started and https://jestjs.io/docs/snapshot-testing
- ts-jest installation documentation: https://kulshekhar.github.io/ts-jest/docs/getting-started/installation
- GitHub Actions `actions/setup-node` documentation: https://github.com/actions/setup-node

## Issues Found
- The post used Jest custom matchers such as `expect(synthesized).toHaveResource("aws_s3_bucket")` with Terraform resource type strings. In current CDKTF, the Jest matcher overload expects a Terraform constructor with `tfResourceType`; string resource types are supported by the static `Testing.toHaveResource` and `Testing.toHaveResourceWithProperties` helpers. Updated the examples to use `expect(Testing.toHaveResource(...)).toBe(true)` and related static helpers.
- The post stated that common testing frameworks work out of the box. CDKTF's TypeScript Jest matchers require explicit setup, while the static `Testing` helpers can be asserted by any test framework. Reworded the claim to say standard frameworks can assert against synthesized output.
- The setup section installed `cdktf` as a dev dependency solely for testing utilities. In a real CDKTF project, `cdktf` is already a project dependency because application code imports it. Reworded the command and comment to avoid implying CDKTF is only a test utility.
- The introduction said the guide covered unit, snapshot, and integration testing, but the body focuses on unit and snapshot tests and only mentions integration tests as a separate pipeline concern. Reworded the sentence to match the actual coverage.
- The post did not mention CDKTF's current lifecycle status. HashiCorp documentation states CDKTF was deprecated on December 10, 2025 and is no longer maintained. Added a concise note while preserving the post's testing guidance.
- The custom construct section said constructs can be tested without a full stack, but the example still requires a minimal `TerraformStack`. Reworded it to say without instantiating the full application stack.

## Review Notes
The examples are illustrative and depend on user-defined `MyStack`, `SecureBucket`, `ApplicationStack`, and `NetworkStack` classes. Those names are acceptable placeholders for a guide. The AWS resource names and properties checked in the examples match the current Terraform AWS Provider resource/data source naming.
