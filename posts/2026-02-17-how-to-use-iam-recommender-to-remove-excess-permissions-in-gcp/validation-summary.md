# Validation Summary: How to Use IAM Recommender to Remove Excess Permissions in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- IAM Recommender / Policy Intelligence
- Active Assist / Recommender API
- Google Cloud CLI (`gcloud`)
- Terraform / Infrastructure as Code
- BigQuery export for recommendations

## Sources Consulted
- Google Cloud Policy Intelligence: Overview of role recommendations: https://docs.cloud.google.com/policy-intelligence/docs/role-recommendations-overview
- Google Cloud Policy Intelligence: Review and apply role recommendations: https://docs.cloud.google.com/policy-intelligence/docs/review-apply-role-recommendations
- Google Cloud Recommender: Recommendations key concepts: https://docs.cloud.google.com/recommender/docs/key-concepts
- Google Cloud Recommender: Recommenders list: https://cloud.google.com/recommender/docs/recommenders
- Google Cloud SDK: `gcloud recommender recommendations list`: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- Google Cloud SDK: `gcloud recommender recommendations describe`: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/describe
- Google Cloud SDK: `gcloud recommender recommendations mark-claimed`: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/mark-claimed
- Google Cloud Recommender: Using recommendations for Infrastructure as Code: https://cloud.google.com/recommender/docs/tutorial-iac
- Google Cloud Recommender: Export recommendations to BigQuery: https://cloud.google.com/recommender/docs/bq-export/export-recommendations-to-bq

## Issues Found
- The post said IAM Recommender looks at 90 days of activity logs. Updated this to say it uses aggregated IAM access data and up to 90 days of permission usage data, which matches the official role recommendations overview.
- The post implied 60 days of IAM activity is generally enough. Updated this to explain that the default minimum observation period is 90 days, with configurable 30- or 60-day project-level observation periods.
- The post listed "Combine roles" as a recommendation category and described it as a single custom role replacing multiple predefined roles. Updated this to "Create custom role," matching IAM Recommender's documented custom-role recommendation behavior.
- The post said each recommendation includes a confidence level. Removed that claim because the documented recommendation fields include priority, impact, state, etag, operations, subtype, and related insight references, not a general confidence level.
- The Terraform section incorrectly said `policy-library` converts recommendations into policy-as-code formats. Replaced this with the documented Google Cloud IaC pattern that parses recommendations and maps them to Terraform-managed IAM policy bindings.
- The monitoring section recommended a Cloud Monitoring metric-based alert for ACTIVE P1 recommendations. Replaced this with BigQuery export or scheduled Recommender API polling, which are documented paths for programmatic recommendation review.

## Review Notes
The `gcloud recommender recommendations list`, `describe`, `mark-claimed`, and `mark-succeeded` command patterns are consistent with the current Google Cloud CLI documentation. Applying the IAM changes still needs human review because IAM Recommender recommendations do not account for every external access-control system or rare operational workflow.
