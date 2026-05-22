# Validation Summary: How to Use the yamldecode Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- YAML
- AWS Terraform provider resources
- Kubernetes manifests

## Sources Consulted
- Terraform `yamldecode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamldecode
- Terraform `yamlencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamlencode
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- YAML 1.2 changes overview: https://yaml.org/spec/1.2.2/ext/changes/
- Terraform AWS provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post described YAML mappings and sequences as becoming Terraform maps and lists. Terraform's official `yamldecode` documentation maps `!!map` to `object(...)` and `!!seq` to `tuple(...)`, so the wording and type table were updated to use `object` and `tuple`.
- The YAML gotchas section claimed unquoted `yes` and `no` are parsed as booleans. Terraform `yamldecode` supports a subset of YAML 1.2, where `yes` and `no` are strings rather than boolean values. The example was corrected to use `true` for the boolean case and to note that `no` is parsed as a string in YAML 1.2.

## Review Notes
The multi-document YAML split example is accurately labeled as simplified. For production use, a dedicated YAML document splitter may be safer because YAML document separators can appear with comments, leading/trailing whitespace, or explicit document markers in formats that a simple string split may not cover.
