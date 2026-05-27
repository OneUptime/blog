# Validation Summary: How to Set Up Organization Policy Constraints to Restrict Resource Locations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Organization Policy Service
- Resource Location Restriction constraint (`constraints/gcp.resourceLocations`)
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Cloud Audit Logs and log-based metrics

## Sources Consulted
- Google Cloud Organization Policy: Restrict resource locations: https://docs.cloud.google.com/organization-policy/restrict-locations
- Google Cloud Organization Policy: Services that support restricting resource locations: https://docs.cloud.google.com/organization-policy/reference/restrict-locations-supported-services
- Google Cloud Organization Policy: Scope organization policies with tags: https://docs.cloud.google.com/organization-policy/scope-policies
- Google Cloud SDK: `gcloud resource-manager org-policies set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud SDK: `gcloud org-policies set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/org-policies/set-policy
- Terraform Registry: `google_org_policy_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy
- Google Cloud Pub/Sub: Configure message storage policies: https://docs.cloud.google.com/pubsub/docs/resource-location-restriction

## Issues Found
- The post enumerated the regions included in `in:us-locations`, which was incomplete and brittle because Google value groups include current and future locations. Updated the text to describe the value group without a fixed region list.
- The zone example did not show the correct form for a specific zone. Added `us-central1-a` as an example.
- The conditional policy YAML used the legacy `constraint` / `listPolicy` shape without a `condition`, so it did not actually demonstrate a tag-based condition. Replaced it with the current `name` / `spec.rules.condition` format used by `gcloud org-policies set-policy`.
- The heading referred to "Policy Tags", which is misleading for Organization Policy conditions. Updated it to "Resource Manager Tags".
- The service coverage table described Pub/Sub as topic-location enforcement. Updated it to clarify that the constraint affects Pub/Sub message storage locations while standard topics remain global resources.
- The service coverage table used the older "Cloud Functions" label. Updated it to "Cloud Run functions" to match current Google Cloud naming.
- The Compute Engine coverage entry overstated snapshots and images. Clarified that snapshots and images are covered when storage locations are specified.
- The monitoring command filtered `protoPayload.status.message`, but the documented constraint violation text appears in the response error message. Updated the log filter to use `protoPayload.response.error.message`.
- The log-based metric command was described as creating an alert. Updated the wording to say it creates a metric that can be used for alerting.

## Review Notes
The legacy `gcloud resource-manager org-policies set-policy` examples are still documented and valid, but Google also documents the newer `gcloud org-policies set-policy` command and v2 policy YAML format. A future refresh could standardize the whole article on the newer v2 policy format.
