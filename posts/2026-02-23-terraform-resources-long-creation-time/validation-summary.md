# Validation Summary: How to Handle Resources That Take Long to Create in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform AWS Provider
- AWS RDS
- Amazon EKS
- Amazon CloudFront
- Amazon ElastiCache
- Amazon OpenSearch Service
- GitHub Actions
- Jenkins Pipeline

## Sources Consulted
- HashiCorp Terraform resource configuration documentation: https://developer.hashicorp.com/terraform/language/resources/configure
- HashiCorp Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp Terraform `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform `import` command documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- HashiCorp Terraform `state rm` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- HashiCorp Terraform resource targeting tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting
- Terraform AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_eks_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS Provider `aws_cloudfront_distribution` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS Provider `aws_elasticache_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- Terraform AWS Provider `aws_opensearch_domain` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Terraform AWS Provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
- The CloudFront example used a `timeouts` block, but `aws_cloudfront_distribution` does not document configurable operation timeouts. Replaced it with `wait_for_deployment = true`, which is the provider-supported wait setting.
- The timeout format example repeated `create` multiple times in one block, which is invalid HCL because an object cannot define the same argument repeatedly. Changed the example to use distinct timeout arguments.
- Some RDS examples omitted required creation arguments such as `allocated_storage` and master user configuration. Added `allocated_storage`, `username`, and `manage_master_user_password` to make the examples valid for new DB instances.
- Several "extended timeout" examples used values that were equal to or shorter than current AWS provider defaults. Increased EKS, ElastiCache, and OpenSearch timeout values so the examples actually extend provider defaults.
- The dependency-graph example placed an RDS subnet group after the DB instance even though a DB instance using it must depend on the subnet group. Moved the subnet group before the DB instance and referenced it with `db_subnet_group_name`.
- The targeted apply section presented `-target` as a normal bootstrapping pattern. Added a caution that Terraform documents resource targeting for exceptional situations, not routine use.
- The timeout recovery section implied a plain `terraform apply` would always detect and adopt a successfully created resource after a timeout. Clarified that re-applying is appropriate only if Terraform already recorded the resource in state; otherwise import is the recovery path.
- The custom waiting example used `null_resource`. Updated it to `terraform_data`, which Terraform documents as the built-in resource for triggering provisioners when there is no other logical managed resource.
- The conclusion recommended custom timeouts for CloudFront. Updated it to distinguish resources with custom timeouts from provider-specific wait settings such as CloudFront `wait_for_deployment`.

## Review Notes
The local environment did not have the `terraform` or `aws` CLIs installed, so command verification was performed against official HashiCorp, AWS provider, GitHub, and Jenkins documentation rather than local `--help` output.
