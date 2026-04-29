# Validation Summary: How to Move Resources with moved Blocks in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform-compatible `moved` block
- AWS provider resources (aws_instance, aws_vpc, aws_s3_bucket) used as illustrative examples
- `count` and `for_each` meta-arguments
- Modules

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu `moved` block reference: https://opentofu.org/docs/language/moved/
- Terraform refactoring docs (compatible behavior): https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/moved
- HCL resource address syntax: https://developer.hashicorp.com/terraform/cli/state/resource-addressing

## Issues Found
No technical issues found.

The `moved` block syntax (`from = <addr>`, `to = <addr>`), its semantics (records the rename in state without destroy/create), and all the example transitions are correct:
- Plain rename within the same module.
- Promoting a root resource into a child module via `module.<name>.<resource>.<label>`.
- Converting a single resource into one with `count` (`addr` -> `addr[0]`).
- Converting a single resource into one with `for_each` (`addr` -> `addr["key"]`).

The cleanup guidance ("after everyone has applied, the block can be removed") matches the official guidance that `moved` is a one-time migration helper.

## Review Notes
- The article is intentionally brief and uses minimal AWS resource examples; the `aws_instance` `ami = "ami-123"` value is illustrative only and not a real AMI ID — this is fine for a syntax-focused tutorial.
- Worth noting (not an error): if a `moved` block is removed before all consumers of the configuration have applied it, those consumers will still see destroy/create on the next plan. The post mentions this implicitly ("after all team members and CI/CD pipelines have applied").
- Also worth noting (not an error): `moved` cannot cross provider boundaries or change resource types. The post never claims otherwise but readers should be aware.
- The post does not mention `tofu state mv` as an alternative; both are valid, but `moved` blocks are preferred because they are declarative and apply for everyone who runs the config. No fix needed.
