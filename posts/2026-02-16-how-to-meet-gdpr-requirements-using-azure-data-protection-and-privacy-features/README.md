# How to Meet GDPR Requirements Using Azure Data Protection and Privacy Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, GDPR, Data Protection, Privacy, Compliance, Data Sovereignty, Security

Description: Configure Azure services to meet GDPR requirements for data protection, privacy by design, data subject rights, and cross-border data transfer compliance.

---

The General Data Protection Regulation (GDPR) applies to any organization that processes personal data of EU residents, regardless of where the organization is based. If your application on Azure handles names, email addresses, IP addresses, or any other data that can identify an EU resident, GDPR applies to you.

Azure provides many features that help with GDPR compliance, but you need to configure them deliberately. In this post, I will cover the technical configurations needed to meet GDPR requirements on Azure, from data residency to encryption, access controls, data subject rights, and breach notification.

## Data Residency and Sovereignty

GDPR requires that you know where personal data is stored and processed. Azure lets you control data residency through region selection.

### Choose EU Regions

Deploy all resources that process EU personal data in EU regions:

```bash
# Use Azure Policy to restrict resource deployment to EU regions only
az policy assignment create \
  --name "eu-data-residency" \
  --scope "/providers/Microsoft.Management/managementGroups/contoso-eu-workloads" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c" \
  --params '{
    "listOfAllowedLocations": {
      "value": [
        "westeurope",
        "northeurope",
        "germanywestcentral",
        "francesouth",
        "francecentral",
        "swedencentral",
        "switzerlandnorth"
      ]
    }
  }'
```

### Data Replication Controls

Make sure data replication does not send personal data outside the EU:

```bash
# Use locally redundant or zone-redundant storage for EU data
# Do NOT use GRS or RA-GRS as they replicate to a paired region
# that might be outside the EU
az storage account create \
  --resource-group eu-data-rg \
  --name eudatastorage \
  --location westeurope \
  --sku Standard_ZRS \
  --kind StorageV2

# For Cosmos DB, explicitly set the regions
az cosmosdb create \
  --resource-group eu-data-rg \
  --name eu-cosmos-db \
  --locations regionName=westeurope failoverPriority=0 \
  --locations regionName=northeurope failoverPriority=1 \
  --default-consistency-level Session
```

## Encryption

GDPR does not explicitly mandate encryption, but it is considered a key technical measure under Article 32 (security of processing) and Article 34 (breach notification - encryption can exempt you from notifying individuals).

### Encryption at Rest

```bash
# Enable customer-managed keys for enhanced control
az keyvault create \
  --resource-group eu-data-rg \
  --name gdpr-keyvault \
  --location westeurope \
  --enable-purge-protection true \
  --enable-soft-delete true

# Create encryption keys
az keyvault key create \
  --vault-name gdpr-keyvault \
  --name data-encryption-key \
  --kty RSA \
  --size 2048

# Configure SQL Database with Always Encrypted for column-level encryption
# This encrypts specific PII columns so even DBAs cannot see the data
```

For column-level encryption of personal data in Azure SQL, use Always Encrypted:

```sql
-- Create a column encryption key in Azure SQL
-- This encrypts specific PII columns at the application level
-- The encryption key is stored in Key Vault, not in the database

CREATE COLUMN MASTER KEY [CMK_KV]
WITH (
    KEY_STORE_PROVIDER_NAME = N'AZURE_KEY_VAULT',
    KEY_PATH = N'https://gdpr-keyvault.vault.azure.net/keys/column-master-key/version'
);

CREATE COLUMN ENCRYPTION KEY [CEK_Personal]
WITH VALUES (
    COLUMN_MASTER_KEY = [CMK_KV],
    ALGORITHM = 'RSA_OAEP',
    ENCRYPTED_VALUE = 0x01... -- generated during key creation
);

-- Create table with encrypted PII columns
CREATE TABLE Customers (
    CustomerId INT PRIMARY KEY,
    -- Deterministic encryption allows equality comparisons
    Email NVARCHAR(256) COLLATE Latin1_General_BIN2
        ENCRYPTED WITH (
            COLUMN_ENCRYPTION_KEY = [CEK_Personal],
            ENCRYPTION_TYPE = Deterministic,
            ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'
        ),
    -- Randomized encryption is more secure but no comparisons
    PhoneNumber NVARCHAR(50)
        ENCRYPTED WITH (
            COLUMN_ENCRYPTION_KEY = [CEK_Personal],
            ENCRYPTION_TYPE = Randomized,
            ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'
        ),
    -- Non-PII columns remain unencrypted
    AccountType VARCHAR(50),
    CreatedDate DATETIME2
);
```

