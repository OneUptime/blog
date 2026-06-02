# Validation Summary: How to Create Route 53 Private Hosted Zones

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Route 53 private hosted zones
- Amazon VPC DNS settings
- AWS CLI
- Route 53 Resolver query logging
- Terraform AWS provider
- DNS record types and split-horizon DNS

## Sources Consulted
- AWS Route 53 Developer Guide: Creating a private hosted zone - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-creating.html
- AWS Route 53 Developer Guide: Considerations when working with a private hosted zone - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html
- AWS CLI Command Reference: route53 create-hosted-zone - https://docs.aws.amazon.com/cli/latest/reference/route53/create-hosted-zone.html
- AWS CLI Command Reference: route53 get-hosted-zone - https://docs.aws.amazon.com/cli/latest/reference/route53/get-hosted-zone.html
- AWS Route 53 Developer Guide: Associating a VPC and private hosted zone in different AWS accounts - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs-different-accounts.html
- AWS Route 53 Developer Guide: Supported DNS record types - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html
- AWS Route 53 Developer Guide: Resolver query logging - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html
- AWS CLI Command Reference: route53resolver create-resolver-query-log-config - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-query-log-config.html
- AWS VPC User Guide: Security group rules - https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Terraform Registry: aws_route53_zone - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone
- Terraform Registry: aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry: aws_db_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The post said the private hosted zone was immediately active after creation. I changed this to say records are resolvable after the create change reaches `INSYNC`, matching Route 53 change propagation behavior.
- The post used `aws route53 list-hosted-zone-vpcs`, which is not an AWS CLI Route 53 command. I changed the example to `aws route53 get-hosted-zone --id ... --query VPCs`, which returns VPC associations for the hosted zone.
- The Terraform RDS example created an `A` record from `aws_db_instance.primary.address`. The RDS `address` attribute is a hostname, while an `A` record requires IPv4 address data. I changed the record type to `CNAME`.
- The Resolver query logging section said it logs every DNS query. AWS documents that repeated queries answered from the Resolver cache are not logged, so I corrected that wording.
- The troubleshooting section listed security groups blocking DNS port 53 as a private hosted zone issue. AWS documents that security groups cannot block DNS requests to or from Route 53 Resolver, so I changed this to custom DNS resolvers or firewalls blocking DNS port 53.

## Review Notes
The AWS CLI examples are structurally correct for current AWS CLI v2, but they use placeholder IDs and hosted zone IDs that readers must replace. The alias examples depend on using the correct AWS resource hosted zone ID for the target load balancer.
