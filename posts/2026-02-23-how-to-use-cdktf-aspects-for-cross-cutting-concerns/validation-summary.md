# Validation Summary: How to Use CDKTF Aspects for Cross-Cutting Concerns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- CDKTF Aspects, IAspect, Aspects, Annotations, and Testing APIs
- TypeScript
- Terraform AWS provider resources for EC2, Security Groups, RDS, and EBS

## Sources Consulted
- HashiCorp CDKTF Aspects documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/aspects
- HashiCorp CDKTF TypeScript API reference: https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript/classes
- CDKTF 0.21.0 package type declarations and implementation for `Aspects`, `Annotations`, and `Testing`: https://www.npmjs.com/package/cdktf
- CDKTF AWS provider 21.22.1 generated TypeScript bindings for `Instance`, `SecurityGroup`, `DbInstance`, and `EbsVolume`: https://www.npmjs.com/package/@cdktf/provider-aws
- Terraform Registry AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Registry AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Registry AWS provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume

## Issues Found
- The post did not mention that HashiCorp deprecated CDKTF on December 10, 2025. Added a short caveat in the introduction so readers understand the current support status.
- The aspect application example used `app` before it was declared and did not import `App`. Reordered the snippet and updated the import.
- The tagging aspect only checked for `tagsInput` before assigning `tags`, and it let aspect tags overwrite existing resource tags. Updated the type guard to check both properties and use the official merge pattern where existing resource tags win.
- The validation, encryption, and cost-control examples read generated computed accessors such as `instanceType`, `ingress`, `storageEncrypted`, `encrypted`, and `multiAz`. In CDKTF generated provider bindings, these accessors can represent Terraform attributes or wrapper objects; aspects that inspect configured values should use the corresponding `*Input` accessors. Updated the examples to use `instanceTypeInput`, `ingressInput`, `storageEncryptedInput`, `encryptedInput`, and `multiAzInput`.
- The security validation example imported `S3Bucket` but did not use it. Removed the unused import.
- The explanation of `addError` said it prevents deployment. CDKTF documentation and implementation indicate error annotations fail synthesis in the toolkit, so the wording was corrected.
- The test example called `Annotations.of(stack).hasError()`, which is not part of the CDKTF `Annotations` API. Updated the test to inspect construct metadata for `AnnotationMetadataEntryType.ERROR` after `Testing.synth(stack)`.
- The test example assigned the result of `Testing.synth(stack)` to an unused variable. Removed the unused assignment.

## Review Notes
The examples are now aligned with CDKTF 0.21.0 and `@cdktf/provider-aws` 21.22.1 generated TypeScript APIs. Some aspect checks intentionally inspect synthesis-time input values; if a property is supplied through a Terraform token or other unresolved value, the aspect cannot fully evaluate the final runtime value during synthesis.
