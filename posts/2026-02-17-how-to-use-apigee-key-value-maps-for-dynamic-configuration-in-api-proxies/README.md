# How to Use Apigee Key Value Maps for Dynamic Configuration in API Proxies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apigee, GCP, Key Value Maps, Configuration, API Management

Description: Learn how to use Apigee Key Value Maps (KVMs) to store and retrieve dynamic configuration data in your API proxies without redeployment.

---

Hardcoding configuration values in API proxy policies is a recipe for redeployment headaches. Backend URLs, API keys for third-party services, feature flags, environment-specific settings - all of these change over time, and you do not want to redeploy your proxy every time they do. Apigee Key Value Maps (KVMs) solve this by providing a runtime key-value store that your proxies can read from during request processing.

## What Are Key Value Maps

KVMs are simple key-value stores within Apigee. Each entry has a string key and a string value. They exist at three scopes:

- **Organization level** - shared across all environments
- **Environment level** - specific to prod, staging, etc.
- **API Proxy level** - specific to a single proxy

Values stored in KVMs are encrypted at rest, making them suitable for storing sensitive data like API keys, credentials, and tokens for third-party services.

## Creating Key Value Maps

### Using the Management API

Create an environment-level KVM for storing backend configuration:

```bash
# Create a KVM at the environment level
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-config",
    "encrypted": true
  }'
```

Add entries to the KVM:

```bash
# Add a backend URL entry
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/backend-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payment-service-url",
    "value": "https://payments.internal.example.com/v2"
  }'

# Add an API key for a third-party service
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/backend-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "maps-api-key",
    "value": "AIzaSyB_your_maps_api_key_here"
  }'

# Add a feature flag
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/backend-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "enable-caching",
    "value": "true"
  }'

# Add rate limit configuration
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/backend-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "spike-arrest-rate",
    "value": "50ps"
  }'
```

### Creating Organization-Level KVMs

For configuration shared across all environments:

```bash
# Create an org-level KVM for global settings
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/keyvaluemaps" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "global-config",
    "encrypted": true
  }'

# Add a global setting
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/keyvaluemaps/global-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "company-name",
    "value": "Acme Corp"
  }'
```

## Reading KVM Values in Proxy Policies

Use the KeyValueMapOperations policy to read values from a KVM and store them in flow variables.

### Basic KVM Lookup

This policy reads the payment service URL from the KVM:

```xml
<!-- apiproxy/policies/LookupBackendConfig.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<KeyValueMapOperations name="LookupBackendConfig"
    mapIdentifier="backend-config">
    <DisplayName>Lookup Backend Config</DisplayName>
    <Scope>environment</Scope>

    <!-- Read the payment service URL -->
    <Get assignTo="config.payment.url">
        <Key>
            <Parameter>payment-service-url</Parameter>
        </Key>
    </Get>

    <!-- Read the maps API key -->
    <Get assignTo="config.maps.apikey">
        <Key>
            <Parameter>maps-api-key</Parameter>
        </Key>
    </Get>

    <!-- Read the caching flag -->
    <Get assignTo="config.caching.enabled">
        <Key>
            <Parameter>enable-caching</Parameter>
        </Key>
    </Get>

    <!-- Read the spike arrest rate -->
    <Get assignTo="config.spike.arrest.rate">
        <Key>
            <Parameter>spike-arrest-rate</Parameter>
        </Key>
    </Get>
</KeyValueMapOperations>
```

### Using KVM Values in Other Policies

Once values are stored in flow variables, use them in other policies.

Use the backend URL from KVM for a ServiceCallout:

```xml
<!-- apiproxy/policies/CallPaymentService.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ServiceCallout name="CallPaymentService">
    <DisplayName>Call Payment Service</DisplayName>
    <Request clearPayload="true" variable="paymentRequest">
        <Set>
            <Verb>POST</Verb>
            <Path>/charge</Path>
        </Set>
    </Request>
    <Response>paymentResponse</Response>
    <!-- URL comes from the KVM lookup -->
    <HTTPTargetConnection>
        <URL>{config.payment.url}</URL>
    </HTTPTargetConnection>
</ServiceCallout>
```

Add the third-party API key to outbound requests:

```xml
<!-- apiproxy/policies/AddMapsKey.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="AddMapsKey">
    <DisplayName>Add Maps API Key</DisplayName>
    <AssignTo createNew="false" transport="http" type="request"/>
    <Set>
        <QueryParams>
            <!-- API key from KVM -->
            <QueryParam name="key">{config.maps.apikey}</QueryParam>
        </QueryParams>
    </Set>
</AssignMessage>
```

