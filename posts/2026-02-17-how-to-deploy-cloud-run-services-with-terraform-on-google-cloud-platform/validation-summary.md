# Validation Summary: How to Deploy Cloud Run Services with Terraform on Google Cloud Platform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Terraform
- Google Terraform Provider
- Google Cloud IAM
- Secret Manager
- Serverless VPC Access
- Cloud Run traffic splitting
- Cloud Run custom domain mappings
- Cloud Run health checks

## Sources Consulted
- Google Terraform Provider: `google_cloud_run_v2_service` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Google Terraform Provider: `google_cloud_run_v2_service_iam` resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam
- Google Terraform Provider: `google_cloud_run_domain_mapping` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_domain_mapping
- Cloud Run documentation: Configure secrets for services: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Cloud Run documentation: VPC connectors: https://docs.cloud.google.com/run/docs/configuring/vpc-connectors
- Cloud Run documentation: Rollbacks, gradual rollouts, and traffic migration: https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Cloud Run documentation: Mapping custom domains: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Cloud Run documentation: Configure container health checks: https://docs.cloud.google.com/run/docs/configuring/healthchecks
- Cloud Run documentation: Set minimum instances: https://docs.cloud.google.com/run/docs/configuring/min-instances

## Issues Found
- The traffic splitting example routed 90% of traffic to the latest revision and 10% to the existing revision while describing a canary deployment. Changed it to route 10% to the latest revision and 90% to the existing revision, matching the canary rollout pattern described by Cloud Run documentation.
- The custom domain section used Cloud Run domain mappings without noting their current Preview status and production caveat. Added a short note that Google recommends a global external Application Load Balancer or Firebase Hosting for production custom domains.
- The Secret Manager best practice said never to put secrets in environment variables, which contradicted the post's valid Secret Manager environment-variable example. Clarified that secrets should not be placed directly in plaintext environment variables or Terraform variables.

## Review Notes
The Terraform snippets use current Cloud Run v2 resource fields for containers, resource limits, scaling, service accounts, Secret Manager references, IAM invoker bindings, VPC connectors, probes, traffic targets, and outputs. Terraform was not installed in the workspace, so validation was performed against official Google Cloud and Terraform provider documentation rather than by running `terraform validate`.
