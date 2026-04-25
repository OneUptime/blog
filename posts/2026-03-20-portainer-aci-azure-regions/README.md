# How to Select Azure Regions for ACI Deployments in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Cloud, Region

Description: Learn how to choose the right Azure regions for deploying containers via Portainer's ACI integration, considering latency, data residency, and cost implications.

## Introduction

When deploying containers to Azure Container Instances through Portainer, selecting the right Azure region is a critical decision that affects latency, data residency compliance, availability, and cost. This guide covers how to select regions in the Portainer ACI interface and the considerations for making the right choice.

## Prerequisites

- Portainer CE or BE with an Azure ACI environment configured
- Understanding of your application's geographic requirements
- Azure subscription with ACI available in target regions

## Available Azure Regions for ACI

Not all Azure regions support ACI, and the exact list can change over time and by subscription. Verify the live list in Portainer or with Azure CLI before deploying. Examples of commonly used regions include:

```text
Americas:
  - eastus (East US - Virginia)
  - eastus2 (East US 2 - Virginia)
  - westus (West US - California)
  - westus2 (West US 2 - Washington)
  - centralus (Central US - Iowa)
  - canadacentral (Canada Central - Toronto)
  - brazilsouth (Brazil South - São Paulo)

Europe:
  - westeurope (West Europe - Netherlands)
  - northeurope (North Europe - Ireland)
  - uksouth (UK South - London)
  - francecentral (France Central - Paris)
  - germanywestcentral (Germany West Central - Frankfurt)
  - swedencentral (Sweden Central)

Asia Pacific:
  - eastasia (East Asia - Hong Kong)
  - southeastasia (Southeast Asia - Singapore)
  - australiaeast (Australia East - Sydney)
  - japaneast (Japan East - Tokyo)
  - koreacentral (Korea Central - Seoul)
  - centralindia (Central India - Pune)
```

## Step 1: Check ACI Availability in a Region

```bash
# Log into Azure CLI

az login

# Check ACI availability in all regions
az provider show \
  --namespace Microsoft.ContainerInstance \
  --query "resourceTypes[?resourceType=='containerGroups'].locations | [0]" \
  --output tsv | sort

# Check if a specific region supports ACI
TARGET_LOCATION="East US"
az provider show \
  --namespace Microsoft.ContainerInstance \
  --query "resourceTypes[?resourceType=='containerGroups'].locations | [0]" \
  --output tsv | grep -Fx "$TARGET_LOCATION" \
  && echo "$TARGET_LOCATION supports ACI" \
  || echo "$TARGET_LOCATION does not support ACI"

# List Azure regions available to your subscription (not ACI-specific)
az account list-locations \
  --query "[].{Name:name, DisplayName:displayName}" \
  --output table
```

## Step 2: Select a Region When Deploying in Portainer

When creating a new container in the ACI environment:

1. In Portainer, navigate to your ACI environment.
2. Click **Container instances** and then **Add container**.
3. In the **Location** dropdown, you will see the Azure datacenters available for ACI in that environment.
4. Select the location closest to your users or that meets your data residency requirements.

## Step 3: Region Selection Criteria

### Latency

Deploy close to your users or downstream services:

```bash
# Test latency to the actual public endpoints of your regional deployments
# Replace the FQDNs or public IPs below with the endpoints returned by ACI
ENDPOINTS=(
  "eastus:http://<eastus-fqdn-or-ip>"
  "westeurope:http://<westeurope-fqdn-or-ip>"
  "southeastasia:http://<southeastasia-fqdn-or-ip>"
)

for ENTRY in "${ENDPOINTS[@]}"; do
  REGION="${ENTRY%%:*}"
  URL="${ENTRY#*:}"
  echo -n "$REGION: "
  curl -s -o /dev/null -w "connect=%{time_connect}s total=%{time_total}s\n" "$URL"
done
```

### Data Residency

For compliance requirements:

```bash
# Example EU data residency options
EU_REGIONS=("westeurope" "northeurope" "francecentral" "germanywestcentral" "swedencentral")

# Match the deployment region to your organization's residency policy
# Example: choose an EU region for EU data residency needs,
# a UK region such as uksouth for UK-only residency,
# or an Australian region such as australiaeast where supported.
# Validate the final choice against Azure compliance documentation and your legal requirements.
```

