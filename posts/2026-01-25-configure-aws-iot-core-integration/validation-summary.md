# Validation Summary: How to Configure AWS IoT Core Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS IoT Core
- AWS IoT Things, Thing Types, Thing Groups, and certificates
- AWS IoT policies and policy variables
- MQTT and AWS IoT Device Shadow MQTT topics
- AWS IoT Rules Engine
- DynamoDB, Lambda, CloudWatch Logs, and IAM roles for rules
- Terraform AWS provider
- AWS CLI
- Python with AWS IoT Device SDK for Python v2

## Sources Consulted
- AWS IoT Core Developer Guide: AWS IoT Device SDKs, Mobile SDKs, and AWS IoT Device Client: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sdks.html
- AWS IoT Core Developer Guide: Device Shadow MQTT topics: https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-mqtt.html
- AWS IoT Core Developer Guide: Thing policy variables: https://docs.aws.amazon.com/iot/latest/developerguide/thing-policy-variables.html
- AWS IoT Core Developer Guide: Publish/Subscribe policy examples: https://docs.aws.amazon.com/iot/latest/developerguide/pub-sub-policy.html
- AWS IoT Core Developer Guide: AWS IoT Core action resources: https://docs.aws.amazon.com/iot/latest/developerguide/iot-action-resources.html
- AWS CLI Command Reference: create-thing-type: https://docs.aws.amazon.com/cli/latest/reference/iot/create-thing-type.html
- AWS CLI Command Reference: create-thing: https://docs.aws.amazon.com/cli/latest/reference/iot/create-thing.html
- AWS CLI Command Reference: create-keys-and-certificate: https://docs.aws.amazon.com/cli/latest/reference/iot/create-keys-and-certificate.html
- AWS CLI Command Reference: attach-policy: https://docs.aws.amazon.com/cli/latest/reference/iot/attach-policy.html
- AWS IoT Device SDK for Python v2 documentation: mqtt5_client_builder: https://aws.github.io/aws-iot-device-sdk-python-v2/awsiot/mqtt5_client_builder.html
- AWS IoT Device SDK for Python v2 documentation: iotshadow: https://aws.github.io/aws-iot-device-sdk-python-v2/awsiot/iotshadow.html
- AWS IoT Device SDK for Python v2 GitHub samples: https://github.com/aws/aws-iot-device-sdk-python-v2/tree/main/samples
- Terraform AWS Provider docs: aws_iot_thing_type: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing_type
- Terraform AWS Provider docs: aws_iot_thing: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing
- Terraform AWS Provider docs: aws_iot_thing_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing_group
- Terraform AWS Provider docs: aws_iot_thing_group_membership: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing_group_membership
- Terraform AWS Provider docs: aws_iot_certificate: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_certificate
- Terraform AWS Provider docs: aws_iot_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_policy
- Terraform AWS Provider docs: aws_iot_policy_attachment: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_policy_attachment
- Terraform AWS Provider docs: aws_iot_topic_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_topic_rule

## Issues Found
- The Python examples used the earlier `AWSIoTPythonSDK` v1 package. AWS documents the earlier SDKs as replaced by newer versions and recommends not using them for new projects. Updated both Python examples to use AWS IoT Device SDK for Python v2 (`awsiotsdk`) with `mqtt5_client_builder`, `awscrt.mqtt5`, and `awsiot.iotshadow`.
- The IoT policy granted `iot:GetThingShadow` and `iot:UpdateThingShadow` on thing ARNs, but the Python shadow examples use MQTT shadow topics. AWS IoT Device Shadow over MQTT requires topic-based `iot:Publish`, `iot:Subscribe`, and `iot:Receive` permissions on the reserved `$aws/things/.../shadow/...` topics. Replaced the shadow policy statements in both CLI JSON and Terraform snippets with the required MQTT topic and topicfilter ARNs.
- The IoT policy used thing policy variables without enforcing that the certificate is attached to the thing. Added the documented `iot:Connection.Thing.IsAttached` condition to the `iot:Connect` statement.
- The Terraform topic rule snippet referenced `aws_lambda_function.anomaly_handler.arn` without defining that Lambda resource in the snippet. Changed it to a declared `var.anomaly_handler_lambda_arn` input so the example is internally complete.
- The prerequisites did not include the Python SDK dependency needed by the code examples. Added Python 3.8+ and `awsiotsdk` installation guidance.

## Review Notes
- The local environment did not have `aws` or `terraform` installed, so AWS CLI commands and full Terraform provider validation could not be executed locally. The snippets were checked against official AWS CLI, AWS IoT Core, AWS IoT Device SDK v2, and Terraform AWS provider documentation.
- Local syntax checks passed for all Python code blocks, all HCL code blocks using `python-hcl2`, and the generated IoT policy JSON.
- Terraform certificate outputs are marked `sensitive`, but private keys generated by `aws_iot_certificate` can still be stored in Terraform state. A future security-focused revision could mention secure state backend handling.
