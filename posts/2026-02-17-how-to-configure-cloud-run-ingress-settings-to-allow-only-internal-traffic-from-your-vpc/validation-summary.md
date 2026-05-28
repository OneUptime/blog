# Validation Summary: How to Configure Cloud Run Ingress Settings to Allow Only Internal Traffic from

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Cloud Run ingress settings
- Serverless VPC Access
- Direct VPC egress
- Cloud Load Balancing
- Cloud Scheduler
- Pub/Sub
- Cloud Tasks
- Eventarc
- Terraform Google provider
- Google Cloud CLI
- Python service-to-service authentication

## Sources Consulted
- Google Cloud Run ingress documentation: https://docs.cloud.google.com/run/docs/securing/ingress
- Google Cloud Run private networking documentation: https://docs.cloud.google.com/run/docs/securing/private-networking
- Google Cloud Run Direct VPC egress documentation: https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK `gcloud scheduler jobs create http` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Terraform Google provider `google_cloud_run_v2_service` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service

## Issues Found
- The post described `internal` ingress as allowing Cloud Load Balancing generally. Corrected this to Internal Application Load Balancers; external Application Load Balancers require `internal-and-cloud-load-balancing`.
- The Mermaid diagram treated all load balancer traffic as one source. Updated it to distinguish External Application Load Balancers from Internal Application Load Balancers.
- The post implied that Cloud Run-to-Cloud Run traffic only needs VPC egress configured. Corrected this to state that the request must route through a VPC path.
- The Cloud Run caller example used `--vpc-egress=private-ranges-only`, which does not route normal `run.app` URL traffic through the VPC. Changed it to `--vpc-egress=all-traffic` and noted the need for Private Google Access on the subnet.
- The post described Shared VPC traffic too broadly. Added the documented cases where Shared VPC traffic is recognized as internal.
- The Cloud Scheduler explanation omitted the documented `run.app` URL and VPC Service Controls caveat. Added that qualification.
- The troubleshooting note for internal calls was too broad. Updated it with the routing options documented by Google.

## Review Notes
The Google Cloud CLI and Terraform ingress values in the post are current. The Python ID token example is consistent with Cloud Run service-to-service authentication patterns, assuming the caller service account has `roles/run.invoker` on the target service.
