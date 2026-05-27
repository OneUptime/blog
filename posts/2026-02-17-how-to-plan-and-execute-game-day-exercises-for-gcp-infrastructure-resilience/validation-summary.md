# Validation Summary: How to Plan and Execute Game Day Exercises for GCP Infrastructure Resilience

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Platform
- Compute Engine managed instance groups
- Cloud SQL high availability and failover
- Cloud Monitoring dashboards and alerting policies
- Cloud Logging
- Google Cloud load balancing backend services
- Cloud Run
- Pub/Sub
- DNS and SSL/TLS certificates
- Chaos engineering and SRE game day practices

## Sources Consulted
- Google Cloud CLI reference: `gcloud monitoring dashboards create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud CLI reference: `gcloud monitoring policies list` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/list
- Google Cloud CLI reference: `gcloud logging read` - https://cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud CLI reference: `gcloud compute instance-groups managed list-instances` - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/list-instances
- Google Cloud CLI reference: `gcloud compute instance-groups managed recreate-instances` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/recreate-instances
- Google Cloud documentation: Work with managed instances in a MIG - https://docs.cloud.google.com/compute/docs/instance-groups/working-with-managed-instances
- Google Cloud CLI reference: `gcloud sql instances failover` - https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/failover
- Google Cloud documentation: Cloud SQL high availability - https://docs.cloud.google.com/sql/docs/postgres/high-availability
- Google Cloud CLI reference: `gcloud compute backend-services remove-backend` - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/remove-backend

## Issues Found
- The Cloud SQL success criteria referred to automatic failover "to replica." Cloud SQL HA failover uses a standby instance within a regional HA instance, not a normal read replica. Changed the wording to "the standby instance."
- The alerting policy verification command used `gcloud alpha monitoring policies list`. A generally available `gcloud monitoring policies list` command exists and is current, so the command was updated to the GA form.
- The Compute Engine scenario used `gcloud compute instances stop` directly against a VM in a managed instance group while expecting the MIG to recreate it. Google Cloud documentation recommends using managed instance group operations for reliable changes to MIG instances. Changed the example to `gcloud compute instance-groups managed recreate-instances` and adjusted the surrounding text and timestamp example accordingly.

## Review Notes
The remaining commands and examples are technically plausible for the described game day scenarios. Some examples assume that the referenced resources already exist, that the Cloud SQL instance is configured for high availability, and that the load balancer uses instance group backends matching the flags shown.
