# Validation Summary: Fix GCE `Insufficient Authentication Scopes` with IAM Roles

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Google Cloud Compute Engine virtual machines
- Google Cloud IAM roles, allow policies, deny policies, and principal access boundary policies
- OAuth 2.0 access scopes
- Google Cloud service accounts and Application Default Credentials
- Compute Engine metadata server
- Google Cloud CLI (`gcloud`)
- Cloud Storage IAM and OAuth scopes
- Managed instance groups and instance templates
- Cloud Audit Logs

## Sources Consulted

- [Compute Engine service accounts and access scopes](https://cloud.google.com/compute/docs/access/service-accounts)
- [Authenticate workloads on VMs by using service accounts](https://cloud.google.com/compute/docs/access/authenticate-workloads)
- [Predefined Compute Engine metadata keys](https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys)
- [View and query VM metadata](https://cloud.google.com/compute/docs/metadata/querying-metadata)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Set up Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc)
- [Change the attached service account and access scopes](https://cloud.google.com/compute/docs/instances/change-service-account)
- [`gcloud compute instances set-service-account`](https://cloud.google.com/sdk/gcloud/reference/compute/instances/set-service-account)
- [`gcloud compute instances create`](https://cloud.google.com/sdk/gcloud/reference/compute/instances/create)
- [`gcloud compute instances stop`](https://cloud.google.com/sdk/gcloud/reference/compute/instances/stop)
- [`gcloud compute instances start`](https://cloud.google.com/sdk/gcloud/reference/compute/instances/start)
- [Stop or restart a Compute Engine instance](https://cloud.google.com/compute/docs/instances/stop-start-instance)
- [Deprecation of CSEK in Compute Engine](https://cloud.google.com/compute/docs/deprecations/csek-deprecation-in-compute-engine)
- [Compute Engine `instances.get`](https://cloud.google.com/compute/docs/reference/rest/v1/instances/get)
- [Compute Engine resource naming conventions](https://cloud.google.com/compute/docs/naming-resources)
- [Require permission to attach service accounts to resources](https://cloud.google.com/iam/docs/service-accounts-actas)
- [Create a VM that uses a user-managed service account](https://cloud.google.com/compute/docs/access/create-enable-service-accounts-for-instances)
- [IAM policy types and evaluation](https://cloud.google.com/iam/docs/policy-types)
- [Cloud Storage IAM](https://cloud.google.com/storage/docs/access-control/iam)
- [Service account security best practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Create instance templates](https://cloud.google.com/compute/docs/instance-templates/create-instance-templates)
- [Automatically apply VM configuration updates in a managed instance group](https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups)
- [Work with managed instances](https://cloud.google.com/compute/docs/instance-groups/working-with-managed-instances)
- [Cloud Audit Logs overview](https://cloud.google.com/logging/docs/audit)
- [Enable Data Access audit logs](https://cloud.google.com/logging/docs/audit/configure-data-access)
- [Troubleshoot `kubectl` insufficient authentication scopes](https://cloud.google.com/kubernetes-engine/docs/troubleshooting/kubectl#insufficient-authentication)

## Issues Found

- The ADC discussion omitted the well-known local ADC file, which is checked before the metadata server, and did not distinguish ADC credentials from the gcloud CLI's credential store. The text and diagnostic checks now cover the complete ADC search order, clearly separate application credentials from gcloud credentials, and direct readers to inspect the failing process's actual user and runtime environment.
- The maintenance commands did not mention required handling for VMs with Local SSD or existing CSEK-encrypted disks. The post now notes the explicit Local SSD stop choice, the key flag and permission required to restart CSEK-protected disks, and the current CSEK deprecation and migration path to CMEK.
- The service-account check returned a failure for an empty value, but the following `printf` masked that status and could let a reader proceed without preserving the attached identity. It now emits an explicit warning, returns failure, and tells the reader not to continue unless the expected email is printed.
- The permission list omitted `compute.instances.get`, which is required by both `gcloud compute instances describe` commands in the workflow. The permission list now includes it.
- The managed instance group guidance could be read as saying that an existing instance template can be updated. Instance templates are immutable, so the post now directs the reader to create a new template and update the group to use it.
- The standalone VM creation example used the literal name `NEW_VM_NAME`, but Compute Engine resource names cannot contain uppercase letters or underscores. It now uses the valid example name `new-vm-name`.
- The validation step implied that every test operation would have a visible audit log. Most Data Access audit logs are disabled by default, so the text now qualifies the check and states that these logs generally require explicit enablement.
- The GKE troubleshooting link used a stale fragment identifier. It now points to the current `#insufficient-authentication` section.

## Review Notes

The remaining commands and explanations were verified as correct. In particular, Compute Engine still documents VM access scopes as a legacy authorization layer that can further restrict OAuth-authenticated gcloud and client-library requests, recommends `cloud-platform` with least-privilege IAM, and states that access scopes do not apply to gRPC calls. The metadata endpoints, scope aliases, stop/set/start sequence, service-account `actAs` requirement, Cloud Storage example, API-enablement distinction, service-account-key warning, managed instance group rollout advice, and linked official references were checked against current Google Cloud documentation. Command syntax was also cross-checked with the locally installed Google Cloud CLI 561.0.0. CSEK is deprecated for Compute Engine; the post's CSEK note applies only to safely restarting existing encrypted disks while they are migrated to CMEK.
