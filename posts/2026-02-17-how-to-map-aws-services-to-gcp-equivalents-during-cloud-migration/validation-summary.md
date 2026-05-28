# Validation Summary: How to Map AWS Services to GCP Equivalents During Cloud Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS compute, storage, database, networking, security, and DevOps services
- Google Cloud Compute Engine, Cloud Run, GKE, App Engine, Cloud Batch
- Cloud Storage, Filestore, Persistent Disk, Storage Transfer Service
- Cloud SQL, AlloyDB, Firestore, Bigtable, Memorystore, BigQuery
- Google Cloud VPC, Cloud DNS, Cloud CDN, Cloud Load Balancing, Cloud Interconnect, Cloud VPN, Network Connectivity Center
- Cloud IAM, Identity Platform, Cloud KMS, Secret Manager, Security Command Center, Cloud Armor
- Cloud Build, Cloud Deploy, Cloud Monitoring, Cloud Logging, Cloud Trace
- Google Cloud migration services

## Sources Consulted
- Google Cloud service comparison: https://cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison
- Compute Engine managed instance group autoscaling: https://cloud.google.com/compute/docs/autoscaler
- Compute Engine managed instance group rolling updates: https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups
- Google Cloud VPC overview: https://cloud.google.com/vpc/docs/vpc
- gcloud compute networks create reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/create
- gcloud compute networks subnets create reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- Cloud Storage Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- Storage Transfer Service S3 transfers: https://cloud.google.com/storage-transfer/docs/create-transfers/agentless/s3
- AWS S3 Glacier storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html
- AWS S3 storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- GKE Autopilot overview: https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview
- Cloud Run documentation: https://cloud.google.com/run/docs
- Google Cloud IAM overview and allow policies: https://cloud.google.com/iam/docs/overview and https://cloud.google.com/iam/docs/allow-policies
- Google Cloud service accounts overview: https://cloud.google.com/iam/docs/service-account-overview
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- Database Migration Service overview: https://cloud.google.com/database-migration/docs/overview

## Issues Found
- Corrected Compute Engine custom machine type wording. Custom machine types allow many CPU and memory combinations, but not arbitrary exact combinations.
- Corrected container service mappings. EKS maps directly to GKE, while ECS workloads may map to GKE or Cloud Run; Fargate can map to Cloud Run or GKE Autopilot depending on workload requirements.
- Corrected the S3 Glacier comparison. Current AWS S3 Glacier storage classes are part of Amazon S3, while the older Amazon S3 Glacier vault service is separate.
- Corrected the S3 Transfer Acceleration mapping. Storage Transfer Service is appropriate for S3-to-Cloud Storage migration, but it is not a direct equivalent to S3 Transfer Acceleration.
- Corrected the command introduction from "gcloud command" to "commands" because the example uses `gsutil`.
- Clarified the DocumentDB mapping. Firestore is a document database, but it is not MongoDB-compatible; MongoDB Atlas on Google Cloud is often a closer compatibility choice.
- Clarified BigQuery pricing. On-demand query pricing is based on bytes processed, but BigQuery also supports capacity-based pricing.
- Corrected Cloud Load Balancing wording. Google Cloud offers both global and regional load balancers, so it is not universally "global by default."
- Corrected VPC subnet wording. Google Cloud VPC networks are global, but subnets are regional; regional subnets in the same VPC can communicate without VPC peering.
- Qualified Database Migration Service support. Continuous replication applies to supported migration paths and destinations.
- Clarified service account scope. Service accounts are created in projects but can be granted access to resources in other projects.

## Review Notes
The code and command examples are syntactically valid for the documented `gsutil` lifecycle workflow and `gcloud compute networks` commands. Some service mappings are necessarily contextual rather than exact one-to-one equivalents, so the post now uses less absolute language where official documentation indicates multiple viable Google Cloud targets.
