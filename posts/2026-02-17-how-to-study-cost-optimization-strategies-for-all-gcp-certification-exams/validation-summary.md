# Validation Summary: How to Study Cost Optimization Strategies for All GCP Certification Exams

## Status
validated

## Post Type
Certification study guide

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine machine type recommendations
- Sustained Use Discounts and Committed Use Discounts
- Preemptible VMs and Spot VMs
- Managed instance group autoscaling
- Google Kubernetes Engine autoscaling
- Cloud Storage storage classes and lifecycle management
- Persistent Disk
- Cloud SQL
- BigQuery
- Google Cloud networking and Private Google Access
- Cloud Billing budgets, reports, exports, and Recommender
- Google Cloud CLI

## Sources Consulted
- Google Cloud CLI: gcloud recommender recommendations list: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- Compute Engine: Apply machine type recommendations: https://cloud.google.com/compute/docs/instances/apply-machine-type-recommendations-for-instances
- Compute Engine: Sustained use discounts: https://cloud.google.com/compute/docs/sustained-use-discounts
- Compute Engine: Committed use discounts overview: https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview
- Compute Engine: Resource-based committed use discounts: https://cloud.google.com/compute/docs/instances/signing-up-committed-use-discounts
- Compute Engine: Spot VMs: https://cloud.google.com/compute/docs/instances/spot
- Compute Engine: Autoscaling based on CPU utilization: https://cloud.google.com/compute/docs/autoscaler/scaling-cpu
- Compute Engine: Managing autoscalers: https://cloud.google.com/compute/docs/autoscaler/managing-autoscalers
- GKE: Spot VMs: https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- GKE: Node pool auto-creation: https://cloud.google.com/kubernetes-engine/docs/concepts/node-auto-provisioning
- Cloud Storage: Storage classes: https://cloud.google.com/storage/docs/storage-classes
- BigQuery: Pricing: https://cloud.google.com/bigquery/pricing
- BigQuery: Estimate and control costs: https://cloud.google.com/bigquery/docs/best-practices-costs
- BigQuery: GoogleSQL query syntax for LIMIT: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- VPC: Network pricing: https://cloud.google.com/vpc/network-pricing
- VPC: Private Google Access: https://cloud.google.com/vpc/docs/private-google-access
- VPC: Configure Private Google Access: https://cloud.google.com/vpc/docs/configure-private-google-access
- Google Cloud CLI: gcloud billing budgets create: https://cloud.google.com/sdk/gcloud/reference/billing/budgets/create

## Issues Found
- Sustained Use Discounts were described as applying to N1, N2, and N2D with up to 30% discount. Updated this to state that eligible resources can receive up to 20% or 30%, depending on resource and machine type.
- Committed Use Discounts were described with fixed 1-year and 3-year discount percentages and as applying across a project. Updated this to avoid over-specific fixed rates and to clarify that resource-based commitments are typically scoped by project and region unless discount sharing is configured.
- Preemptible and Spot VM pricing was described as up to 80% less. Updated this to reflect current Spot VM documentation, which states discounts up to 91% for many resources.
- BigQuery pricing used legacy "flat-rate" terminology and an outdated $5 per TB on-demand price. Updated this to current on-demand and capacity pricing terminology, including the $6.25 per TiB figure used in many US regions after the free monthly tier.
- The LIMIT cost note was too broad. Updated it to match BigQuery documentation: LIMIT does not reduce cost for non-clustered tables, while clustered tables can be different.
- Private Google Access was described as avoiding egress charges. Updated this to the more accurate statement that it lets VMs without external IPs access Google APIs and services through Google's network, while product-specific data transfer charges can still apply.

## Review Notes
The Google Cloud CLI is not installed in this workspace, so command validation was performed against the official Google Cloud CLI reference rather than local `gcloud --help` output. The post remains technically relevant and includes commands, configuration, SQL, and GCP architecture guidance.