## Data Subject Rights

GDPR gives individuals rights over their personal data. Your application must support these:

### Right to Access (Article 15)

Build an API that lets users request all their personal data:

```csharp
// API endpoint for data subject access requests
[Function("DataSubjectAccessRequest")]
public async Task<HttpResponseData> HandleAccessRequest(
    [HttpTrigger(AuthorizationLevel.Function, "get",
     Route = "gdpr/data-subject/{subjectId}")] HttpRequestData req,
    string subjectId,
    FunctionContext context)
{
    var logger = context.GetLogger("DSAR");
    logger.LogInformation("Processing data subject access request for {SubjectId}", subjectId);

    // Collect data from all services that store personal data
    var personalData = new DataSubjectReport
    {
        SubjectId = subjectId,
        GeneratedAt = DateTime.UtcNow,
        DataSources = new List<DataSource>()
    };

    // Query the customer database
    var customerData = await _customerRepo.GetBySubjectId(subjectId);
    if (customerData != null)
    {
        personalData.DataSources.Add(new DataSource
        {
            Source = "Customer Database",
            Category = "Account Information",
            Data = new
            {
                customerData.Name,
                customerData.Email,
                customerData.Phone,
                customerData.Address,
                customerData.CreatedDate,
                customerData.LastLoginDate
            }
        });
    }

    // Query order history
    var orders = await _orderRepo.GetByCustomerId(subjectId);
    personalData.DataSources.Add(new DataSource
    {
        Source = "Order System",
        Category = "Transaction History",
        Data = orders.Select(o => new
        {
            o.OrderId,
            o.OrderDate,
            o.TotalAmount,
            o.ShippingAddress
        })
    });

    // Query activity logs
    var activities = await _activityRepo.GetBySubjectId(subjectId);
    personalData.DataSources.Add(new DataSource
    {
        Source = "Activity Logs",
        Category = "Usage Data",
        Data = activities.Select(a => new
        {
            a.Timestamp,
            a.Action,
            a.IpAddress
        })
    });

    // Audit this access request
    await _auditLog.LogAsync(new AuditEntry
    {
        Action = "DataSubjectAccessRequest",
        SubjectId = subjectId,
        RequestedBy = req.Headers.GetValues("X-Requester-Id").FirstOrDefault(),
        Timestamp = DateTime.UtcNow
    });

    var response = req.CreateResponse(HttpStatusCode.OK);
    await response.WriteAsJsonAsync(personalData);
    return response;
}
```

### Right to Erasure (Article 17) - Right to be Forgotten

