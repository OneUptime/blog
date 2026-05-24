# Validation Summary: How to Create Rotating Time Resources with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- hashicorp/time provider (time_rotating resource)
- hashicorp/random provider (random_password resource)
- hashicorp/aws provider (aws_secretsmanager_secret, aws_db_instance, aws_ssm_parameter, aws_kms_key, aws_kms_alias, aws_acm_certificate, aws_cloudwatch_metric_alarm)
- hashicorp/tls provider (tls_private_key, tls_self_signed_cert)
- AWS services: Secrets Manager, RDS (PostgreSQL), SSM Parameter Store, KMS, ACM, CloudWatch

## Sources Consulted
- [time_rotating resource docs](https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/rotating)
- [random_password resource docs](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password)
- [tls_self_signed_cert resource docs](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert)
- [aws_acm_certificate resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate)
- [aws_cloudwatch_metric_alarm resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm)
- [aws_db_instance resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
- [hashicorp/time provider releases](https://releases.hashicorp.com/terraform-provider-time/)

## Issues Found
1. **CloudWatch alarm comparison operator was logically incorrect.** In the "Monitoring Rotation Status" section, the alarm used `comparison_operator = "LessThanThreshold"` with `threshold = each.value.rotation_days - 7` and a stated goal of "Warn 7 days before rotation". Since the `SecretRotationAge` metric grows over time, an alarm should fire when age is at or beyond `rotation_days - 7`, not below it. Changed to `GreaterThanOrEqualToThreshold` so the alarm correctly triggers 7 days before the rotation period elapses.

## Review Notes
- The `time_rotating` provider version is pinned to `~> 0.11` while the current latest is around 0.13.x/0.14.x. The constraint still works (0.11 is a valid published version) and no breaking changes affect the resources/attributes used in the post, so this is left as-is. Future readers may want to bump to `~> 0.12` or later.
- All `time_rotating` arguments used (`rotation_days`, `rotation_hours`) and the `rotation_rfc3339` attribute reads are valid against the official schema.
- The `tls_self_signed_cert` usage correctly omits `key_algorithm` (which was removed as a required argument in tls provider v4.x and is now auto-derived from the private key).
- The `aws_acm_certificate` import arguments (`certificate_body`, `private_key`) are correct.
- The `random_password` resource's `keepers` map correctly forces regeneration when the `time_rotating.X.id` changes.
- In the database password example, applying `random_password.database.result` directly to `aws_db_instance.password` will update the password in-place on the next apply after rotation; this is the expected RDS behavior and works as advertised.
- The KMS example uses `enable_key_rotation = true` (AWS-native annual rotation) alongside the `time_rotating` resource purely as a tag tracker; this is correct and the author calls out the distinction.
