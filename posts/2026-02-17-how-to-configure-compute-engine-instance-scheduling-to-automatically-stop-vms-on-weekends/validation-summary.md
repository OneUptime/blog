# Validation Summary: How to Configure Compute Engine Instance Scheduling to Automatically Stop VMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine instance schedules and resource policies
- Google Cloud CLI
- Cloud Scheduler
- Cloud Run functions / Cloud Functions 2nd gen
- Python Functions Framework
- Google Cloud Compute Python client
- IAM service accounts and roles

## Sources Consulted
- Google Cloud Compute Engine instance schedules: https://docs.cloud.google.com/compute/docs/instances/schedule-instance-start-stop
- gcloud instance schedule command reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/resource-policies/create/instance-schedule
- gcloud instance resource policy commands: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/add-resource-policies and https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/remove-resource-policies
- Cloud Scheduler HTTP job command reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Scheduler authenticated HTTP targets: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Cloud Run functions authenticated invocation: https://docs.cloud.google.com/functions/docs/securing/authenticating
- Google Cloud Compute Python client, InstancesClient: https://docs.cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.instances.InstancesClient
- Google Cloud Compute Python client, ZonesClient: https://docs.cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.zones.ZonesClient
- Compute Engine instances.list REST filter reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/instances/list
- Compute Engine IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/compute
- Compute Engine VM instance pricing: https://cloud.google.com/compute/vm-instance-pricing

## Issues Found
- The Cloud Function sample used `filter_=` as a flattened argument to `InstancesClient.list()`. The current Google Cloud Compute Python client documents the flattened `list()` method with `project` and `zone`, but not `filter_`; filtering should be supplied through `compute_v1.ListInstancesRequest(filter=...)`. Updated the code sample to construct a `ListInstancesRequest` and pass it as `request`.
- The Cloud Scheduler / Cloud Functions method deployed the function as private and used an OIDC service account, but did not grant the service account permission to invoke the 2nd gen function. Added `gcloud functions add-invoker-policy-binding`, which grants the required invoker binding for the function.
- The Cloud Function runtime service account was used to list, start, and stop VMs, but the post did not grant it Compute Engine permissions. Added a `roles/compute.instanceAdmin.v1` project IAM binding so the function can manage the targeted instances.

## Review Notes
The native instance schedule commands, cron examples, Cloud Scheduler job flags, VM label commands, shutdown-script metadata command, and pricing estimate were consistent with the official documentation reviewed. For production use, a custom IAM role limited to the exact list/start/stop permissions could be used instead of `roles/compute.instanceAdmin.v1`.
