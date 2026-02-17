# How to Connect Azure Databricks to Azure Data Lake Storage Gen2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Databricks, Azure Data Lake Storage, ADLS Gen2, Storage Access, Service Principal, Azure

Description: Learn the different methods to connect Azure Databricks to Azure Data Lake Storage Gen2 including service principal, managed identity, and Unity Catalog.

---

Nearly every Databricks workload needs to read from or write to Azure Data Lake Storage Gen2 (ADLS Gen2). It is the standard storage layer for data lakes on Azure, and connecting Databricks to it is one of the first things you do when setting up a new workspace. But there are several different ways to make this connection, each with different security characteristics and use cases.

In this post, I will walk through the main approaches for connecting Azure Databricks to ADLS Gen2 - from the simplest (account key) to the most secure (Unity Catalog with managed identity) - and explain when to use each one.

## Connection Methods Overview

Here are the main methods, roughly ordered from least to most secure:

1. **Storage account key** - simple but insecure (the key grants full access)
2. **SAS token** - scoped access with expiration
3. **Service principal with OAuth** - recommended for most scenarios
4. **Azure AD credential passthrough** - per-user access with the user's own identity
5. **Unity Catalog external locations** - the most governed approach

## Method 1: Storage Account Key

This is the quickest way to get started but not recommended for production because the account key grants full access to everything in the storage account.

```python
# Set the storage account key in the Spark configuration
spark.conf.set(
    "fs.azure.account.key.<storage-account>.dfs.core.windows.net",
    "<your-storage-account-key>"
)

# Now you can read and write using the abfss:// URI
df = spark.read.format("delta").load(
    "abfss://raw@<storage-account>.dfs.core.windows.net/sales/orders"
)

# Write data back
df.write.format("delta").mode("append").save(
    "abfss://curated@<storage-account>.dfs.core.windows.net/sales/orders_clean"
)
```

For slightly better security, store the key in Databricks secrets instead of hardcoding it.

```python
# Store the key as a Databricks secret (do this once via CLI)
# databricks secrets create-scope --scope storage-secrets
# databricks secrets put --scope storage-secrets --key adls-account-key

# Reference the secret in your notebook
storage_key = dbutils.secrets.get(scope="storage-secrets", key="adls-account-key")
spark.conf.set(
    "fs.azure.account.key.<storage-account>.dfs.core.windows.net",
    storage_key
)
```

## Method 2: SAS Token

SAS (Shared Access Signature) tokens provide scoped, time-limited access to specific containers or paths.

```python
# Configure Spark to use a SAS token
spark.conf.set(
    "fs.azure.account.auth.type.<storage-account>.dfs.core.windows.net",
    "SAS"
)
spark.conf.set(
    "fs.azure.sas.token.provider.type.<storage-account>.dfs.core.windows.net",
    "org.apache.hadoop.fs.azurebfs.sas.FixedSASTokenProvider"
)
spark.conf.set(
    "fs.azure.sas.fixed.token.<storage-account>.dfs.core.windows.net",
    "<your-sas-token>"
)

# Read data using the SAS token
df = spark.read.format("parquet").load(
    "abfss://raw@<storage-account>.dfs.core.windows.net/data/"
)
```

SAS tokens are better than account keys because they can be scoped to specific operations and expire. But they still need to be managed and rotated.

## Method 3: Service Principal with OAuth (Recommended)

This is the recommended approach for most production workloads. You create a service principal in Azure AD, grant it access to the storage account, and use its credentials from Databricks.

### Step 1: Create a Service Principal

```bash
# Create a service principal using Azure CLI
az ad sp create-for-rbac --name "databricks-storage-sp" --skip-assignment

# Output will include appId, password, and tenant
# Save these securely
```

### Step 2: Grant Storage Access

```bash
# Assign Storage Blob Data Contributor role on the storage account
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee "<app-id>" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<storage-account>"
```

### Step 3: Store Credentials in Databricks Secrets

```bash
# Create a secret scope backed by Azure Key Vault or Databricks
databricks secrets create-scope --scope adls-sp

# Store the service principal credentials
databricks secrets put --scope adls-sp --key client-id
databricks secrets put --scope adls-sp --key client-secret
databricks secrets put --scope adls-sp --key tenant-id
```

### Step 4: Configure Spark to Use the Service Principal

```python
# Configure OAuth with service principal credentials
service_credential = dbutils.secrets.get(scope="adls-sp", key="client-secret")

spark.conf.set(
    "fs.azure.account.auth.type.<storage-account>.dfs.core.windows.net",
    "OAuth"
)
spark.conf.set(
    "fs.azure.account.oauth.provider.type.<storage-account>.dfs.core.windows.net",
    "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider"
)
spark.conf.set(
    "fs.azure.account.oauth2.client.id.<storage-account>.dfs.core.windows.net",
    dbutils.secrets.get(scope="adls-sp", key="client-id")
)
spark.conf.set(
    "fs.azure.account.oauth2.client.secret.<storage-account>.dfs.core.windows.net",
    service_credential
)
spark.conf.set(
    "fs.azure.account.oauth2.client.endpoint.<storage-account>.dfs.core.windows.net",
    f"https://login.microsoftonline.com/{dbutils.secrets.get(scope='adls-sp', key='tenant-id')}/oauth2/token"
)

# Now read/write data
df = spark.read.format("delta").load(
    "abfss://silver@<storage-account>.dfs.core.windows.net/customers"
)
```

