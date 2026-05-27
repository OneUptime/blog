# Validation Summary: How to Perform Cloud Forensic Investigation and Evidence Preservation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Compute Engine persistent disks and snapshots
- VPC firewall rules and VPC Flow Logs
- Cloud Logging and Cloud Audit Logs
- Cloud Storage retention policies and Bucket Lock
- Google Cloud Python client libraries
- Python
- gcloud CLI

## Sources Consulted
- Google Cloud SDK reference: `gcloud compute disks snapshot` - https://cloud.google.com/sdk/gcloud/reference/compute/disks/snapshot
- Google Cloud SDK reference: `gcloud compute snapshots create` - https://cloud.google.com/sdk/gcloud/reference/compute/snapshots/create
- Google Cloud SDK reference: `gcloud compute disks create` - https://cloud.google.com/sdk/gcloud/reference/compute/disks/create
- Google Cloud SDK reference: `gcloud compute instances create` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference: `gcloud compute firewall-rules create` - https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud VPC firewall rules overview - https://cloud.google.com/firewall/docs/firewalls
- Google Cloud Logging query language - https://cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud SDK reference: `gcloud logging read` - https://cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud SDK reference: `gcloud logging sinks create` - https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Audit Logs overview - https://cloud.google.com/logging/docs/audit
- Google Cloud Data Access audit log configuration - https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud Python Compute client reference - https://cloud.google.com/python/docs/reference/compute/latest
- Google Cloud Python Logging client reference - https://cloud.google.com/python/docs/reference/logging/latest/google.cloud.logging_v2.client.Client
- Cloud Storage Bucket Lock and retention policies - https://cloud.google.com/storage/docs/bucket-lock
- Cloud Storage retention policy commands - https://cloud.google.com/storage/docs/using-bucket-lock

## Issues Found
- The VM isolation firewall command used `--direction=BOTH`, but VPC firewall rules only support ingress or egress direction per rule. Split it into separate ingress and egress deny rules.
- The isolation comments claimed the commands moved the VM to an isolated network, but they only replaced network tags. Updated the wording to match the actual commands.
- The Cloud Logging filters used `logName:` substring matching with unencoded audit log IDs. Replaced these with the documented `log_id(...)` function.
- The audit log export omitted Policy Denied audit logs and implied Data Access logs are always available. Added Policy Denied logs and noted that most Data Access logs must already be enabled.
- The log sink command used an unsupported `--destination` flag. Changed the destination to the required positional argument.
- The snapshot copy command used unsupported `gcloud compute snapshots create --source-snapshot` and `--source-snapshot-project` flags. Replaced it with disk creation from the source snapshot in the forensic project.
- The Python collector imported `asset_v1` but did not use it. Removed the unused import.
- The Python collector called `collect_network_config`, `_list_zones`, and `_extract_metadata` without defining them. Added implementations using Compute Engine Python clients.
- The Python collector could stringify protobuf audit-log payloads, losing structured fields needed by the timeline and service account activity logic. Added protobuf-to-dict conversion with `MessageToDict`.
- The Python collector used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware UTC timestamps.
- The chain-of-custody section overstated hashes as proof of non-tampering and called the bucket write-once without locking the retention policy. Updated the wording and added the irreversible retention-policy lock command.

## Review Notes
The post is technically relevant and the corrected commands and Python snippets are aligned with current Google Cloud documentation. In a production incident runbook, the log sink writer identity still needs write permission on the destination bucket, and Data Access audit logs must be enabled before the incident for most services.
