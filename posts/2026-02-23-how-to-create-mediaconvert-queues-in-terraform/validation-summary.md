# Validation Summary: How to Create MediaConvert Queues in Terraform

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp AWS provider (~> 5.0)
- AWS Elemental MediaConvert (queues, pricing plans, reservation plans)
- AWS IAM (roles, role policies, assume-role policies)
- Amazon S3 (buckets, lifecycle configuration, Glacier transition)
- Amazon EventBridge (event rules, event targets)
- Amazon SNS (topics, topic policies)
- Amazon CloudWatch Logs

## Sources Consulted
- [aws_media_convert_queue resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/media_convert_queue)
- [aws_media_convert_queue data source docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/media_convert_queue)
- [aws_s3_bucket_lifecycle_configuration resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration)
- [AWS MediaConvert IAM service docs](https://docs.aws.amazon.com/mediaconvert/latest/ug/security_iam_service-with-iam.html)
- [AWS MediaConvert EventBridge events](https://docs.aws.amazon.com/mediaconvert/latest/ug/mediaconvert_cwe_events.html)
- [AWS MediaConvert DescribeEndpoints API reference](https://docs.aws.amazon.com/mediaconvert/latest/apireference/endpoints.html)
- [terraform-provider-aws issue #35608 — MediaConvert regional endpoint](https://github.com/hashicorp/terraform-provider-aws/issues/35608)

## Issues Found
1. **"Getting the MediaConvert Endpoint" section was technically incorrect.**
   - The original section claimed the `aws_media_convert_queue` data source retrieves "the account-specific MediaConvert endpoint." That is false — the data source returns only the queue's ARN, name, status, and tags. It does not expose an endpoint attribute.
   - The narrative also stated MediaConvert "uses account-specific endpoints," but as of February 2024 AWS no longer requires account-specific endpoints; requests can be sent directly to the regional endpoint (`https://mediaconvert.<region>.amazonaws.com`) and `DescribeEndpoints` is obsolete.
   - **Fix:** Renamed the section to "Looking Up the Default Queue," noted the regional-endpoint change, rewrote the example so the data source is used for its actual purpose (looking up the default queue's ARN), and constructed the regional endpoint string from `data.aws_region.current.name` instead of a misleading placeholder string output.

## Review Notes
- The `aws_media_convert_queue` resource arguments (`name`, `description`, `status`, `pricing_plan`, `tags`) and the nested `reservation_plan_settings` block (`commitment = "ONE_YEAR"`, `renewal_type = "AUTO_RENEW"`, `reserved_slots`) match the current provider documentation.
- The IAM trust policy service principal `mediaconvert.amazonaws.com` is correct.
- The S3 lifecycle rule omits a `filter` block. In AWS provider v5.x this still works (the rule applies to all objects), but newer provider versions may emit a deprecation warning recommending an explicit `filter {}` block. Not strictly wrong, but readers using the latest provider may see a warning.
- The EventBridge pattern (`source = ["aws.mediaconvert"]`, `detail-type = ["MediaConvert Job State Change"]`, `detail.status` values `COMPLETE`/`ERROR`) matches the documented MediaConvert event shape.
- The SNS topic policy uses `Action = "SNS:Publish"` and `Principal.Service = "events.amazonaws.com"`, both correct for EventBridge → SNS targets.
- The data source argument is `id` (which the provider documents as "the same as name"), so `id = "Default"` is valid for looking up the always-present default queue.