```csharp
// API endpoint for data erasure requests
[Function("DataSubjectErasureRequest")]
public async Task<HttpResponseData> HandleErasureRequest(
    [HttpTrigger(AuthorizationLevel.Function, "delete",
     Route = "gdpr/data-subject/{subjectId}")] HttpRequestData req,
    string subjectId,
    FunctionContext context)
{
    var logger = context.GetLogger("DSAR-Erasure");

    // Verify the erasure request is valid
    // Some data may need to be retained for legal obligations
    var retentionCheck = await _retentionService.CheckRetentionRequirements(subjectId);

    var erasureReport = new ErasureReport
    {
        SubjectId = subjectId,
        RequestedAt = DateTime.UtcNow,
        Actions = new List<ErasureAction>()
    };

    // Delete from customer database
    if (!retentionCheck.MustRetainCustomerData)
    {
        await _customerRepo.DeleteBySubjectId(subjectId);
        erasureReport.Actions.Add(new ErasureAction
        {
            Source = "Customer Database",
            Status = "Deleted",
            Details = "All personal data removed"
        });
    }
    else
    {
        // Anonymize instead of delete if retention is required
        await _customerRepo.AnonymizeBySubjectId(subjectId);
        erasureReport.Actions.Add(new ErasureAction
        {
            Source = "Customer Database",
            Status = "Anonymized",
            Details = "Personal data anonymized due to legal retention requirement"
        });
    }

    // Delete from search indexes
    await _searchService.DeleteDocumentsBySubjectId(subjectId);
    erasureReport.Actions.Add(new ErasureAction
    {
        Source = "Search Index",
        Status = "Deleted"
    });

    // Remove from blob storage
    await _blobService.DeleteBlobsBySubjectId(subjectId);
    erasureReport.Actions.Add(new ErasureAction
    {
        Source = "Blob Storage",
        Status = "Deleted"
    });

    // Delete from Redis cache
    await _cache.RemoveAsync($"user:{subjectId}:*");

    // Purge from CDN if applicable
    // Invalidate cached content that might contain personal data

    // Audit the erasure
    await _auditLog.LogAsync(new AuditEntry
    {
        Action = "DataSubjectErasureCompleted",
        SubjectId = subjectId,
        Timestamp = DateTime.UtcNow
    });

    var response = req.CreateResponse(HttpStatusCode.OK);
    await response.WriteAsJsonAsync(erasureReport);
    return response;
}
```

## Data Protection Impact Assessment

For high-risk processing activities, GDPR requires a Data Protection Impact Assessment (DPIA). Azure provides tools to support this:

```bash
# Use Azure Purview (now Microsoft Purview) to discover and classify personal data
az purview account create \
  --resource-group eu-data-rg \
  --name contoso-purview \
  --location westeurope

# Register data sources for scanning
# Purview automatically classifies PII data types like names, emails, SSNs
```

## Breach Notification

GDPR requires notification to the supervisory authority within 72 hours of discovering a breach. Set up automated detection:

```bash
# Enable Microsoft Defender for Cloud
az security pricing create \
  --name VirtualMachines \
  --tier Standard

az security pricing create \
  --name SqlServers \
  --tier Standard

az security pricing create \
  --name StorageAccounts \
  --tier Standard

# Configure security alerts to notify the DPO
az monitor action-group create \
  --resource-group eu-data-rg \
  --name gdpr-breach-alerts \
  --action email dpo dpo@contoso.com \
  --action email security security-team@contoso.com \
  --action webhook incident "https://incident-management.contoso.com/api/gdpr-breach"
```

## Consent Management

If you rely on consent as your legal basis, you need to track and manage consent records:

```csharp
// Consent record model
public class ConsentRecord
{
    public string SubjectId { get; set; }
    public string Purpose { get; set; }
    public bool Granted { get; set; }
    public DateTime Timestamp { get; set; }
    public string IpAddress { get; set; }
    public string ConsentText { get; set; }
    public string Version { get; set; }
    // How the consent was collected (web form, API, etc.)
    public string CollectionMethod { get; set; }
}
```

Store consent records in an immutable storage container so they cannot be tampered with.

## Summary

Meeting GDPR requirements on Azure requires a deliberate approach across multiple dimensions: restrict data residency to EU regions, encrypt personal data at rest and in transit, implement data subject rights (access, erasure, portability) as application features, maintain detailed audit logs, classify and discover personal data with Purview, set up automated breach detection and notification, and manage consent records properly. GDPR is not a one-time configuration - it is an ongoing commitment that requires regular review of your data processing activities and technical safeguards.
