# Validation Summary: How to Set Up Proper Access Policy for Amazon Elasticsearch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon OpenSearch Service / Amazon Elasticsearch Service
- AWS IAM access policies
- OpenSearch fine-grained access control
- Amazon VPC security groups
- AWS CLI
- Terraform AWS provider
- Python opensearch-py client
- OpenSearch JavaScript client
- curl AWS SigV4 authentication

## Sources Consulted
- AWS OpenSearch Service access control documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ac.html
- AWS OpenSearch Service VPC documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html
- AWS OpenSearch Service fine-grained access control documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html
- AWS CLI opensearch update-domain-config reference: https://docs.aws.amazon.com/cli/latest/reference/opensearch/update-domain-config.html
- AWS CLI ec2 authorize-security-group-ingress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- OpenSearch JavaScript client documentation: https://docs.opensearch.org/latest/clients/javascript/index/
- OpenSearch Python SigV4 client guidance: https://opensearch.org/blog/aws-sigv4-support-for-clients/
- OpenSearch default action groups documentation: https://docs.opensearch.org/latest/security/access-control/default-action-groups/
- curl --aws-sigv4 documentation: https://curl.se/docs/manpage.html
- Terraform AWS provider aws_opensearch_domain documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain

## Issues Found
- Public endpoint IP-based policy examples used private CIDR ranges (`192.168.1.0/24` and `10.0.0.0/8`). Replaced them with documentation/example public CIDR ranges so the example matches public OpenSearch endpoint behavior.
- Combined IAM and IP restriction used `10.0.0.0/8` as a source IP condition for a public endpoint. Replaced it with `203.0.113.0/24`.
- The VPC diagram showed internet access to application instances "Via NAT/Bastion"; NAT is outbound-only for this purpose. Changed the label to "Via VPN/Bastion".
- Security group CLI placeholders (`sg-opensearch`, `sg-application`) did not resemble actual EC2 security group IDs. Replaced them with realistic placeholder IDs.
- Fine-grained access control section omitted required security prerequisites. Added that FGAC requires HTTPS, encryption at rest, and node-to-node encryption.
- curl SigV4 examples omitted `--user "$AWS_ACCESS_KEY_ID:$AWS_SECRET_ACCESS_KEY"`, which curl requires to sign with AWS credentials. Added it to the security API and troubleshooting curl examples.
- Python example used the legacy `elasticsearch` client with `requests-aws4auth`. Updated it to the current OpenSearch `opensearch-py` client with `AWSV4SignerAuth`, matching OpenSearch client guidance.

## Review Notes
- The post is technically valid after fixes. For temporary AWS credentials, curl examples may also need an `X-Amz-Security-Token` header; the SDK examples handle temporary credentials automatically.
- `OpenSearch_2.5` is syntactically valid as a Terraform engine version example, but future posts should consider using a more current OpenSearch engine version when demonstrating new production deployments.
