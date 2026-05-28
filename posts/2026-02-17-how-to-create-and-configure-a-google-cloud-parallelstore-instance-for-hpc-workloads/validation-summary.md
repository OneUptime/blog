# Validation Summary: How to Configure a Google Cloud Parallelstore Instance for HPC Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Parallelstore
- Google Cloud CLI
- Private Service Access and VPC networking
- Compute Engine
- DAOS client and dfuse
- Cloud Storage import/export
- Python client libraries for Parallelstore and Compute Engine

## Sources Consulted
- Google Cloud Parallelstore overview: https://docs.cloud.google.com/parallelstore/docs/overview
- Google Cloud Parallelstore VPC configuration: https://docs.cloud.google.com/parallelstore/docs/vpc
- Google Cloud Parallelstore instance creation: https://docs.cloud.google.com/parallelstore/docs/create-instance
- Google Cloud Parallelstore Compute Engine connection guide: https://docs.cloud.google.com/parallelstore/docs/connect-from-compute-engine
- Google Cloud Parallelstore performance considerations: https://docs.cloud.google.com/parallelstore/docs/performance
- Google Cloud Parallelstore Cloud Storage transfer guide: https://docs.cloud.google.com/parallelstore/docs/transfer-data
- Google Cloud Parallelstore REST Instance resource: https://docs.cloud.google.com/parallelstore/docs/reference/rest/v1/projects.locations.instances
- Google Cloud Parallelstore Python client reference: https://docs.cloud.google.com/python/docs/reference/google-cloud-parallelstore/latest/google.cloud.parallelstore_v1.services.parallelstore.ParallelstoreClient
- Google Cloud Parallelstore Python Instance type reference: https://docs.cloud.google.com/python/docs/reference/google-cloud-parallelstore/latest/google.cloud.parallelstore_v1.types.Instance
- Google Cloud Compute Engine Python client reference: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.instances.InstancesClient

## Issues Found
- The post described microsecond-level latency and generic "hundreds of GB/s" throughput. Updated the claims to match documented Parallelstore performance language: throughput scales with provisioned capacity and small-read latency is sub-millisecond.
- The prerequisites said Compute Engine instances only needed to be in the same region. Updated this to the same zone, which is the documented best-practice placement for Parallelstore clients.
- The networking commands enabled only the Parallelstore API and omitted Service Networking and the required client firewall rule. Added `servicenetworking.googleapis.com`, CIDR lookup, and a TCP ingress firewall rule for the Private Service Access range.
- The create, describe, and delete examples used `gcloud parallelstore`. Updated them to `gcloud beta parallelstore`, matching current Google Cloud documentation.
- The create example omitted file and directory striping settings. Added documented striping flags to the CLI example and equivalent Python client fields.
- The describe example used `daoVersion`, and the Python sample printed the deprecated `daos_version` field. Removed those references and kept the output to non-deprecated instance details.
- The DAOS install script installed `daos-client` without first adding the Parallelstore package repository. Added the documented Ubuntu/Debian repository setup before installation.
- The mount flow used a generic systemd service start for Ubuntu, omitted `include_fabric_ifaces`, omitted `/etc/fuse.conf` setup for multi-user mounts, and did not include the recommended `--multi-user`, `--disable-wb-cache`, thread count, and event queue flags. Updated the manual script and startup script to follow the Compute Engine connection guide.
- The import/export sections omitted the Cloud Storage IAM requirement for the Parallelstore service agent. Added a short note that the service agent needs bucket access, such as `roles/storage.admin`.

## Review Notes
The Python examples were syntax-checked with `ast.parse`. The local environment did not have `gcloud` or the Google Cloud Python libraries installed, so CLI execution and runtime client-library validation were performed against official Google Cloud documentation rather than local command execution.
