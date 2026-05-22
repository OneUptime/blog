# Validation Summary: How to Use the urlencode Function in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform HCL
- Terraform `urlencode` and `replace` functions
- Terraform HTTP provider
- AWS provider resources for CloudWatch alarms and SNS subscriptions
- Kubernetes provider `kubernetes_secret`
- PostgreSQL connection URIs
- URL percent encoding and query-string form encoding

## Sources Consulted
- Terraform `urlencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/urlencode
- Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- HashiCorp HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- HashiCorp AWS provider `aws_sns_topic_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- HashiCorp Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- PostgreSQL libpq connection URI documentation: https://www.postgresql.org/docs/current/libpq-connect.html
- RFC 3986, URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986
- WHATWG URL Standard, `application/x-www-form-urlencoded`: https://url.spec.whatwg.org/

## Issues Found
- The introduction described `urlencode` as generally safe for URLs and path segments. Terraform documents the function as safe for URL query string arguments, so the wording was narrowed to query strings and query parameters.
- The form-encoding explanation was too broad. It now describes the behavior as query-string form encoding, which matches Terraform's documented `+` handling for spaces.
- The "API Gateway Query String Parameters" section did not configure API Gateway. The heading and lead-in were changed to describe the actual redirect URL example.
- The Terraform state example encoded an S3 key into the path portion of an S3 URL. Because Terraform `urlencode` converts spaces to `+`, it is safer and more accurate to show the encoded state key as a query parameter value.
- The PostgreSQL connection string example used `urlencode` directly in the URI userinfo component. PostgreSQL documents URI percent encoding with spaces as `%20`, so the example now replaces `+` with `%20` after calling `urlencode`.
- The SNS section was labeled as subscription filters, but the code creates an HTTPS subscription endpoint. The heading was corrected.
- The limitations and summary sections were updated to preserve the key rule: `urlencode` is best suited to query string argument values, and other URI components may require `%20` instead of `+`.

## Review Notes
Terraform was not installed in this environment, so examples were reviewed against official documentation rather than executed with `terraform console` or `terraform validate`. The CloudWatch Log Insights console URL fragment is service-specific and may require adjustment if AWS changes its console URL encoding format, but the Terraform expression syntax itself is valid.
