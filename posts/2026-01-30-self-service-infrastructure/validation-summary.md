# Validation Summary: How to Implement Self-Service Infrastructure

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Terraform (HCL) with the AWS provider (`aws_db_instance`)
- Open Policy Agent (OPA) / Rego policies for Terraform plan evaluation
- FastAPI + Pydantic (Python) for portal API
- Crossplane (CompositeResourceDefinition, Composition, Claim) with provider-aws RDS
- External Secrets Operator (ExternalSecret, ClusterSecretStore)
- AWS Secrets Manager
- Mermaid diagrams (flowchart, sequenceDiagram, gantt)
- AWS RDS (PostgreSQL)

## Sources Consulted
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Open Policy Agent Rego documentation: https://www.openpolicyagent.org/docs/latest/policy-language/
- OPA Terraform integration: https://www.openpolicyagent.org/docs/latest/terraform/
- Pydantic v1/v2 validators: https://docs.pydantic.dev/latest/concepts/validators/
- FastAPI dependencies: https://fastapi.tiangolo.com/tutorial/dependencies/
- Crossplane CompositeResourceDefinition reference: https://docs.crossplane.io/latest/concepts/composite-resource-definitions/
- Crossplane Composition / patches and transforms: https://docs.crossplane.io/latest/concepts/compositions/
- Crossplane provider-aws (legacy) RDS Instance: https://marketplace.upbound.io/providers/crossplane-contrib/provider-aws/latest/resources/rds.aws.crossplane.io/Instance/v1beta1
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- AWS RDS PostgreSQL engine versions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.DBVersions.html
- AWS RDS instance types: https://aws.amazon.com/rds/instance-types/
- Mermaid syntax (flowchart, sequenceDiagram, gantt): https://mermaid.js.org/intro/

## Issues Found
- **Terraform module references undeclared variables**: The `aws_db_instance` resource used `var.subnet_group` (for `db_subnet_group_name`) and `var.requesting_team` (for the `Owner` tag), but neither was declared in the `variable` blocks above. Anyone copying the module would get an "undeclared variable" error from Terraform. Added two new `variable` declarations (`subnet_group` and `requesting_team`) so the module is internally consistent and copy-pasteable.

## Review Notes
- The OPA policies use the Rego v0 partial-set rule syntax (`deny[msg] { ... }`). This still works in OPA 1.0+ but emits a deprecation warning unless the file opts in to v0. Modern OPA encourages the v1 form (`deny contains msg if { ... }`). Left unchanged since the v0 syntax is widely deployed and still functional; this is a documentation/style consideration, not a correctness bug.
- The FastAPI snippet uses Pydantic v1's `validator` decorator (`from pydantic import validator`). In Pydantic v2, the preferred replacement is `field_validator` (with an explicit `@classmethod`). The v1 import is still importable from Pydantic v2 with a deprecation warning, so the code remains functional. Left unchanged to avoid drifting from the author's chosen style.
- The Crossplane example uses the legacy `rds.aws.crossplane.io/v1beta1` API from provider-aws (crossplane-contrib). Many teams have migrated to the family providers under `rds.aws.upbound.io/v1beta1`. The legacy API is still valid and the example is correct as written; this is an ecosystem note, not an error.
- The External Secrets Operator example uses `external-secrets.io/v1beta1`. ESO promoted `v1` to stable in late 2024; both API versions are served, so the example continues to work.
- The Terraform module's `instance_map` uses very small instance classes (`db.t3.micro`–`db.t3.medium`) even for the "large" size. These are realistic for a "starter" self-service catalog but readers should size for their actual workload before using in production.
- The `aws_security_group.db` resource referenced by `vpc_security_group_ids` is intentionally not shown in the snippet (the snippet focuses on the DB instance). This is acceptable for an illustrative module example.
- PostgreSQL engine version `15.4` is a real RDS-supported minor version, though by 2026 newer minor versions of PostgreSQL 15 are available. Pinning to `15.4` is still valid; teams should bump as needed.
