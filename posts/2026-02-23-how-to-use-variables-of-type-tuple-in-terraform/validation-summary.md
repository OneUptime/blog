# Validation Summary: How to Use Variables of Type Tuple in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform input variables and type constraints
- Terraform functions: `regex` and `setproduct`
- AWS ECS task definitions

## Sources Consulted
- HashiCorp Terraform Type Constraints: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Terraform Types and Values: https://developer.hashicorp.com/terraform/language/expressions/types
- HashiCorp Terraform `regex` function: https://developer.hashicorp.com/terraform/language/functions/regex
- HashiCorp Terraform `setproduct` function: https://developer.hashicorp.com/terraform/language/functions/setproduct
- HashiCorp Terraform variable command-line option reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- AWS ECS PortMapping API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html

## Issues Found
- The post stated that `regex` returns a tuple of capture groups. HashiCorp documentation says `regex` returns a list for unnamed capture groups, a map for named capture groups, and a string when there are no capture groups. Updated the text and code comment to describe the example as a list of unnamed capture groups.
- The post stated that `setproduct` returns a list of tuples. Current HashiCorp documentation says `setproduct` returns a list if all arguments are lists, otherwise a set, and each result element is a list of values corresponding to the input arguments. Updated the section text and code comment.
- The ECS example used `requires_compatibilities = ["FARGATE"]` with `network_mode = "awsvpc"` while allowing different `hostPort` and `containerPort` values. AWS ECS documentation says that for `awsvpc` or `host` networking, `hostPort` must be blank or match `containerPort`. Updated the example to use `bridge` networking so the host/container port tuple example is valid.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` against extracted snippets. The HCL examples were reviewed against official HashiCorp and AWS documentation instead.
