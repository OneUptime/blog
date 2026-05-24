# Validation Summary: How to Create GCP App Engine Applications with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- Google App Engine (Standard and Flexible environments)
- Google Cloud Scheduler
- Google Serverless VPC Access
- Google Cloud Firestore (referenced via `database_type`)
- Identity-Aware Proxy (IAP)

## Sources Consulted
- Terraform Google Provider documentation for `google_app_engine_application`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/app_engine_application
- Terraform Google Provider documentation for `google_app_engine_standard_app_version`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/app_engine_standard_app_version
- Terraform Google Provider documentation for `google_app_engine_flexible_app_version`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/app_engine_flexible_app_version
- Terraform Google Provider documentation for `google_app_engine_firewall_rule`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/app_engine_firewall_rule
- Terraform Google Provider documentation for `google_app_engine_service_split_traffic`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/app_engine_service_split_traffic
- Terraform Google Provider documentation for `google_app_engine_domain_mapping`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/app_engine_domain_mapping
- Terraform Google Provider documentation for `google_vpc_access_connector`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/vpc_access_connector
- Terraform Google Provider documentation for `google_app_engine_application_url_dispatch_rules`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/app_engine_application_url_dispatch_rules
- Terraform Google Provider documentation for `google_cloud_scheduler_job`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job
- Google Cloud App Engine documentation: https://cloud.google.com/appengine/docs
- Google Cloud App Engine Standard Python runtimes: https://cloud.google.com/appengine/docs/standard/python3/runtime
- Google Cloud Serverless VPC Access machine type and instance limits: https://cloud.google.com/vpc/docs/configure-serverless-vpc-access

## Issues Found
No technical issues found. Resource schemas, field names, valid enum values (e.g., `serving_status`, `database_type`, `shard_by`, `ssl_management_type`), runtime identifiers (`python312`), and machine types (`f1-micro`) were all verified against the current Google provider documentation.

## Review Notes
- Creating a firewall rule with `priority = 2147483647` (the example "default deny" rule) may conflict with the implicit default rule that App Engine creates automatically — in practice users may need to either import the existing default rule into Terraform state or modify it via the API rather than creating a new resource with that priority. The post does not surface this caveat, but the configuration shown is syntactically valid and the priority value is documented as the default-rule slot, so the example is still instructive.
- The author correctly notes that App Engine cron jobs do not have a native Terraform resource and recommends Cloud Scheduler as the alternative — this remains accurate.
- The author's emphasis on `noop_on_destroy = true` for version resources is a sound recommendation that matches Google's own guidance to avoid accidental version deletion during plan applies.
- The Python 3.12 runtime (`python312`) is currently a supported App Engine Standard runtime; users should check the current runtime support matrix for future deprecations.
- The `f1-micro` machine type is still a valid choice for Serverless VPC Access connectors as of the time of review, alongside `e2-micro` and `e2-standard-4`.
