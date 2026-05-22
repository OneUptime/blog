# Validation Summary: How to Publish CDKTF Constructs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform AWS provider
- TypeScript
- constructs
- npm package publishing
- Projen
- Jest
- jsii and jsii-pacmak
- GitHub Actions

## Sources Consulted
- HashiCorp CDKTF Construct Design: https://developer.hashicorp.com/terraform/cdktf/develop-custom-constructs/construct-design
- HashiCorp CDKTF Construct Publishing and Distribution: https://developer.hashicorp.com/terraform/cdktf/develop-custom-constructs/publishing-and-distribution
- HashiCorp CDKTF Providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- CDKTF npm package declarations for `Testing`: https://www.npmjs.com/package/cdktf
- CDKTF AWS provider npm package declarations for S3 resources: https://www.npmjs.com/package/@cdktf/provider-aws
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- npm scoped public package publishing docs: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/
- jsii configuration overview: https://aws.github.io/jsii/user-guides/lib-author/configuration/
- jsii quick start setup: https://aws.github.io/jsii/user-guides/lib-author/quick-start/set-up/
- jsii Python target configuration: https://aws.github.io/jsii/user-guides/lib-author/configuration/targets/python/
- jsii Java target configuration: https://aws.github.io/jsii/user-guides/lib-author/configuration/targets/java/
- jsii Go target configuration: https://aws.github.io/jsii/user-guides/lib-author/configuration/targets/go/
- GitHub Actions `setup-node` action: https://github.com/actions/setup-node

## Issues Found
- The post presented CDKTF construct publishing as current best practice without noting that HashiCorp deprecated CDKTF on December 10, 2025. Added a short caveat and adjusted the closing sentence to target teams maintaining existing CDKTF projects.
- The Projen initialization command used `@cdktf/provider-project`, which scaffolds prebuilt provider package repositories, not construct libraries. Replaced it with the official `npx projen new cdktf-construct` command.
- The manual install commands said the CDKTF and provider packages should be peer dependencies but used plain `npm install`. Updated the command to `npm install --save-peer constructs cdktf @cdktf/provider-aws`.
- The S3 lifecycle example described a default Glacier transition of 90 days but did not implement that default. Updated the comment to say the setting is optional.
- The S3 lifecycle configuration used `expiration` as an object, but the generated CDKTF AWS provider type expects a list. Changed it to `expiration: [{ days: ... }]` and added explicit empty lifecycle filters for all-object rules, matching Terraform AWS provider guidance.
- The Jest tests used CDKTF custom matchers without showing matcher setup and passed string resource types to matcher APIs that expect constructors. Rewrote the assertions to use the documented `Testing.toHaveResource` boolean helper, which accepts Terraform resource type strings.
- The package metadata used older peer dependency ranges. Updated the example to match the current CDKTF 0.21 and AWS provider 21 peer dependency expectations.
- The GitHub Actions workflow used Node.js 20. Updated it to Node.js 22 for a current LTS runtime.
- The jsii section mentioned Python, Java, and Go but only configured Python and Java. Added the Go target configuration and updated the generated package directory example.
- The jsii package snippet omitted metadata/scripts needed for a jsii build flow. Added `stability` and replaced the jsii build/package scripts with `jsii` and `jsii-pacmak`.

## Review Notes
CDKTF and the HashiCorp CDKTF documentation are deprecated as of December 10, 2025, but the construct publishing workflow remains technically relevant for existing CDKTF users. Future revisions should consider whether this post should be reframed as maintenance guidance or migrated toward Terraform modules/OpenTofu-compatible alternatives.