### Cost Comparison

ACI pricing varies by region, OS, and SKU. Verify current prices before choosing a region:

```bash
# Query Azure pricing API for ACI costs per region
for REGION in eastus westeurope southeastasia; do
  echo "=== $REGION ==="
  curl -Gs "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview" \
    --data-urlencode "\$filter=serviceName eq 'Container Instances' and priceType eq 'Consumption' and armRegionName eq '$REGION'" | \
    jq '.Items[] | select(.skuName == "Standard") | {meter: .meterName, price: .retailPrice, unit: .unitOfMeasure}'
done
```

## Step 4: Deploy to Multiple Regions for Redundancy

Use Portainer's Azure API gateway to deploy the same container group to multiple regions:

```bash
#!/bin/bash
# deploy-multi-region.sh - Deploy container to multiple ACI regions

PORTAINER_URL="https://portainer.example.com"
PORTAINER_API_KEY="your_portainer_api_key"
ACI_ENDPOINT=5  # Your ACI endpoint ID
SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
RESOURCE_GROUP="portainer-aci-rg"
REGIONS=("eastus" "westeurope" "southeastasia")

for REGION in "${REGIONS[@]}"; do
  echo "Deploying to $REGION..."

  RESPONSE=$(curl -sS -X PUT \
    -H "X-API-Key: ${PORTAINER_API_KEY}" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoints/${ACI_ENDPOINT}/azure/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ContainerInstance/containerGroups/myapp-${REGION}?api-version=2023-05-01" \
    -d "{
      \"location\": \"$REGION\",
      \"properties\": {
        \"containers\": [{
          \"name\": \"myapp\",
          \"properties\": {
            \"image\": \"myapp:latest\",
            \"resources\": {\"requests\": {\"cpu\": 0.5, \"memoryInGB\": 1.0}},
            \"ports\": [{\"port\": 80}]
          }
        }],
        \"osType\": \"Linux\",
        \"restartPolicy\": \"Always\",
        \"ipAddress\": {
          \"type\": \"Public\",
          \"dnsNameLabel\": \"myapp-${REGION}\",
          \"ports\": [{\"port\": 80, \"protocol\": \"TCP\"}]
        }
      }
    }")

  FQDN=$(echo "$RESPONSE" | jq -r '.properties.ipAddress.fqdn // empty')
  if [ -n "$FQDN" ]; then
    echo "Deployed to $REGION: $FQDN"
  else
    echo "Deployed to $REGION"
  fi
done
```

## Step 5: Use Azure Traffic Manager for Global Load Balancing

When running in multiple regions, use Azure Traffic Manager to route users to the closest deployment:

```bash
# Create Traffic Manager profile
az network traffic-manager profile create \
  --name myapp-global \
  --resource-group portainer-aci-rg \
  --routing-method Performance \
  --unique-dns-name myapp-global \
  --ttl 30 \
  --protocol HTTP \
  --port 80 \
  --path "/"

# Replace these with the actual FQDNs returned by ACI
declare -A ENDPOINTS=(
  [eastus]="REPLACE_WITH_EASTUS_FQDN"
  [westeurope]="REPLACE_WITH_WESTEUROPE_FQDN"
  [southeastasia]="REPLACE_WITH_SOUTHEASTASIA_FQDN"
)

for REGION in "${!ENDPOINTS[@]}"; do
  az network traffic-manager endpoint create \
    --name "endpoint-${REGION}" \
    --profile-name myapp-global \
    --resource-group portainer-aci-rg \
    --type externalEndpoints \
    --target "${ENDPOINTS[$REGION]}" \
    --endpoint-location "$REGION"
done
```

## Conclusion

Selecting the right Azure region for ACI deployments in Portainer requires balancing latency, data residency, availability, and cost. Use the **Location** dropdown in the Portainer ACI deployment form for single-region deployments, or script multi-region deployments through Portainer's Azure API gateway. Combine multi-region ACI with Azure Traffic Manager to achieve global availability and low latency for users worldwide.
