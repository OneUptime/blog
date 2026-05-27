# Validation Summary: How to Use Cloud Run Execution Environment Gen2 for Better CPU

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run services
- Cloud Run execution environments Gen1 and Gen2
- gVisor
- gcloud CLI
- Cloud Run service YAML
- Terraform `google_cloud_run_v2_service`
- Python
- Cloud Monitoring

## Sources Consulted
- Google Cloud Run: Select an execution environment for services - https://cloud.google.com/run/docs/configuring/execution-environments
- Google Cloud Run: Container runtime contract - https://cloud.google.com/run/docs/container-contract
- Google Cloud Run: Billing settings for services - https://cloud.google.com/run/docs/configuring/billing-settings
- Google Cloud Run: Configure CPU limits for services - https://cloud.google.com/run/docs/configuring/services/cpu
- Google Cloud SDK: `gcloud run deploy` reference - https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Terraform Registry: `google_cloud_run_v2_service` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service

## Issues Found
- The post described Gen1 as the default. Current Cloud Run documentation says services default to an unspecified execution environment, and Cloud Run can choose either Gen1 or Gen2 based on features. I removed the default label from Gen1 and changed the summary wording from "default" to "choice."
- The post used overly broad wording such as "full Linux kernel compatibility" and "supports all Linux system calls and features." Cloud Run Gen2 provides full Linux compatibility including system calls, namespaces, and cgroups, but containers still run within Cloud Run's security restrictions. I narrowed this language to match the official container contract.
- The feature examples listed `/proc`, `mmap`, and `io_uring` as Gen2-specific indicators. The official guidance specifically calls out NFS, cgroups, Linux compatibility, and software affected by unimplemented gVisor system calls. I replaced the examples with NFS, cgroups, namespaces, and ioctl calls.
- The Python verification snippet used raw socket creation as an environment check. Cloud Run containers have reduced privileges and raw sockets are not a documented Gen2 detection method. I removed that check and added the documented Gen2 signal, `/sys/class/dmi/id/product_name` being set to `Google Compute Engine`.
- The gcloud example used `--cpu-always-allocated`, which is outdated. Current Cloud Run documentation uses `--no-cpu-throttling` to set instance-based billing, formerly called CPU always allocated. I updated the command and surrounding text.
- The compatibility section referred to "full Linux kernel overhead." I changed this to "microVM environment" to avoid implying unrestricted kernel access inside the container.

## Review Notes
The commands, service YAML annotation, Terraform `execution_environment` value, CPU and memory examples, minimum instance example, and benchmark deployment commands are consistent with current official documentation. The benchmark numbers remain illustrative and should be validated against the author's workload if used as published performance evidence.
