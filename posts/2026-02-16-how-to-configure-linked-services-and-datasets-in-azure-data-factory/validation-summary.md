# Validation Summary: How to Configure Linked Services and Datasets in Azure Data Factory

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Data Factory
- Azure Data Factory linked services
- Azure Data Factory datasets
- Azure Blob Storage connector
- Azure Data Lake Storage Gen2 / Azure BlobFS locations
- Azure SQL Database connector
- SQL Server connector with self-hosted integration runtime
- Azure Key Vault secret references
- Azure Data Factory Copy activity

## Sources Consulted
- Microsoft Learn: Linked services in Azure Data Factory and Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/data-factory/concepts-linked-services
- Microsoft Learn: Datasets in Azure Data Factory and Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/data-factory/concepts-datasets-linked-services
- Microsoft Learn: Copy and transform data in Azure Blob Storage, https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-blob-storage
- Microsoft Learn: Delimited text format in Azure Data Factory and Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/data-factory/format-delimited-text
- Microsoft Learn: Parquet format in Azure Data Factory and Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/data-factory/format-parquet
- Microsoft Learn: Copy and transform data in Azure SQL Database, https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-sql-database
- Microsoft Learn: Copy and transform data to and from SQL Server, https://learn.microsoft.com/en-us/azure/data-factory/connector-sql-server
- Microsoft Learn: Store credentials in Azure Key Vault, https://learn.microsoft.com/en-us/azure/data-factory/store-credentials-in-key-vault
- Microsoft Learn: Use parameters, expressions, and functions in Azure Data Factory, https://learn.microsoft.com/en-us/azure/data-factory/how-to-expression-language-functions
- Microsoft Learn: Copy activity in Azure Data Factory and Azure Synapse Analytics, https://learn.microsoft.com/en-us/azure/data-factory/copy-activity-overview

## Issues Found
- Several fenced code blocks were labeled as `json` but contained JavaScript-style comments, which made them invalid JSON. I removed the inline comments while preserving the examples.
- The Azure Blob Storage linked service example mixed an ARM resource wrapper field with the ADF linked service artifact JSON format. I removed the top-level resource `type` field so the snippet matches the linked service JSON format shown in Microsoft documentation.
- The Azure SQL Database linked service example used the legacy connection-string shape with the password embedded in the connection string. I updated it to the current recommended linked service shape using `server`, `database`, `authenticationType`, `userName`, and a `SecureString` password.
- The on-premises SQL Server linked service example mixed `Integrated Security=True` with separate username and password fields. I updated it to the current SQL Server linked service shape for Windows authentication and retained the self-hosted integration runtime reference.
- The Key Vault password example used the legacy Azure SQL Database connection-string shape. I updated it to the current recommended Azure SQL Database linked service shape with an `AzureKeyVaultSecret` password reference.
- The Key Vault explanation implied the linked service itself explicitly uses managed identity authentication. I clarified that a Key Vault linked service is required and that the data factory managed identity must be granted access to the vault secrets.
- The parameterized dataset Copy activity example placed dataset parameters under `source.datasetParameters`, which is not the documented pipeline JSON shape. I moved the parameter values into the `inputs` dataset reference and made the Copy activity snippet include a source, sink, input, and output.

## Review Notes
The remaining guidance is technically consistent with Microsoft documentation. The naming convention and production recommendations are reasonable conventions rather than strict Azure requirements. All fenced JSON snippets in the edited post were parsed locally as valid JSON.
