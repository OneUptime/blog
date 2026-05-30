# Validation Summary: How to Use Power BI Dataflows with Azure Data Lake Storage Gen2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Power BI Dataflows
- Azure Data Lake Storage Gen2
- Common Data Model
- Azure CLI
- Azure RBAC
- Azure Databricks / PySpark
- Power BI REST API

## Sources Consulted
- Microsoft Learn: Configure dataflow storage to use Azure Data Lake Gen2 (legacy): https://learn.microsoft.com/en-us/power-bi/transform-model/dataflows/dataflows-azure-data-lake-storage-integration
- Microsoft Learn: Power BI REST API Dataflows - Refresh Dataflow: https://learn.microsoft.com/en-us/rest/api/power-bi/dataflows/refresh-dataflow
- Microsoft Learn: Azure CLI `az storage account create`: https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest#az-storage-account-create
- Microsoft Learn: Azure CLI `az storage fs create`: https://learn.microsoft.com/en-us/cli/azure/storage/fs?view=azure-cli-latest#az-storage-fs-create
- Microsoft Learn: Azure Storage account overview and naming rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview

## Issues Found
- The post implied this is a current Power BI Dataflows capability without qualification. Microsoft now labels this integration as Power BI Dataflow Gen1 and says Dataflow Gen1 is in a legacy state. Added a short clarification in the introduction.
- The prerequisites incorrectly said Premium or Premium Per User was required. Microsoft documents ADLS Gen2 storage locations for both shared/Pro and Premium workspaces. Replaced this with workspace permission requirements.
- The prerequisites and permission steps incorrectly described manually assigning Storage Blob Data Owner to the Power BI service principal. Microsoft documents that the connecting user needs Owner, Storage Blob Data Owner, and Storage Blob Data Reader on the storage account, and Power BI grants the service account rights during connection. Updated the explanation and CLI role assignments accordingly.
- The sample storage account name used uppercase characters, which violates Azure Storage account naming rules. Changed `pbiDataLakeStore` to `pbidatalakestore` throughout.
- The storage filesystem/container was shown as `powerbi-dataflows`, but Microsoft documents that dataflows are stored in the `powerbi` container/filesystem. Updated the CLI, folder structure, and Databricks path.
- The folder structure omitted `model.json.snapshots`, which Microsoft documents as part of the ADLS Gen2 dataflow layout. Added it to the example structure.
- The Databricks path did not match the snapshot-style folder layout described in the article. Updated it to point at the entity snapshot CSV files.
- The Power BI REST API refresh example omitted the required `notifyOption` request body. Added `json={"notifyOption": "NoNotification"}`.
- The common pitfalls section said failures would start if someone removed the Power BI service principal role assignment. Replaced this with Microsoft's documented firewall limitation for ADLS Gen2 storage accounts.

## Review Notes
- The Databricks example uses storage account keys for simplicity. For production workloads, Microsoft and Databricks commonly recommend identity-based access patterns such as managed identities, service principals, or Unity Catalog where applicable.
