# Validation Summary: How to Create Score-Based reCAPTCHA Enterprise Site Keys in Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud reCAPTCHA Enterprise
- Google Cloud CLI (`gcloud`)
- reCAPTCHA Enterprise JavaScript API
- Python Google Cloud reCAPTCHA Enterprise client library
- Flask
- Terraform Google provider

## Sources Consulted
- Google Cloud CLI reference: `gcloud recaptcha keys create` - https://docs.cloud.google.com/sdk/gcloud/reference/recaptcha/keys/create
- Google Cloud reCAPTCHA keys overview - https://docs.cloud.google.com/recaptcha/docs/keys
- Google Cloud reCAPTCHA score-based website installation guide - https://docs.cloud.google.com/recaptcha/docs/instrument-web-pages
- Google Cloud reCAPTCHA create assessment sample - https://docs.cloud.google.com/recaptcha/docs/samples/recaptcha-enterprise-create-assessment
- Google Cloud reCAPTCHA annotate assessment sample - https://docs.cloud.google.com/recaptcha/docs/samples/recaptcha-enterprise-annotate-assessment
- Google Cloud reCAPTCHA API reference - https://docs.cloud.google.com/recaptcha/docs/reference/rpc/google.cloud.recaptchaenterprise.v1
- Google Cloud IAM roles for reCAPTCHA Enterprise - https://cloud.google.com/iam/docs/roles-permissions/recaptchaenterprise
- Terraform Google provider `google_recaptcha_enterprise_key` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/recaptcha_enterprise_key

## Issues Found
- The `gcloud recaptcha keys create` command used `--integration-type=SCORE`, but the current `gcloud` command reference lists the CLI value as `score`. Changed the command to `--integration-type=score`.
- The prerequisite list only mentioned the reCAPTCHA Enterprise Admin role. The backend examples create and annotate assessments, which require the reCAPTCHA Enterprise Agent role. Added the Agent role prerequisite.
- The sample key ID contained underscores and did not match the documented reCAPTCHA key shape. Replaced it with the official-style 40-character example format.
- The backend verification example did not return the assessment resource name needed by the later annotation example. Added `response.name` to the printed output and returned result.

## Review Notes
The Terraform resource block matches the current Google provider schema for `google_recaptcha_enterprise_key` web settings. The post's threshold values are example policy choices, not universal recommendations; teams should tune them from production score distributions as the post already notes.
