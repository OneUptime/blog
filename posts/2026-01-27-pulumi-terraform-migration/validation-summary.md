# Validation Summary: How to Migrate from Terraform to Pulumi

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Pulumi
- Terraform
- AWS infrastructure resources
- TypeScript
- Python scripting
- Jest-based Pulumi unit testing
- Infrastructure as Code state import and migration

## Sources Consulted
- Pulumi Terraform migration guide: https://www.pulumi.com/docs/iac/guides/migration/migrating-to-pulumi/from-terraform/
- Pulumi `convert` CLI command reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_convert/
- Pulumi `import` CLI command reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_import/
- Pulumi importing existing cloud infrastructure guide: https://www.pulumi.com/docs/iac/guides/migration/import/
- Pulumi unit testing guide: https://www.pulumi.com/docs/iac/guides/testing/unit/
- Pulumi CLI environment variables reference: https://www.pulumi.com/docs/iac/cli/environment-variables/
- Pulumi AWS `getAvailabilityZones` registry documentation: https://www.pulumi.com/registry/packages/aws/api-docs/getavailabilityzones/
- Terraform state removal documentation: https://developer.hashicorp.com/terraform/language/state/remove

## Issues Found
- The post used the deprecated `tf2pulumi` workflow and `tf2pulumi --target-language ...` commands. Updated the section to use the current `pulumi convert --from terraform --language ...` commands and changed the installation instructions to install only the Pulumi CLI.
- The description and migration diagram still referred to `tf2pulumi`. Updated them to refer to Pulumi conversion with `pulumi convert`.
- The bulk import explanation said `--generate-code` creates TypeScript/Python code. Updated it to say generated declarations use the current Pulumi project's language.
- The Pulumi unit test snippet referenced exported values that were not exported from the example infrastructure program. Added `vpcCidrBlock`, `webSecurityGroupIngress`, and `vpcTags` exports to match the tests.
- The Pulumi unit test snippet mocked the availability zones provider function with the wrong token. Updated it to `aws:index/getAvailabilityZones:getAvailabilityZones`.
- The Pulumi unit test snippet imported the infrastructure module with a static `import` after `setMocks`, which can run too early depending on module handling. Updated it to `require("../index")` after mocks are configured.
- The Pulumi unit test snippet used `await`/`Promise.all` directly on Pulumi Outputs. Updated the assertions to use `apply` and `pulumi.all`, matching Pulumi's output model.
- The Pulumi unit test snippet would fail because the main program uses `config.require("environment")` without test configuration. Added `PULUMI_CONFIG` setup for the mocked runtime.

## Review Notes
- The Terraform `state rm` examples are still technically valid, but current Terraform documentation recommends `removed` blocks with `destroy = false` for a safer, previewable state-removal workflow where practical.
- The Pulumi migration docs now emphasize Pulumi Neo and `pulumi-terraform-migrate` for some migration paths. The post remains valid as a manual migration guide after updating the deprecated converter references.