Use the SpikeArrest rate from KVM:

```xml
<!-- apiproxy/policies/DynamicSpikeArrest.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SpikeArrest name="DynamicSpikeArrest">
    <DisplayName>Dynamic Spike Arrest</DisplayName>
    <!-- Rate comes from KVM via flow variable -->
    <Rate ref="config.spike.arrest.rate">
        <Rate>30ps</Rate> <!-- Fallback if KVM lookup fails -->
    </Rate>
</SpikeArrest>
```

### Conditional Logic Based on KVM Values

Use KVM values in flow conditions for feature flags:

```xml
<!-- apiproxy/proxies/default.xml -->
<Flows>
    <Flow name="CachedResponse">
        <!-- Only use caching if the KVM flag says so -->
        <Condition>(config.caching.enabled = "true")</Condition>
        <Request>
            <Step>
                <Name>LookupResponseCache</Name>
            </Step>
        </Request>
        <Response>
            <Step>
                <Name>PopulateResponseCache</Name>
            </Step>
        </Response>
    </Flow>
</Flows>
```

## Writing to KVMs from Proxy Policies

You can also write values to KVMs at runtime. This is useful for caching results or storing state.

```xml
<!-- apiproxy/policies/StoreTokenInKVM.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<KeyValueMapOperations name="StoreTokenInKVM"
    mapIdentifier="token-cache">
    <DisplayName>Store Token in KVM</DisplayName>
    <Scope>environment</Scope>

    <Put override="true">
        <Key>
            <Parameter>cached-auth-token</Parameter>
        </Key>
        <Value ref="external.auth.token"/>
    </Put>

    <Put override="true">
        <Key>
            <Parameter>token-expiry</Parameter>
        </Key>
        <Value ref="external.auth.expiry"/>
    </Put>
</KeyValueMapOperations>
```

## Deleting KVM Entries

Remove entries when they are no longer needed:

```xml
<!-- apiproxy/policies/DeleteExpiredToken.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<KeyValueMapOperations name="DeleteExpiredToken"
    mapIdentifier="token-cache">
    <DisplayName>Delete Expired Token</DisplayName>
    <Scope>environment</Scope>

    <Delete>
        <Key>
            <Parameter>cached-auth-token</Parameter>
        </Key>
    </Delete>
</KeyValueMapOperations>
```

## Managing KVM Entries Through the API

Update and manage KVM entries without proxy redeployment:

```bash
# Update an existing entry
curl -X PUT \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/backend-config/entries/payment-service-url" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payment-service-url",
    "value": "https://new-payments.internal.example.com/v3"
  }'

# List all entries in a KVM
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/backend-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"

# Delete an entry
curl -X DELETE \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/backend-config/entries/deprecated-key" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"

# Delete an entire KVM
curl -X DELETE \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/old-config" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Environment-Specific Configuration Pattern

A powerful pattern is using the same KVM name across environments with different values. Your proxy code stays identical, but behavior changes per environment.

```bash
# Dev environment: backend config
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/dev/keyvaluemaps/backend-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"name": "payment-service-url", "value": "https://payments-dev.example.com"}'

# Staging environment: backend config
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/staging/keyvaluemaps/backend-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"name": "payment-service-url", "value": "https://payments-staging.example.com"}'

# Prod environment: backend config
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/keyvaluemaps/backend-config/entries" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"name": "payment-service-url", "value": "https://payments.example.com"}'
```

The proxy uses `<Scope>environment</Scope>` in the KVM policy, so it automatically reads the right value based on where it is deployed.

## Best Practices

1. **Use encrypted KVMs for sensitive data.** API keys, passwords, and tokens should always be in encrypted KVMs.

2. **Keep KVM lookups in the PreFlow.** Read configuration once at the start of the request, not in multiple places.

3. **Always set fallback values.** If a KVM lookup fails, your proxy should not break. Use default values in the policies that consume KVM variables.

4. **Avoid writing to KVMs in the request path.** KVM writes have higher latency than reads. If you need to cache data, consider using the ResponseCache policy instead.

5. **Document your KVM entries.** Maintain a reference of what keys exist, what they mean, and what values are expected.

## Summary

Apigee Key Value Maps provide runtime configuration that decouples your proxy logic from environment-specific values. Store backend URLs, third-party API keys, feature flags, and rate limit settings in KVMs, then read them into flow variables using the KeyValueMapOperations policy. The same proxy code works across all environments because the KVM values are environment-specific. Updates take effect immediately without redeployment, making KVMs essential for any proxy that needs to adapt to changing conditions.
