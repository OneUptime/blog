# How to Set Up Azure Application Gateway for IPv4 Load Balancing - Setup App

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Application Gateway, IPv4, Load Balancing, Layer 7, WAF

Description: Configure Azure Application Gateway as a Layer 7 IPv4 load balancer with listeners, backend pools, HTTP settings, and routing rules for web application traffic.

## Introduction

Azure Application Gateway is a Layer 7 load balancer with SSL termination, URL-based routing, cookie-based session affinity, and optional WAF (Web Application Firewall). Unlike Azure Load Balancer (Layer 4), Application Gateway understands HTTP and HTTPS traffic.

## Step 1: Create a Dedicated Subnet

Application Gateway requires its own subnet:

```bash
RESOURCE_GROUP="my-network-rg"

az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name prod-vnet \
  --name appgw-subnet \
  --address-prefix 10.100.10.0/24
```

## Step 2: Create a Public IP

```bash
az network public-ip create \
  --resource-group $RESOURCE_GROUP \
  --name appgw-pip \
  --sku Standard \
  --allocation-method Static \
  --location eastus
```

## Step 3: Create the Application Gateway

This creates a V2 gateway with basic configuration:

```bash
az network application-gateway create \
  --resource-group $RESOURCE_GROUP \
  --name my-appgw \
  --location eastus \
  --sku Standard_v2 \
  --capacity 2 \
  --vnet-name prod-vnet \
  --subnet appgw-subnet \
  --public-ip-address appgw-pip \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --routing-rule-type Basic \
  --servers 10.100.2.10 10.100.2.11 \
  --priority 10
```

## Adding a Backend Pool

```bash
# Add or update a backend pool with VM IP addresses

az network application-gateway address-pool update \
  --resource-group $RESOURCE_GROUP \
  --gateway-name my-appgw \
  --name appGatewayBackendPool \
  --servers 10.100.2.10 10.100.2.11 10.100.2.12
```

## Configuring URL-Based Routing

Route `/api/*` to one backend pool and everything else to another:

```bash
# Create a second backend pool for API servers
az network application-gateway address-pool create \
  --resource-group $RESOURCE_GROUP \
  --gateway-name my-appgw \
  --name api-pool \
  --servers 10.100.3.10 10.100.3.11

# Create a URL path map
az network application-gateway url-path-map create \
  --resource-group $RESOURCE_GROUP \
  --gateway-name my-appgw \
  --name url-path-map \
  --paths '/api/*' \
  --address-pool api-pool \
  --http-settings appGatewayBackendHttpSettings \
  --rule-name api-rule \
  --default-address-pool appGatewayBackendPool \
  --default-http-settings appGatewayBackendHttpSettings

# Update the default HTTP rule to use the URL path map
az network application-gateway rule update \
  --resource-group $RESOURCE_GROUP \
  --gateway-name my-appgw \
  --name rule1 \
  --rule-type PathBasedRouting \
  --url-path-map url-path-map \
  --priority 10
```

## Adding HTTPS Listener with SSL Termination

```bash
# Upload SSL certificate
az network application-gateway ssl-cert create \
  --resource-group $RESOURCE_GROUP \
  --gateway-name my-appgw \
  --name my-ssl-cert \
  --cert-file /path/to/cert.pfx \
  --cert-password "certpassword"

# Create HTTPS frontend port
az network application-gateway frontend-port create \
  --resource-group $RESOURCE_GROUP \
  --gateway-name my-appgw \
  --name https-port \
  --port 443

# Create HTTPS listener
az network application-gateway http-listener create \
  --resource-group $RESOURCE_GROUP \
  --gateway-name my-appgw \
  --name https-listener \
  --frontend-port https-port \
  --ssl-cert my-ssl-cert

# Route HTTPS traffic to the backend pool
az network application-gateway rule create \
  --resource-group $RESOURCE_GROUP \
  --gateway-name my-appgw \
  --name https-rule \
  --http-listener https-listener \
  --rule-type Basic \
  --address-pool appGatewayBackendPool \
  --http-settings appGatewayBackendHttpSettings \
  --priority 20
```

## Enabling WAF (Web Application Firewall)

```bash
# Change SKU to WAF_v2 and attach a WAF policy
az network application-gateway waf-policy create \
  --resource-group $RESOURCE_GROUP \
  --name my-waf-policy

WAF_POLICY_ID=$(az network application-gateway waf-policy show \
  --resource-group $RESOURCE_GROUP \
  --name my-waf-policy \
  --query id --output tsv)

az network application-gateway update \
  --resource-group $RESOURCE_GROUP \
  --name my-appgw \
  --sku WAF_v2 \
  --set sku.tier=WAF_v2 firewallPolicy.id="$WAF_POLICY_ID"
```

## Checking Application Gateway Status

```bash
# Show operational state
az network application-gateway show \
  --resource-group $RESOURCE_GROUP \
  --name my-appgw \
  --query '{state:operationalState, sku:sku.name, pip:frontendIPConfigurations[0].publicIPAddress.id}'

# Get the public IP
az network public-ip show \
  --resource-group $RESOURCE_GROUP \
  --name appgw-pip \
  --query ipAddress --output tsv
```

## Conclusion

Azure Application Gateway provides Layer 7 load balancing with URL routing, SSL termination, and optional WAF. Use Standard_v2 or WAF_v2 SKU. Application Gateway requires a dedicated subnet - do not place other resources in that subnet. V2 SKUs support autoscaling and availability zone redundancy.
