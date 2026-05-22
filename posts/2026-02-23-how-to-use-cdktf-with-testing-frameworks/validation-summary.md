# Validation Summary: How to Use CDKTF with Testing Frameworks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform
- TypeScript
- Jest
- ts-jest
- AWS CDKTF provider resources
- GitHub Actions
- Codecov

## Sources Consulted
- HashiCorp Developer: CDK for Terraform Unit Tests, https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- HashiCorp Developer: CDK for Terraform overview, https://developer.hashicorp.com/terraform/cdktf
- CDKTF npm package metadata and TypeScript definitions for cdktf 0.21.0, https://www.npmjs.com/package/cdktf
- Jest CLI documentation, https://jestjs.io/docs/cli
- Jest configuration documentation, https://jestjs.io/docs/configuration
- Codecov file search and GitHub Action examples, https://docs.codecov.com/docs/file-search

## Issues Found
- CDKTF is now deprecated. Added a note that HashiCorp deprecated CDKTF on December 10, 2025 and no longer supports or maintains it, so readers understand the current status.
- The examples used Jest CDKTF matchers with raw Terraform resource type strings, such as `expect(synthesized).toHaveResource("aws_vpc")`. In CDKTF 0.21.0, the Jest matcher typings expect Terraform constructor classes, while the `Testing.toHaveResource*` static helpers accept resource type strings. Updated the examples to use `Testing.toHaveResource`, `Testing.toHaveResourceWithProperties`, and `Testing.toHaveDataSource` with Jest's built-in `toBe(true)`.
- The `Testing.fullSynth()` comment said it included `terraform init`. CDKTF 0.21.0 returns a temporary synthesized output directory. Updated the comment and variable name accordingly.
- The snapshot example imported `MyStack` but used `NetworkStack` and `ApplicationStack`. Updated the imports to match the code shown.
- The parameterized multi-AZ test did not assert anything for the disabled case. Added an assertion that no synthesized database instance has `multi_az: true` when multi-AZ is disabled.
- The CI example used `codecov/codecov-action@v3`. Updated it to `codecov/codecov-action@v5`, matching current Codecov documentation.
- The closing statement called CDKTF a production-grade tool, which is misleading now that CDKTF is deprecated and unsupported. Reworded it to focus on making CDKTF infrastructure changes easier to review.

## Review Notes
The examples remain illustrative and depend on project-specific stacks and constructs such as `NetworkStack`, `ApplicationStack`, `SecureBucket`, and `TaggingAspect`. The post now uses CDKTF's string-based static assertion helpers for consistency across examples; projects that prefer CDKTF's Jest matchers can still use them with generated resource classes and `Testing.setupJest()`.
