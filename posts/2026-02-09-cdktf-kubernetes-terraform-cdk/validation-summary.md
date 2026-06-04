# Validation Summary: How to Configure CDKTF for Managing Kubernetes Infrastructure with Terraform CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform and Terraform providers
- Kubernetes provider for Terraform
- AWS provider for Terraform
- Amazon EKS
- TypeScript
- Jest/CDKTF unit testing

## Sources Consulted
- HashiCorp CDKTF Providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF Unit Tests documentation: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- Terraform `base64decode` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64decode
- Terraform Registry AWS provider `aws_eks_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform Registry AWS provider `aws_eks_node_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform Registry Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Current installed CDKTF CLI help output and generated TypeScript declarations from `cdktf`, `@cdktf/provider-aws`, and `@cdktf/provider-kubernetes` npm packages.

## Issues Found
- CDKTF maintenance status was missing. Added that HashiCorp deprecated CDKTF on December 10, 2025 and no longer maintains it.
- Language support wording was incomplete. Updated it to include TypeScript, Python, Java, C#, and experimental Go.
- The `cdktf init --providers=kubernetes,aws` command is parsed as a single provider string by the current CLI. Changed it to use separate `--providers` flags.
- The `cdktf.json` snippet included a JavaScript comment inside a JSON block and string values for boolean context flags. Removed the comment and changed those values to booleans.
- Provider version pins were stale. Updated the AWS provider example to `aws@~> 6.0` and the Kubernetes provider example to `kubernetes@~> 2.38`.
- EKS examples used Kubernetes `1.28`, which is no longer in standard support. Updated examples to `1.35`, currently listed by AWS as standard-supported.
- The first stack claimed to deploy Kubernetes resources but only created an EKS cluster and configured providers. Adjusted the wording and added a note about managing Kubernetes workloads after the cluster exists.
- The Kubernetes provider configuration passed raw EKS certificate authority data. Changed it to `Fn.base64decode(...)` because the provider expects PEM text.
- The Kubernetes provider `exec` block was written as an object, but the generated TypeScript binding expects a block list. Changed it to an array and updated the exec API version to `client.authentication.k8s.io/v1`.
- The first TypeScript example had unused imports and an unused node group variable, which would fail under the generated strict TypeScript template. Removed the unused imports and variable assignment.
- The reusable construct used an implicit `any[]` for generated environment variables, which fails strict TypeScript. Added an explicit array type.
- The unit tests used a non-existent `Testing.stubStack` API and treated `Testing.synth` as an array of resources. Replaced it with `new TerraformStack(...)`, parsed the JSON string returned by `Testing.synth`, and adjusted assertions to use synthesized Terraform JSON snake_case keys.
- The multi-cluster example passed aliased providers as strings. Changed it to pass the `AwsProvider` instance to resources.

## Review Notes
Terraform CLI is not installed in this environment, so I could not complete a full `cdktf get` or `cdktf synth` run against local generated bindings. I verified command shapes with `cdktf --help`, checked official documentation, and inspected current generated TypeScript declarations from the CDKTF npm packages.
