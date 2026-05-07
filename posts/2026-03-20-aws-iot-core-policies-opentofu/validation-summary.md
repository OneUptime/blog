# Validation Summary: How to Create AWS IoT Core Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS IoT Core policies
- OpenTofu
- AWS provider for Terraform/OpenTofu
- MQTT topic authorization
- AWS IoT Device Shadow reserved topics
- AWS IoT certificate policy attachments

## Sources Consulted
- AWS IoT Core policies: https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html
- AWS IoT Core action resources: https://docs.aws.amazon.com/iot/latest/developerguide/iot-action-resources.html
- AWS IoT Core policy actions: https://docs.aws.amazon.com/iot/latest/developerguide/iot-policy-actions.html
- Thing policy variables: https://docs.aws.amazon.com/iot/latest/developerguide/thing-policy-variables.html
- Publish/Subscribe policy examples: https://docs.aws.amazon.com/iot/latest/developerguide/pub-sub-policy.html
- Device Shadow MQTT topics: https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-mqtt.html
- OpenTofu strings and templates: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform AWS provider `aws_iot_policy` docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iot_policy.html.markdown
- Terraform AWS provider `aws_iot_policy_attachment` docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iot_policy_attachment.html.markdown

## Issues Found
- The post used `${!iot:...}` inside HCL strings. OpenTofu requires `$${...}` to emit a literal AWS IoT policy variable, so all policy variable references were corrected.
- The sensor example used `iot:GetThingShadow` and `iot:UpdateThingShadow` against a `thing/...` ARN, but the post is describing MQTT device policies. AWS documents MQTT shadow access through reserved shadow topics with `iot:Publish`, `iot:Subscribe`, and `iot:Receive`, so the shadow permissions were rewritten accordingly.
- The sensor policy intro sentence said the sensor could "only publish telemetry data," but the example also granted command and shadow access. The sentence was corrected to match the code.
- The fleet example used a generic `arn:aws:iot:...:*` resource while mixing `iot:Publish`, `iot:Subscribe`, and `iot:Receive`. It was changed to `Resource = "*"` for the intentionally broad example.

## Review Notes
- OpenTofu CLI was not installed in this workspace, so `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` were verified against official OpenTofu CLI documentation rather than local `--help` output.
- The post now uses MQTT shadow topic permissions. If the post is later expanded to cover the Device Shadow REST API instead of MQTT, that example should use `iot:GetThingShadow` and `iot:UpdateThingShadow` with the `thing/...` resource type.
