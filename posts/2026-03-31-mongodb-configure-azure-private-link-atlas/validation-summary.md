# Validation Summary: How to Configure Azure Private Link for MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- Azure Private Link
- Azure CLI (`az network`)
- Azure Private DNS Zones
- MongoDB Atlas Administration API (v1.0)
- Python (pymongo driver)

## Sources Consulted
- MongoDB Atlas documentation on Azure Private Link: https://www.mongodb.com/docs/atlas/security-private-endpoint/
- Azure CLI `az network private-endpoint` reference: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure CLI `az network private-dns` reference: https://learn.microsoft.com/en-us/cli/azure/network/private-dns
- MongoDB Atlas API reference for private endpoints: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Private-Endpoint-Services

## Issues Found

1. **Incorrect DNS zone name (Cosmos DB instead of Atlas)**: The post used `privatelink.mongo.cosmos.azure.com` as the private DNS zone name in three places (zone creation, VNet link, and A record). This is the DNS zone for Azure Cosmos DB for MongoDB, not MongoDB Atlas. Changed to `privatelink.mongodb.net` which matches the Atlas private endpoint hostname domain.

2. **Incorrect `--group-ids` parameter**: The `az network private-endpoint create` command included `--group-ids mongoCluster`. The `--group-ids` parameter is used when connecting to Azure PaaS resources (e.g., `blob` for Storage, `Sql` for Cosmos DB). MongoDB Atlas exposes a Private Link Service, not a PaaS sub-resource, so this parameter is not applicable and was removed.

3. **Incorrect connection string domain**: The Python connection string used `privatelink.mongo.cosmos.azure.com` (Cosmos DB domain). This was corrected to use the `mongodb.net` domain which Atlas private endpoint connection strings use.

4. **Misleading `--query` for IP retrieval**: The `az network private-endpoint show` command queried `customDnsConfigs[].ipAddresses`, which is populated for Azure PaaS private endpoints but not reliably for third-party Private Link Service endpoints like Atlas. Changed the query to retrieve the endpoint `id`, which is what you actually need to register back with Atlas (the private IP is specified by the user during Atlas registration, as shown in Step 3).

## Review Notes
- The Atlas API endpoint in Step 3 uses v1.0 of the API. MongoDB Atlas also offers a v2 API (`/api/atlas/v2.0/`). The v1.0 endpoint is still functional but the v2 API is the recommended path for new integrations.
- The post correctly notes that M10 or higher is required for private endpoints, which is accurate.
- The `privateEndpointIPAddress` in the Atlas API call (Step 3) must be an IP from the subnet where the private endpoint was created. The example uses `10.0.1.5` as a placeholder which is reasonable.
