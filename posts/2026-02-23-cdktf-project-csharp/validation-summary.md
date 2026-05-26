# Validation Summary: How to Create a CDKTF Project with C#

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CDK for Terraform (CDKTF)
- C#
- .NET 6.0
- Terraform
- AWS provider for Terraform
- Amazon VPC, EC2, and RDS
- xUnit

## Sources Consulted
- HashiCorp CDKTF project setup documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/project-setup
- HashiCorp CDKTF configuration file documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/configuration-file
- HashiCorp CDKTF unit testing documentation: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- HashiCorp CDKTF C# API reference: https://developer.hashicorp.com/terraform/cdktf/api-reference/csharp/classes
- Published CDKTF CLI 0.21.0 package and `cdktf init`, `cdktf get`, and `cdktf deploy` help output
- Terraform Registry AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS VPC subnet CIDR block documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html

## Issues Found
- The post described CDKTF C# as currently supported. HashiCorp deprecated CDKTF on December 10, 2025 and no longer maintains it, so the introduction and prerequisites now accurately describe C# language bindings and note the maintenance status.
- The generated C# template file list did not match the published CDKTF 0.21.0 C# template. Updated the generated project tree to use `Program.cs`, `MainStack.cs`, and `MyTerraformStack.csproj`.
- The networking construct hard-coded subnet CIDRs under `10.0.0.0/16`, which made the prod example invalid because its VPC CIDR is `10.1.0.0/16`. Updated the subnet CIDRs to derive their prefix from `config.VpcCidr`.
- The RDS instance set `SkipFinalSnapshot = false` for prod but did not set `FinalSnapshotIdentifier`, which Terraform requires when a final snapshot is created. Added a production final snapshot identifier.
- The xUnit validity test passed `Testing.Synth(stack)` to `Testing.ToBeValidTerraform`. CDKTF documentation uses `Testing.FullSynth(stack)` for Terraform validity checks, so the test was updated.
- The dynamic resource section claimed to show LINQ but used a `foreach` loop. Renamed the section and lead sentence to describe C# collections instead.

## Review Notes
Could not run `dotnet build`, `dotnet test`, `terraform validate`, or local `cdktf` commands against the snippets because `dotnet`, `terraform`, and `cdktf` are not installed in the workspace. CLI flags were checked with the published `cdktf-cli@0.21.0` package via `npx`.
