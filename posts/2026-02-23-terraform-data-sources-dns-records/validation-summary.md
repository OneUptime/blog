# Validation Summary: How to Use Data Sources to Read DNS Records in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- HashiCorp DNS provider
- AWS Route53
- AWS Elastic Load Balancing
- AWS Certificate Manager
- DNS record types: A, AAAA, CNAME, MX, NS, TXT, SRV

## Sources Consulted
- HashiCorp AWS provider `aws_route53_records` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_records
- HashiCorp AWS provider `aws_route53_zone` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone
- HashiCorp AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- HashiCorp AWS provider `aws_lb_listener` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/lb_listener
- HashiCorp DNS provider documentation: https://registry.terraform.io/providers/hashicorp/dns/latest/docs
- HashiCorp DNS provider data source documentation for A, AAAA, NS, MX, TXT, CNAME, and SRV record lookups: https://registry.terraform.io/providers/hashicorp/dns/latest/docs/data-sources/a_record_set
- AWS Route53 record values documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values.html

## Issues Found
- The post used a non-existent `aws_route53_record` data source for Route53 record lookups. The AWS provider documents `aws_route53_record` as a managed resource, while Route53 record reading is provided by the `aws_route53_records` data source. Updated the Route53 examples to use `aws_route53_records`, filter `resource_record_sets` by name and type, and read values from `resource_records`.
- The post described Route53 alias lookup results as an `alias` block and standard values as `records`. Updated this to `alias_target` and `resource_records`, matching the `aws_route53_records` data source schema.
- The conditional creation example used `dns_a_record_set` as if a missing record could be handled by checking `length(addrs) == 0`. Terraform data sources generally fail the plan when required lookup data cannot be read, so this is not a reliable absence check. Updated the example to list Route53 records and count the filtered result set.
- The load balancer example referenced `data.aws_lb_listener.app.arn` without defining that data source. Added an `aws_lb_listener` data source using `load_balancer_arn` and `port`, matching the AWS provider documentation.
- The private hosted zone example used the same non-existent `aws_route53_record` data source. Updated it to use `aws_route53_records` and derive CIDR blocks from `resource_records`.

## Review Notes
- The `dns` provider examples are consistent with the documented data sources and attributes. The configured version constraint `~> 3.3` remains acceptable for the shown resources and data sources, although newer 3.x versions are available.
- Terraform was not installed in the local environment, so examples were reviewed against official provider documentation rather than validated with `terraform fmt` or `terraform validate`.
