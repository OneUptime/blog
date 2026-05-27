# Validation Summary: How to Use Cloud NAT with Cloud Run Services via Serverless VPC Access in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Serverless VPC Access
- Cloud NAT / Public NAT
- Cloud Router
- Google Cloud CLI (`gcloud`)
- Direct VPC egress

## Sources Consulted
- Google Cloud: Cloud Run VPC with connectors: https://cloud.google.com/run/docs/configuring/vpc-connectors
- Google Cloud: Configure Serverless VPC Access: https://cloud.google.com/vpc/docs/configure-serverless-vpc-access
- Google Cloud SDK: `gcloud compute networks vpc-access connectors create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Google Cloud: Cloud NAT overview: https://cloud.google.com/nat/docs/overview
- Google Cloud: Set up and manage Public NAT: https://cloud.google.com/nat/docs/set-up-manage-network-address-translation
- Google Cloud SDK: `gcloud compute routers nats create`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud: Cloud NAT logs and metrics: https://cloud.google.com/nat/docs/monitoring
- Google Cloud: Direct VPC egress with Cloud Run: https://cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Google Cloud: Create Cloud Run jobs: https://cloud.google.com/run/docs/create-jobs
- Google Cloud SDK: `gcloud run jobs create`: https://cloud.google.com/sdk/gcloud/reference/run/jobs/create

## Issues Found
- The post created an explicit connector subnet, then created the Serverless VPC Access connector with `--network` and `--range` using the same `/28`. That mode asks Google Cloud to create a new connector subnet from an unused range, so it would conflict with the manually created subnet. Changed the primary connector command to use `--subnet=cloudrun-subnet`.
- The verification command deployed `curlimages/curl` as a Cloud Run service. Cloud Run services must keep a container listening for requests; a one-shot curl container exits and is better modeled as a Cloud Run job. Changed the example to `gcloud run jobs create ... --execute-now --wait`.
- The Direct VPC egress section said each instance gets an IP from the subnet. Google Cloud documents a `/26` minimum and states that Cloud Run services use about 2x as many IP addresses as running instances at steady state, with extra capacity needed for revision updates and scale events. Updated the wording accordingly.

## Review Notes
The remaining commands and explanations are consistent with current Google Cloud documentation. The NAT log query may need field-name adjustment in some environments because Cloud NAT log payload field casing can vary in examples, but the resource type and allocation status concept are correct.
