# Validation Summary: How to Create a CDKTF Project with Java

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Java
- Gradle
- Terraform
- AWS provider for Terraform
- JUnit

## Sources Consulted
- HashiCorp CDKTF Project Setup documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/project-setup
- HashiCorp CDKTF Configuration File documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/configuration-file
- HashiCorp CDKTF Providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF Unit Tests documentation: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- HashiCorp CDKTF Remote Backends documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/remote-backends
- HashiCorp terraform-cdk v0.21.0 release notes: https://github.com/hashicorp/terraform-cdk/releases
- Local CDKTF CLI 0.21.0 Java template files installed via npm package inspection.

## Issues Found
- The post described the generated Java template as a Maven project. Current CDKTF Java templates use Gradle, so the project structure, prerequisite, app command, build/test commands, and dependency snippet were updated to Gradle.
- The prerequisite listed Node.js 18 or later. CDKTF v0.21.0 release notes update the minimum compatible Node.js version to 20.9, so the prerequisite was corrected.
- The post did not mention CDKTF's current lifecycle status. Official HashiCorp documentation states CDKTF was deprecated on December 10, 2025 and is no longer supported or maintained, so a concise caveat was added.
- The generated provider binding output path was made explicit in `cdktf.json` as `src/main/java/imports` to match the Java imports used throughout the examples.
- The networking construct hard-coded subnet CIDRs with a `10.0` prefix. This made the production example's `10.1.0.0/16` VPC invalid because its subnets would be outside the VPC CIDR. The subnet CIDR generation now derives the first two octets from the configured VPC CIDR.
- The Terraform validity test used `Testing.synth(stack)`. Official CDKTF unit test documentation uses `Testing.fullSynth(stack)` when calling `Testing.toBeValidTerraform`, so the example was corrected.
- The subnet test name and comment claimed it validated the exact subnet count, but the assertion only checked that an `aws_subnet` resource exists. The test name/comment were corrected to match the assertion.
- Removed an unused `java.util.stream.Collectors` import from the full stack example.

## Review Notes
The basic EC2 example creates a subnet with public IP assignment but does not configure an internet gateway or public route table in that section. The later custom networking construct does include those resources. Future revisions could also avoid hard-coded AMI IDs by using an AWS AMI data source.
