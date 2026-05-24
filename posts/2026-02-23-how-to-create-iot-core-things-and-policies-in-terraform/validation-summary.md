# Validation Summary: How to Create IoT Core Things and Policies in Terraform

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Terraform (1.0+)
- HashiCorp AWS Provider (~> 5.0)
- HashiCorp TLS Provider (~> 4.0)
- AWS IoT Core (Things, Thing Types, Thing Groups, Certificates, Policies, Topic Rules)
- AWS IAM (Roles, Role Policies, Service Principals)
- AWS DynamoDB (PAY_PER_REQUEST table for telemetry)
- MQTT (publish/subscribe, topic filters)
- X.509 certificates (RSA 2048-bit, CSR-based registration)
- AWS IoT SQL (version 2016-03-23, `topic()`, `timestamp()` functions)

## Sources Consulted
- Terraform AWS provider — `aws_iot_thing`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing
- Terraform AWS provider — `aws_iot_thing_type`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing_type
- Terraform AWS provider — `aws_iot_thing_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing_group
- Terraform AWS provider — `aws_iot_thing_group_membership`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing_group_membership
- Terraform AWS provider — `aws_iot_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_certificate
- Terraform AWS provider — `aws_iot_thing_principal_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_thing_principal_attachment
- Terraform AWS provider — `aws_iot_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_policy
- Terraform AWS provider — `aws_iot_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_policy_attachment
- Terraform AWS provider — `aws_iot_topic_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iot_topic_rule
- Terraform AWS provider — `aws_iot_endpoint` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iot_endpoint
- Terraform TLS provider — `tls_private_key` / `tls_cert_request`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs
- AWS IoT Core developer guide — Basic policy variables: https://docs.aws.amazon.com/iot/latest/developerguide/basic-policy-variables.html
- AWS IoT Core developer guide — AWS IoT SQL reference: https://docs.aws.amazon.com/iot/latest/developerguide/iot-sql-reference.html
- AWS IoT Core developer guide — Rule actions (DynamoDBv2, Republish): https://docs.aws.amazon.com/iot/latest/developerguide/iot-rule-actions.html
- Terraform language — String literal escape (`$${...}`): https://developer.hashicorp.com/terraform/language/expressions/strings#escape-sequences

## Issues Found
No technical issues found.

## Review Notes
- The escape pattern `$${iot:Connection.Thing.ThingName}` inside `jsonencode` is correct: HCL interprets `${...}` as interpolation, so `$$` is required to render a literal `$` in the resulting JSON. The post explicitly calls this out, which is helpful.
- The IoT SQL `topic(n)` function is 1-indexed; for `FROM 'devices/+/telemetry'`, `topic(2)` correctly resolves to the value matched by the `+` wildcard (the device ID).
- `aws_iot_topic_rule` uses the `dynamodbv2` block with a nested `put_item { table_name = ... }` — this matches the provider schema. `dynamodbv2` writes the entire MQTT message JSON as table attributes (vs. the older `dynamodb` block which is column-based); the SQL `SELECT` shapes what is written, so `device_id` and `timestamp` from the SQL aliases become the hash/range keys as defined.
- The IAM trust policy uses the correct service principal (`iot.amazonaws.com`) for AWS IoT topic rule actions.
- `aws_iot_policy_attachment` (used here to attach a policy to a certificate target) is current; AWS recommends attaching policies to certificates for device-scoped permissions.
- Provider version constraints (`hashicorp/aws ~> 5.0`, `hashicorp/tls ~> 4.0`) are current as of the validation date.
- Minor non-blocking observation: the `aws_iot_thing_type` `properties` block is marked ForceNew on changes — adjusting `searchable_attributes` later requires recreation. Out of scope for this tutorial but worth noting for future readers managing long-lived fleets.
