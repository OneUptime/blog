# Validation Summary: How to Create a Basic Deployment Manager Configuration File for GCP Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deployment Manager
- Google Cloud CLI
- Deployment Manager YAML configurations
- Compute Engine
- Cloud Storage
- VPC networks and subnetworks
- Firewall rules
- Pub/Sub, Cloud SQL, and GKE resource types

## Sources Consulted
- Google Cloud Deployment Manager deprecation notice: https://cloud.google.com/deployment-manager/docs/deprecations
- Google Cloud Deployment Manager documentation: https://docs.cloud.google.com/deployment-manager/docs
- Deployment Manager syntax reference: https://cloud.google.com/deployment-manager/docs/configuration/syntax-reference
- Deployment Manager supported resource types: https://cloud.google.com/deployment-manager/docs/configuration/supported-resource-types
- Deployment Manager references documentation: https://docs.cloud.google.com/deployment-manager/docs/configuration/use-references
- gcloud deployment-manager deployments create reference: https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/create
- gcloud deployment-manager deployments update reference: https://docs.cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/update
- gcloud deployment-manager deployments delete reference: https://cloud.google.com/sdk/gcloud/reference/deployment-manager/deployments/delete
- Deployment Manager deleting deployments guide: https://docs.cloud.google.com/deployment-manager/docs/deployments/deleting-deployments
- Compute Engine firewall REST resource reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/firewalls
- Compute Engine instances REST resource reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/instances
- Cloud Storage buckets insert reference: https://docs.cloud.google.com/storage/docs/json_api/v1/buckets/insert

## Issues Found
- Deployment Manager was presented as a current straightforward option for new GCP infrastructure-as-code work. Google discontinued Deployment Manager support on March 31, 2026, so I updated the introduction and conclusion to frame the examples as useful for understanding existing configurations or migration work and to recommend supported tools for new deployments.
- The firewall examples used `IPProtocol: TCP`. The Compute Engine firewall API documents well-known protocol strings as lowercase values such as `tcp`, so I changed both firewall rules to `IPProtocol: tcp`.
- The delete command used `--delete-policy=ABANDON`. The Deployment Manager API uses uppercase policy names, but the current `gcloud` reference defines CLI values as lowercase `abandon` and `delete`, so I changed the command to `--delete-policy=abandon`.

## Review Notes
The remaining Deployment Manager configuration syntax, resource type examples, reference syntax, outputs, preview flow, and update/delete commands match the official Deployment Manager and Google Cloud CLI documentation, subject to the service's March 31, 2026 discontinuation.
