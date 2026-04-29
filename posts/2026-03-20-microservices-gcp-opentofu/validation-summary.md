# Validation Summary: How to Build a Microservices Architecture with OpenTofu on GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Google Kubernetes Engine (GKE)
- GKE Gateway API
- Workload Identity Federation for GKE
- Cloud IAM service accounts
- Cloud Pub/Sub
- Cloud Endpoints / ESPv2

## Sources Consulted
- Terraform Registry: `google_container_cluster` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: `google_container_node_pool` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Terraform Registry: `google_endpoints_service` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/endpoints_service
- Terraform Registry: `google_pubsub_subscription` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Terraform Registry: `google_pubsub_topic_iam_member` and `google_pubsub_subscription_iam_member` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic_iam and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription_iam
- Terraform Registry: `google_project` data source https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/project
- Google Cloud: About Workload Identity Federation for GKE https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud: Dead-letter topics https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud: About GKE cluster autoscaling https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- Google Cloud: About Gateway API https://cloud.google.com/kubernetes-engine/docs/concepts/gateway-api
- Google Cloud: Deploying Gateways https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways
- Google Cloud: About Cloud Endpoints https://cloud.google.com/endpoints/docs/grpc/about-cloud-endpoints

## Issues Found
- The GKE cluster snippet placed `enable_intranode_visibility` inside a `networking_config` block, but the provider exposes it as a top-level argument. I moved it to the correct location so the resource matches the current schema.
- The node pool example mixed `node_count` with `autoscaling`, and on a regional cluster the original limits would apply per zone. I replaced that with `total_min_node_count` and `total_max_node_count`, and added an explicit initial node count so the example is concrete and regionally accurate.
- The Workload Identity explanation used older terminology and implied that linking Kubernetes service accounts to IAM service accounts was the only model. I updated the wording to reflect current Workload Identity Federation for GKE terminology and clarified that direct IAM principals and IAM service account linking are both supported patterns.
- The Pub/Sub dead-letter example omitted required supporting resources and IAM for the Pub/Sub service agent. I added a dead-letter topic subscription plus the required publisher and subscriber IAM bindings so dead-letter forwarding would work as described.
- The Cloud Endpoints section conflated Cloud Endpoints with API Gateway and implied that `google_endpoints_service` alone exposed the API. I renamed the section and added the missing note that this resource deploys the service configuration, while ESPv2 still has to run in front of the GKE service.

## Review Notes
- The post now reflects current Google Cloud terminology and current provider fields as of 2026-04-29.
- Google Cloud currently recommends using IAM principal identifiers directly for many GKE workload access cases. Linking a Kubernetes service account to an IAM service account remains valid when service account impersonation is the better fit.