### Set at Cluster Level

Instead of setting Spark configuration in every notebook, set it at the cluster level so it applies to all notebooks attached to that cluster.

In the cluster configuration under Spark Config, add:

```
fs.azure.account.auth.type.<storage-account>.dfs.core.windows.net OAuth
fs.azure.account.oauth.provider.type.<storage-account>.dfs.core.windows.net org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider
fs.azure.account.oauth2.client.id.<storage-account>.dfs.core.windows.net {{secrets/adls-sp/client-id}}
fs.azure.account.oauth2.client.secret.<storage-account>.dfs.core.windows.net {{secrets/adls-sp/client-secret}}
fs.azure.account.oauth2.client.endpoint.<storage-account>.dfs.core.windows.net https://login.microsoftonline.com/<tenant-id>/oauth2/token
```

## Method 4: DBFS Mounts (Legacy)

DBFS mounts were a popular approach in older Databricks setups. They create a shortcut path that makes ADLS look like a local filesystem.

```python
# Mount an ADLS Gen2 container (legacy approach)
configs = {
    "fs.azure.account.auth.type": "OAuth",
    "fs.azure.account.oauth.provider.type": "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider",
    "fs.azure.account.oauth2.client.id": dbutils.secrets.get(scope="adls-sp", key="client-id"),
    "fs.azure.account.oauth2.client.secret": dbutils.secrets.get(scope="adls-sp", key="client-secret"),
    "fs.azure.account.oauth2.client.endpoint": f"https://login.microsoftonline.com/{dbutils.secrets.get(scope='adls-sp', key='tenant-id')}/oauth2/token"
}

dbutils.fs.mount(
    source="abfss://silver@<storage-account>.dfs.core.windows.net/",
    mount_point="/mnt/silver",
    extra_configs=configs
)

# Read from the mount point
df = spark.read.format("delta").load("/mnt/silver/customers")
```

Mounts are easy to use but have downsides: they persist across the workspace, all users share the same credentials, and there is no per-user access control. Databricks recommends moving away from mounts in favor of Unity Catalog external locations.

## Method 5: Unity Catalog External Locations (Most Secure)

If you have Unity Catalog set up, this is the best approach. It provides centralized, governed access to storage.

```sql
-- Create a storage credential using the Databricks Access Connector
CREATE STORAGE CREDENTIAL adls_credential
WITH (
    AZURE_MANAGED_IDENTITY = (
        ACCESS_CONNECTOR_ID = '/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Databricks/accessConnectors/<connector>'
    )
);

-- Create an external location
CREATE EXTERNAL LOCATION silver_data
URL 'abfss://silver@<storage-account>.dfs.core.windows.net/'
WITH (STORAGE CREDENTIAL adls_credential);

-- Grant access to specific groups
GRANT READ FILES ON EXTERNAL LOCATION silver_data TO `data-analysts`;
GRANT WRITE FILES ON EXTERNAL LOCATION silver_data TO `data-engineers`;
```

Now users access data through Unity Catalog's access control, and you do not need to set Spark configurations in notebooks.

## Choosing the Right Method

| Method | Security | Ease of Setup | Per-User Access | Recommendation |
|--------|----------|---------------|-----------------|----------------|
| Account Key | Low | Easy | No | Development only |
| SAS Token | Medium | Easy | No | Short-term access |
| Service Principal | High | Moderate | No | Production without Unity Catalog |
| AD Passthrough | High | Easy | Yes | Interactive analytics |
| Unity Catalog | Highest | Moderate | Yes | Production with governance |

## Troubleshooting Common Issues

**403 Forbidden** - the credential does not have the right role assignment on the storage account. Check IAM roles.

**Connection timeout** - verify the storage account allows access from the Databricks workspace. Check VNet and firewall settings.

**Secret not found** - verify the secret scope and key name. Secret scope names are case-sensitive.

**Mount point already exists** - unmount first with `dbutils.fs.unmount("/mnt/silver")` before remounting.

## Wrapping Up

Connecting Azure Databricks to ADLS Gen2 is foundational for any data platform on Azure. Start with service principal authentication for a good balance of security and simplicity. If you are using Unity Catalog, migrate to external locations for the best governance experience. Avoid account keys in production, and phase out DBFS mounts in favor of direct abfss:// paths or Unity Catalog external locations. The right choice depends on your security requirements, governance needs, and whether you have Unity Catalog deployed.
