# Validation Summary: How to Build an Email Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon SES
- Amazon Route 53
- Amazon SNS
- AWS Lambda
- Amazon DynamoDB
- AWS IAM
- Amazon S3
- Amazon Data Firehose
- Amazon CloudWatch
- SPF, DKIM, and DMARC

## Sources Consulted
- Terraform AWS Provider documentation for `aws_ses_domain_identity`, `aws_ses_domain_dkim`, `aws_ses_domain_mail_from`, `aws_ses_configuration_set`, `aws_ses_event_destination`, `aws_ses_template`, and SES receipt rule resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS SES Developer Guide, SPF authentication and custom MAIL FROM domains: https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html and https://docs.aws.amazon.com/ses/latest/dg/mail-from.html
- AWS SES Developer Guide, DMARC authentication: https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html
- AWS General Reference, SES endpoints, DKIM domains, email receiving endpoints, and custom MAIL FROM feedback endpoints: https://docs.aws.amazon.com/general/latest/gr/ses.html
- AWS SES Developer Guide, event publishing and Firehose event data: https://docs.aws.amazon.com/ses/latest/dg/event-publishing-add-event-destination-firehose.html and https://docs.aws.amazon.com/ses/latest/DeveloperGuide/event-publishing-retrieving-firehose-contents.html
- AWS Service Authorization Reference for Amazon SES IAM actions, resources, and condition keys: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonses.html
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS SES reputation monitoring alarms with CloudWatch: https://docs.aws.amazon.com/ses/latest/dg/reputationdashboard-cloudwatch-alarm.html
- AWS CloudFormation `AWS::SES::ReceiptRule` Lambda action documentation, used to confirm SES receipt rule Lambda action behavior: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ses-receiptrule-lambdaaction.html

## Issues Found
- The architecture and Firehose section described S3 as archiving sent emails. SES event publishing to Firehose publishes sending event records, not full outbound message content. Updated the wording to "email event archiving" and "sending event records."
- The DKIM CNAME target was hard-coded to `dkim.amazonses.com`. AWS documents several Regions that require Region-specific SES DKIM domains. Updated the Terraform snippet to use `var.ses_dkim_domain` and added a sentence explaining that it must match the Region.
- The Lambda example used `nodejs20.x`, which AWS Lambda lists with a deprecation date of April 30, 2026. Updated the runtime to `nodejs22.x`.
- The inbound email section implied SES receiving was generally available in any Region. AWS documents Region-specific receiving endpoints and unsupported Regions. Updated the introduction to note that inbound processing applies only in Regions where SES supports email receiving.

## Review Notes
The snippets are illustrative and omit surrounding resources such as IAM roles, KMS key policies, S3 bucket policies, Firehose delivery stream configuration, Lambda packaging, and variable definitions. Those omissions are acceptable for the post's level of detail, but a future full example should include them so readers can run `terraform plan` and `terraform apply` directly.
