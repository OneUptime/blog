# Validation Summary: How to Set Up Amazon EventBridge Schema Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EventBridge
- Amazon EventBridge Schema Registry
- EventBridge Schema Discovery
- AWS CLI v2
- AWS CloudFormation
- CloudWatch metrics

## Sources Consulted
- AWS CLI Command Reference: `aws schemas` available commands: https://docs.aws.amazon.com/cli/latest/reference/schemas/
- AWS CLI Command Reference: `aws schemas create-discoverer`: https://docs.aws.amazon.com/cli/latest/reference/schemas/create-discoverer.html
- AWS CLI Command Reference: `aws schemas put-code-binding`: https://docs.aws.amazon.com/cli/latest/reference/schemas/put-code-binding.html
- AWS CLI Command Reference: `aws schemas describe-code-binding`: https://docs.aws.amazon.com/cli/latest/reference/schemas/describe-code-binding.html
- AWS CLI Command Reference: `aws schemas get-code-binding-source`: https://docs.aws.amazon.com/cli/latest/reference/schemas/get-code-binding-source.html
- Amazon EventBridge User Guide: Inferring schemas from event bus events: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schemas-infer.html
- Amazon EventBridge User Guide: Generating code bindings: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema-code-bindings.html
- AWS CloudFormation Template Reference: `AWS::EventSchemas::Discoverer`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eventschemas-discoverer.html
- Amazon EventBridge User Guide: Monitoring EventBridge metrics: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html

## Issues Found
- The CLI examples used `aws schemas put-discoverer`, but the current AWS CLI command for starting schema discovery is `aws schemas create-discoverer`. Updated both examples.
- The CLI examples used `--cross-account false`, but the AWS CLI exposes this as `--cross-account` / `--no-cross-account` boolean flags. Updated the examples to use `--no-cross-account`.
- The post described discovered output as a JSON Schema definition. EventBridge supports OpenAPI 3 and JSONSchema Draft4 schema formats, so the wording was narrowed to "schema definition."
- The code binding workflow downloaded bindings immediately after requesting generation. `put-code-binding` returns a generation status, so a `describe-code-binding` check was added before the download step.
- The CloudFormation output used `!Ref SchemaDiscoverer` while describing it as a discoverer ID. `Ref` returns the discoverer ARN, so the output now uses `!GetAtt SchemaDiscoverer.DiscovererId`.
- The troubleshooting section referenced the CloudWatch metric `EventsMatched`; the documented EventBridge metric is `MatchedEvents`. Updated the metric name.
- The related-post link pointed back to the same article while describing an observability article. Updated it to the matching microservices observability post.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI verification was performed against the official AWS CLI command reference rather than local `aws --help` output.
- EventBridge schema discovery is not supported for event buses encrypted with a customer managed KMS key, and events larger than 1000 KiB are not discovered. Those caveats are accurate future improvements but were not added because the task called for correcting technical errors rather than expanding the article.
