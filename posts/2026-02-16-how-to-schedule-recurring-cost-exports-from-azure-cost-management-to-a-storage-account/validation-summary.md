# Validation Summary: Schedule Recurring Cost Exports from Azure Cost Management to a Storage Account

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cost Management exports
- Azure Storage and Blob lifecycle management
- Azure CLI
- ARM templates
- Azure Synapse serverless SQL
- Azure Data Factory
- Power BI
- Python with Azure Storage Blob SDK and pandas

## Sources Consulted
- Microsoft Learn: Tutorial - Create and manage Cost Management exports: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports
- Microsoft Learn: az costmanagement export CLI reference: https://learn.microsoft.com/en-us/cli/azure/costmanagement/export?view=azure-cli-latest
- Microsoft Learn: Microsoft.CostManagement/exports ARM template reference, 2023-03-01: https://learn.microsoft.com/en-us/azure/templates/microsoft.costmanagement/2023-03-01/exports
- Microsoft Learn: Microsoft.CostManagement/exports ARM template reference, latest: https://learn.microsoft.com/en-us/azure/templates/microsoft.costmanagement/exports
- Microsoft Learn: Enterprise Agreement cost and usage details file schema: https://learn.microsoft.com/en-us/azure/cost-management-billing/dataset-schema/cost-usage-details-ea
- Microsoft Learn: Cost Management dataset schema index: https://learn.microsoft.com/en-us/azure/cost-management-billing/dataset-schema/schema-index
- Microsoft Learn: Azure Synapse OPENROWSET documentation: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Microsoft Learn: Azure Storage Blob SDK for Python download blobs: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-download-python
- Microsoft Learn: az storage account management-policy CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy?view=azure-cli-latest

## Issues Found
- The post said exports automatically deliver CSV files on a daily, weekly, or monthly basis. Current Cost Management exports support CSV or Parquet, and cost and usage export frequencies in the portal are daily or monthly. Updated the wording accordingly.
- The export type descriptions incorrectly stated that actual cost includes RI amortization and that usage-only exports are raw usage without pricing. Updated the descriptions to match Microsoft documentation: actual cost is standard usage and purchase charges as charged, amortized cost spreads eligible purchases such as reservations and savings plans, and usage-only exports contain usage charges without purchase information and are limited in newer experiences.
- The portal section said the first export runs immediately. Microsoft documentation says the export process can take up to 24 hours before data is ready. Updated the wording to say the export is queued after creation.
- The Azure CLI examples used invalid flags: `--schedule-recurrence`, `--recurrence-period-from`, and `--recurrence-period-to`. Replaced them with the documented `--recurrence` and `--recurrence-period from=... to=...` syntax.
- The file layout example omitted the current run-id folder, manifest file, and partitioned data files. Updated the example to show a run folder with `part0.csv` and `manifest.json`, and changed the explanation to tell readers to ingest partitions listed in the manifest.
- The Python example grouped by `ResourceGroupName`, which does not match the EA schema used by the SQL example. Changed it to `ResourceGroup`.
- The management group section was too broad and used `ActualCost`. Microsoft documentation limits management group exports to Enterprise Agreement scopes and usage charges, with no MCA support, multiple currencies, purchases, reservations, savings plans, or amortized cost reports. Updated the explanation and changed the CLI example to `--type "Usage"`.

## Review Notes
The local Azure CLI was not installed in the review environment, so CLI validation was performed against the official Microsoft Learn CLI reference. Column names can vary by agreement type and dataset version; the examples now align with the EA schema and the article's existing SQL sample.
