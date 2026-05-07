# Validation Summary: How to Deploy AWS App Runner Services with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS App Runner
- AWS IAM
- Amazon ECR
- Amazon Route 53
- AWS CLI

## Sources Consulted
- AWS App Runner service source image docs: https://docs.aws.amazon.com/apprunner/latest/dg/service-source-image.html
- AWS App Runner IAM roles docs: https://docs.aws.amazon.com/apprunner/latest/dg/security_iam_service-with-iam.html
- AWS App Runner service creation docs: https://docs.aws.amazon.com/apprunner/latest/dg/manage-create.html
- AWS App Runner health check docs: https://docs.aws.amazon.com/apprunner/latest/dg/manage-configure-healthcheck.html
- AWS App Runner VPC egress docs: https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html
- AWS App Runner custom domain docs: https://docs.aws.amazon.com/apprunner/latest/dg/manage-custom-domains.html
- AWS App Runner pause/resume docs: https://docs.aws.amazon.com/apprunner/latest/dg/manage-pause.html
- AWS App Runner architecture and supported CPU/memory configurations: https://docs.aws.amazon.com/apprunner/latest/dg/architecture.html
- AWS App Runner CreateService API reference: https://docs.aws.amazon.com/apprunner/latest/api/API_CreateService.html
- AWS App Runner CreateAutoScalingConfiguration API reference: https://docs.aws.amazon.com/apprunner/latest/api/API_CreateAutoScalingConfiguration.html
- AWS CLI `describe-service` reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/describe-service.html
- HashiCorp AWS provider docs for `aws_apprunner_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apprunner_service.html.markdown
- HashiCorp AWS provider docs for `aws_apprunner_auto_scaling_configuration_version`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apprunner_auto_scaling_configuration_version.html.markdown
- HashiCorp AWS provider docs for `aws_apprunner_vpc_connector`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apprunner_vpc_connector.html.markdown
- HashiCorp AWS provider docs for `aws_apprunner_custom_domain_association`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apprunner_custom_domain_association.html.markdown
- AWS App Runner availability change guide: https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html

## Issues Found
- The introduction incorrectly said App Runner scales from zero. I changed this to automatic scaling and added the correct scale-to-zero caveat in the conclusion, because App Runner uses `min_size` for baseline capacity and reducing compute capacity to zero is a pause/resume operation, not normal autoscaling behavior.
- The introduction and deployment comment implied automatic deployment applies to any ECR setup. I narrowed this to source code and private same-account ECR repositories, which matches AWS App Runner's documented automatic deployment behavior.
- The post did not mention the current App Runner availability restriction for new customers. I added a short note that, as of 2026, the service is only available to existing AWS customers.
- The VPC step declared a second `aws_apprunner_service` with the same service name instead of showing how to update the existing service. I changed the step so it clearly updates the existing `aws_apprunner_service.main` resource with `network_configuration`.
- The custom domain step was incomplete because `aws_apprunner_custom_domain_association` also requires DNS target and certificate validation records to be created in DNS. I added Route 53 record resources for the service CNAME and the certificate validation CNAME records.

## Review Notes
- AWS documentation currently shows inconsistent cutoff dates for the App Runner new-customer closure. The App Runner API reference pages say March 31, 2026, while the dedicated availability-change guide says April 30, 2026. The post was updated to reflect the current availability state without relying on the conflicting exact date.
- The custom-domain example uses `api.${var.domain_name}`, so a CNAME record is appropriate. If a future revision shows a root/apex domain instead, Route 53 alias records should be used instead of a CNAME.
- AWS documents a one-time startup latency of roughly two to five minutes when a new App Runner VPC connector subnet/security-group combination is first used. The post's VPC section is technically correct after the fix, but that operational caveat may be worth mentioning in a future revision.
