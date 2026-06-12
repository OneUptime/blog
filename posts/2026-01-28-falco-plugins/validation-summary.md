# Validation Summary: How to Use Falco Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco plugins
- Falco rules
- Falco Helm chart
- falcoctl artifact installation
- AWS CloudTrail
- Amazon SNS
- Amazon SQS
- Kubernetes audit logging
- Go Falco Plugin SDK

## Sources Consulted
- Falco plugin usage documentation: https://falco.org/docs/concepts/plugins/usage/
- Falco Helm chart README and k8saudit example values: https://github.com/falcosecurity/charts/blob/master/charts/falco/README.md
- Falco CloudTrail plugin README and supported fields: https://github.com/falcosecurity/plugins/blob/master/plugins/cloudtrail/README.md
- Falco CloudTrail plugin rules: https://github.com/falcosecurity/plugins/blob/master/plugins/cloudtrail/rules/aws_cloudtrail_rules.yaml
- Falco Kubernetes audit plugin README and supported fields: https://github.com/falcosecurity/plugins/blob/master/plugins/k8saudit/README.md
- Falco Kubernetes audit plugin rules: https://github.com/falcosecurity/plugins/blob/master/plugins/k8saudit/rules/k8s_audit_rules.yaml
- Falco plugins registry: https://github.com/falcosecurity/plugins
- falcoctl artifact installation documentation: https://github.com/falcosecurity/falcoctl
- Falco Go SDK walkthrough: https://falco.org/docs/reference/plugins/go-sdk-walkthrough/
- Go package docs for Falco plugin SDK: https://pkg.go.dev/github.com/falcosecurity/plugin-sdk-go/pkg/sdk/plugins
- Go package docs for Falco source plugins: https://pkg.go.dev/github.com/falcosecurity/plugin-sdk-go/pkg/sdk/plugins/source
- AWS CLI create-trail documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/create-trail.html
- AWS CloudTrail SNS notification documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/configure-sns-notifications-for-cloudtrail.html
- Amazon SNS to SQS subscription documentation: https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- AWS CLI set-queue-attributes documentation: https://docs.aws.amazon.com/cli/latest/reference/sqs/set-queue-attributes.html
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The post said plugins are included in the Falco container image. Updated this to describe current artifact-based installation with `falcoctl artifact install`, and added Helm `falcoctl` artifact installation values.
- CloudTrail plugin `init_config` examples used YAML maps and an invalid `aws_region` key. Updated CloudTrail examples to use the JSON init string format and the documented `aws.region` override.
- The AWS setup implied CloudTrail could send directly to SQS and showed direct S3-to-SQS bucket notifications. Updated the setup to use CloudTrail SNS notifications subscribed to SQS, added the required SQS queue policy step, and clarified the separate S3-notification-through-SNS case with `useS3SNS: true`.
- CloudTrail rules used invalid fields: `ct.errorcode`, `ct.user.name`, and `ct.request.groupId`. Replaced them with documented fields: `ct.error`, `ct.user`, and `ct.request`.
- The k8saudit plugin config used `maxEventBytes`, but the documented key is `maxEventSize`. Updated the configuration.
- The Kubernetes audit pod exec rule output referenced unsupported field `ka.req.exec.command`. Removed that field from the output.
- The custom Go plugin example was missing the required `Init` method and source capability registration. Added `Init`, changed the plugin ID type to `uint32`, registered the source plugin in `init`, and kept `main` empty as shown in the SDK pattern.

## Review Notes
- The examples use placeholder AWS account IDs, ARNs, queue URLs, and bucket names; readers must replace these and configure the matching IAM/SNS/SQS/S3 policies for their account.
- The Falco Helm chart documentation recommends deploying plugin-only sources such as k8saudit as a deployment with one replica and disabling drivers/collectors when only plugin events are needed; the post focuses on plugin configuration and does not cover full production Helm topology.
