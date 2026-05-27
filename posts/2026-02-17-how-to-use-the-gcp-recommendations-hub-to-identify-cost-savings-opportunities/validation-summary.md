# Validation Summary: How to Use the GCP Recommendations Hub to Identify Cost Savings Opportunities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Recommender / Active Assist
- Google Cloud CLI
- Compute Engine rightsizing, idle resource, idle IP address, idle disk, and committed use discount recommenders
- Python Google Cloud Recommender client
- BigQuery
- Cloud Functions
- Looker Studio

## Sources Consulted
- Google Cloud Recommender API usage guide: https://cloud.google.com/recommender/docs/use-api
- Google Cloud Recommenders reference: https://cloud.google.com/recommender/docs/recommenders
- Google Cloud Recommender REST Recommendation resource: https://cloud.google.com/recommender/docs/reference/rest/v1/projects.locations.recommenders.recommendations
- Compute Engine machine type recommendations: https://cloud.google.com/compute/docs/instances/apply-machine-type-recommendations-for-instances
- Compute Engine idle resources recommendations: https://cloud.google.com/compute/docs/viewing-and-applying-idle-resources-recommendations
- Google Cloud VPC network pricing: https://cloud.google.com/vpc/network-pricing
- Google Cloud Recommender pricing: https://cloud.google.com/recommender/pricing

## Issues Found
- The post said each recommendation includes estimated cost impact. Updated this to specify that cost recommendations include estimated cost impact, because Recommender impacts can target cost, security, performance, manageability, sustainability, or reliability, and only cost impacts use cost projections.
- The CLI example used `gcloud recommender recommenders list`, which is not the documented GA flow for listing recommendations. Replaced it with a pointer to the official supported recommender IDs and locations, and kept the documented `gcloud recommender recommendations list` command.
- The rightsizing table format referenced `content.operationGroups[0].operations[0].value.machineType`, but the Recommender operation value for machine type changes is a machine type string such as `zones/us-central1-a/machineTypes/custom-2-5120`. Updated the format expression to use `.value`.
- The post omitted `DISMISSED` from the recommendation state list. Added it to match the current Recommender state enum.
- The Python export example iterated only zones for every recommender, but idle IP address recommendations use regional or global locations. Updated the example to use per-recommender locations and changed the output field from `zone` to `location`.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI validation was performed against official Google Cloud CLI and Recommender documentation rather than local `--help` output.
