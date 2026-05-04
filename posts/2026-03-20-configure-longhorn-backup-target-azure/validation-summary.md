# Validation Summary: How to Configure Longhorn Backup Target to Azure Blob

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Longhorn (Kubernetes block storage)
- Kubernetes (kubectl, Secrets, CRDs, RecurringJob)
- Azure Blob Storage (StorageV2, lifecycle management)
- Azure CLI (`az`)
- AKS (Azure Kubernetes Service)

## Sources Consulted
- Longhorn official documentation (set backup target): https://longhorn.io/docs/1.11.1/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn backupstore source (Azure Blob driver): https://github.com/longhorn/backupstore/blob/master/azblob/azblob.go and azblob_service.go
- Longhorn open issue tracking Azure managed identity support: https://github.com/longhorn/longhorn/issues/12600
- Longhorn RecurringJob docs: https://longhorn.io/docs/1.11.1/snapshots-and-backups/scheduling-backups-and-snapshots/
- Azure CLI reference for `az storage account create`, `az storage container create`, `az storage account keys list`, `az storage account management-policy create`
- Azure Blob lifecycle management policy schema (Microsoft Learn)

## Issues Found

1. **Incorrect claim of native Azure Managed Identity support.** The "Using Azure Managed Identity (AKS)" section instructed readers to create a Longhorn backup secret with only `AZBLOB_ACCOUNT_NAME` (no account key), implying that Longhorn would authenticate via workload identity. This is not supported in current Longhorn releases — the AZBLOB driver in `backupstore/azblob/azblob_service.go` builds a connection string from `AccountName` + `AccountKey` and has no `DefaultAzureCredential` / workload-identity code path. Longhorn issue #12600 confirms managed-identity support is a not-yet-released feature request. **Fix:** Renamed the section to "Granting RBAC Access (AKS)", removed the incorrect secret example that omitted the account key, and clarified that the Shared Key from Step 1 is still required. Kept the `az role assignment create` example since RBAC role grants on the storage account are still useful guidance. The Conclusion was updated for internal consistency to no longer claim managed identities eliminate credential management.

## Review Notes

- The Azure Blob endpoint host literal in the backup target URL (`azblob://longhorn-backups@core.windows.net/`, NOT `blob.core.windows.net`) looks unusual but matches Longhorn's documented format. Longhorn's parser appends the `blob.` prefix internally when constructing the Azure service URL — leaving this as written is correct.
- `--https-only true` on `az storage account create` is now redundant (HTTPS-only is the default for new accounts) but is still a valid flag and explicit-by-design.
- The `RecurringJob` API version `longhorn.io/v1beta2` is current. Older Longhorn (≤1.7-ish) used `v1beta1`; readers on very old clusters would need to adjust.
- The lifecycle policy JSON (`tierToCool`, `tierToArchive`, `delete` with `daysAfterModificationGreaterThan`, plus `blobTypes` / `prefixMatch` filters) matches Azure's current management-policy schema for `Standard_LRS` `StorageV2` accounts. Note that `tierToArchive` is incompatible with hierarchical-namespace (ADLS Gen2) storage accounts — readers using HNS would need to drop that action.
- Storage account access keys are sensitive; the post correctly stores them in a Kubernetes Secret rather than inlining them in the Setting CR.
