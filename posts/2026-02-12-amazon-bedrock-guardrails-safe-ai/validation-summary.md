# Validation Summary: How to Use Amazon Bedrock Guardrails for Safe AI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Bedrock Guardrails
- AWS SDK for Python (Boto3)
- Amazon Bedrock Runtime `InvokeModel`
- Amazon Bedrock Runtime `ApplyGuardrail`
- Amazon CloudWatch metrics
- Anthropic Claude Messages API on Amazon Bedrock

## Sources Consulted
- AWS Boto3 `create_guardrail` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock/client/create_guardrail.html
- AWS Boto3 `invoke_model` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-runtime/client/invoke_model.html
- AWS Boto3 `apply_guardrail` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-runtime/client/apply_guardrail.html
- Amazon Bedrock `InvokeModel` API Reference: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
- Amazon Bedrock Guardrails user guide: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html
- Amazon Bedrock guardrail testing guide: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-test.html
- Amazon Bedrock contextual grounding filter API Reference: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_GuardrailContextualGroundingFilterConfig.html
- Amazon Bedrock Guardrails CloudWatch metrics documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring-guardrails-cw-metrics.html
- Amazon Bedrock Anthropic Claude Messages API documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html

## Issues Found
- The `InvokeModel` examples applied a guardrail without explicitly setting `contentType='application/json'`. AWS documents that guardrail-enabled model invocations must use JSON content type, so the examples now include it.
- The intervention handling example checked for `stop_reason == 'guardrail_intervened'`, which is not the Bedrock guardrail action field documented for `InvokeModel`. The example now checks `amazon-bedrock-guardrailAction == 'INTERVENED'`.
- The intervention handling section said the response includes metadata about what was blocked and why, but the example did not enable Bedrock tracing. The example now passes `trace='ENABLED'` so guardrail trace details can be returned.

## Review Notes
- The Python snippets were syntax-checked successfully with `python3`.
- The current Boto3/Botocore service model was not available locally because Botocore is not installed in this environment, so API validation was performed against the current official AWS documentation.
- The post uses a DRAFT guardrail version in examples, which is valid for testing. Production applications should use a numbered guardrail version after calling `create_guardrail_version`.
