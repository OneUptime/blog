# Validation Summary: How to Create a Memorystore for Redis Instance Using the gcloud CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud CLI
- Redis
- VPC networking and private services access
- Service Networking API

## Sources Consulted
- Google Cloud CLI reference for `gcloud redis instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud Memorystore for Redis create and manage instances documentation: https://cloud.google.com/memorystore/docs/redis/create-manage-instances
- Google Cloud Memorystore for Redis quickstart using the gcloud CLI: https://docs.cloud.google.com/memorystore/docs/redis/create-instance-gcloud
- Google Cloud Memorystore for Redis networking documentation: https://docs.cloud.google.com/memorystore/docs/redis/networking
- Google Cloud Memorystore for Redis supported versions documentation: https://cloud.google.com/memorystore/docs/redis/supported-versions
- Google Cloud Memorystore for Redis REST resource reference: https://cloud.google.com/memorystore/docs/redis/reference/rest/v1/projects.locations.instances
- Google Cloud Memorystore for Redis pricing documentation: https://cloud.google.com/memorystore/docs/redis/pricing

## Issues Found
- The introduction implied Google handles replication and failover for Memorystore generally. Updated it to clarify that replication and automatic failover apply to Standard tier instances.
- The networking section described private services access as enabling private IP. Memorystore for Redis uses internal IP addresses regardless of connection mode, so the wording was changed to focus on using a specific network with private services access.
- The private services access setup omitted enabling the Service Networking API. Added `gcloud services enable servicenetworking.googleapis.com` before creating the private services connection.
- The verification section said `describe` shows memory usage. The command returns configured memory size and instance details, not runtime memory usage, so the wording was corrected.
- The automation script claimed to wait for readiness but only checked the current state once. Updated the text and echo message to say it checks instance state.
- The pricing section listed a stale Standard tier 1 GiB price of about `$0.098/hr` and estimated a 5 GiB Standard tier instance at `$350-400/month`. Updated these to the current `us-central1` published values: about `$0.064/hr` for 1 GiB Standard tier and roughly `$200/month` for 5 GiB Standard tier before discounts and applicable network charges.

## Review Notes
The Google Cloud CLI was not installed in the local workspace, so command validation was performed against official Google Cloud CLI and Memorystore documentation rather than local `gcloud --help` output. The examples use Redis 7.0, which is still supported, though Redis 7.2 is also available.
