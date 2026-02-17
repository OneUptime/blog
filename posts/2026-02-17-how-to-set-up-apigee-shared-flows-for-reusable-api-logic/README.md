# How to Set Up Apigee Shared Flows for Reusable API Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apigee, GCP, Shared Flows, API Management, Reusability

Description: Learn how to create and use Apigee shared flows to implement reusable API logic like authentication, logging, and error handling across multiple API proxies.

---

When you manage multiple API proxies in Apigee, you quickly notice that certain logic repeats across all of them - authentication, logging, CORS handling, error formatting, rate limiting. Copying the same policies into every proxy creates a maintenance nightmare. Change your error format? Update every proxy. Fix a security policy? Deploy to every proxy individually.

Shared flows solve this by letting you define a set of policies once and reference them from any proxy. Change the shared flow, redeploy it, and every proxy that uses it gets the updated behavior.

## What is a Shared Flow

A shared flow is a collection of policies and logic that executes as a single unit. It is like a function - you define it once and call it from multiple places. Unlike a full API proxy, a shared flow does not have its own endpoint or target. It runs within the context of whichever proxy calls it.

Common use cases:
- Authentication and authorization
- Request/response logging
- CORS header management
- Error response formatting
- Rate limiting setup
- Request validation

## Creating a Shared Flow

The structure of a shared flow is similar to a proxy but simpler.

### Directory Structure

```
security-shared-flow/
  sharedflowbundle/
    policies/
      VerifyAPIKey.xml
      SpikeArrest.xml
      AssignSecurityHeaders.xml
    sharedflows/
      default.xml
    security-shared-flow.xml
```

### The Shared Flow Definition

The main descriptor file:

```xml
<!-- security-shared-flow/sharedflowbundle/security-shared-flow.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SharedFlowBundle revision="1" name="security-shared-flow">
    <Description>Common security policies for all API proxies</Description>
    <DisplayName>Security Shared Flow</DisplayName>
    <SharedFlows>
        <SharedFlow>default</SharedFlow>
    </SharedFlows>
    <Policies>
        <Policy>VerifyAPIKey</Policy>
        <Policy>SpikeArrest</Policy>
        <Policy>AssignSecurityHeaders</Policy>
    </Policies>
</SharedFlowBundle>
```

### The Flow Configuration

Define the order in which policies execute:

```xml
<!-- security-shared-flow/sharedflowbundle/sharedflows/default.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SharedFlow name="default">
    <!-- Step 1: Rate limiting (no auth needed) -->
    <Step>
        <Name>SpikeArrest</Name>
    </Step>

    <!-- Step 2: API key verification -->
    <Step>
        <Name>VerifyAPIKey</Name>
    </Step>

    <!-- Step 3: Add security response headers -->
    <Step>
        <Name>AssignSecurityHeaders</Name>
        <Condition>request.verb != "OPTIONS"</Condition>
    </Step>
</SharedFlow>
```

### The Policies

Define each policy just as you would in a regular proxy.

SpikeArrest policy:

```xml
<!-- security-shared-flow/sharedflowbundle/policies/SpikeArrest.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SpikeArrest name="SpikeArrest">
    <DisplayName>Global Spike Arrest</DisplayName>
    <Rate>100ps</Rate>
</SpikeArrest>
```

API key verification:

```xml
<!-- security-shared-flow/sharedflowbundle/policies/VerifyAPIKey.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VerifyAPIKey name="VerifyAPIKey">
    <DisplayName>Verify API Key</DisplayName>
    <APIKey ref="request.header.x-api-key"/>
</VerifyAPIKey>
```

Security headers:

```xml
<!-- security-shared-flow/sharedflowbundle/policies/AssignSecurityHeaders.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="AssignSecurityHeaders">
    <DisplayName>Assign Security Headers</DisplayName>
    <AssignTo createNew="false" transport="http" type="response"/>
    <Set>
        <Headers>
            <Header name="Strict-Transport-Security">max-age=31536000; includeSubDomains</Header>
            <Header name="X-Content-Type-Options">nosniff</Header>
            <Header name="X-Frame-Options">DENY</Header>
            <Header name="X-XSS-Protection">1; mode=block</Header>
            <Header name="Content-Security-Policy">default-src 'self'</Header>
        </Headers>
    </Set>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</AssignMessage>
```

## Deploying the Shared Flow

Bundle and deploy the shared flow:

```bash
# Create the zip bundle
cd security-shared-flow
zip -r ../security-shared-flow.zip sharedflowbundle/
cd ..

# Import the shared flow
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/sharedflows?name=security-shared-flow&action=import" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @security-shared-flow.zip

# Deploy to the environment
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/sharedflows/security-shared-flow/revisions/1/deployments" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Calling a Shared Flow from a Proxy

Use the FlowCallout policy to invoke a shared flow from within your API proxy.

Create a FlowCallout policy:

```xml
<!-- your-api/apiproxy/policies/CallSecurityFlow.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<FlowCallout name="CallSecurityFlow">
    <DisplayName>Call Security Shared Flow</DisplayName>
    <SharedFlowBundle>security-shared-flow</SharedFlowBundle>
</FlowCallout>
```

Attach it to your proxy's PreFlow:

```xml
<!-- your-api/apiproxy/proxies/default.xml -->
<ProxyEndpoint name="default">
    <PreFlow name="PreFlow">
        <Request>
            <!-- All security logic runs from the shared flow -->
            <Step>
                <Name>CallSecurityFlow</Name>
            </Step>
        </Request>
        <Response/>
    </PreFlow>
    <!-- ... -->
</ProxyEndpoint>
```

Now every request to this proxy goes through the shared security flow first.

## Creating a Logging Shared Flow

Another common shared flow handles request and response logging.

```xml
<!-- logging-shared-flow/sharedflowbundle/sharedflows/default.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SharedFlow name="default">
    <Step>
        <Name>ExtractLogData</Name>
    </Step>
    <Step>
        <Name>LogToCloudLogging</Name>
    </Step>
</SharedFlow>
```

Extract relevant data for logging:

```xml
<!-- logging-shared-flow/sharedflowbundle/policies/ExtractLogData.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="ExtractLogData">
    <DisplayName>Extract Log Data</DisplayName>
    <AssignVariable>
        <Name>log.entry</Name>
        <Template>{
    "timestamp": "{system.timestamp}",
    "proxy": "{apiproxy.name}",
    "verb": "{request.verb}",
    "path": "{proxy.pathsuffix}",
    "clientIp": "{client.ip}",
    "statusCode": "{response.status.code}",
    "latencyMs": "{target.received.end.timestamp - target.sent.start.timestamp}",
    "clientId": "{client_id}",
    "userAgent": "{request.header.user-agent}"
}</Template>
    </AssignVariable>
</AssignMessage>
```

Send logs to Cloud Logging via a ServiceCallout or use the MessageLogging policy:

```xml
<!-- logging-shared-flow/sharedflowbundle/policies/LogToCloudLogging.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<MessageLogging name="LogToCloudLogging">
    <DisplayName>Log to Cloud Logging</DisplayName>
    <CloudLogging>
        <LogName>projects/YOUR_PROJECT_ID/logs/apigee-api-logs</LogName>
        <Message contentType="application/json">{log.entry}</Message>
        <Labels>
            <Label>
                <Key>proxy</Key>
                <Value>{apiproxy.name}</Value>
            </Label>
            <Label>
                <Key>environment</Key>
                <Value>{environment.name}</Value>
            </Label>
        </Labels>
    </CloudLogging>
</MessageLogging>
```

## Creating a CORS Shared Flow

CORS handling is another perfect candidate for a shared flow:

```xml
<!-- cors-shared-flow/sharedflowbundle/sharedflows/default.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SharedFlow name="default">
    <!-- Handle OPTIONS preflight requests -->
    <Step>
        <Name>CORSPreflightResponse</Name>
        <Condition>request.verb = "OPTIONS"</Condition>
    </Step>

    <!-- Add CORS headers to all non-OPTIONS responses -->
    <Step>
        <Name>AddCORSHeaders</Name>
        <Condition>request.verb != "OPTIONS"</Condition>
    </Step>
</SharedFlow>
```

```xml
<!-- cors-shared-flow/sharedflowbundle/policies/CORSPreflightResponse.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="CORSPreflightResponse">
    <DisplayName>CORS Preflight Response</DisplayName>
    <AssignTo createNew="false" transport="http" type="response"/>
    <Set>
        <StatusCode>200</StatusCode>
        <Headers>
            <Header name="Access-Control-Allow-Origin">{request.header.origin}</Header>
            <Header name="Access-Control-Allow-Methods">GET, POST, PUT, DELETE, OPTIONS</Header>
            <Header name="Access-Control-Allow-Headers">Content-Type, Authorization, x-api-key</Header>
            <Header name="Access-Control-Max-Age">86400</Header>
        </Headers>
    </Set>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</AssignMessage>
```

```xml
<!-- cors-shared-flow/sharedflowbundle/policies/AddCORSHeaders.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="AddCORSHeaders">
    <DisplayName>Add CORS Headers</DisplayName>
    <AssignTo createNew="false" transport="http" type="response"/>
    <Set>
        <Headers>
            <Header name="Access-Control-Allow-Origin">{request.header.origin}</Header>
            <Header name="Access-Control-Allow-Methods">GET, POST, PUT, DELETE</Header>
        </Headers>
    </Set>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</AssignMessage>
```

## Using Multiple Shared Flows in One Proxy

You can call multiple shared flows from the same proxy:

```xml
<ProxyEndpoint name="default">
    <PreFlow name="PreFlow">
        <Request>
            <!-- CORS handling first -->
            <Step>
                <Name>CallCORSFlow</Name>
            </Step>
            <!-- Then security (API key + rate limiting) -->
            <Step>
                <Name>CallSecurityFlow</Name>
                <Condition>request.verb != "OPTIONS"</Condition>
            </Step>
        </Request>
        <Response/>
    </PreFlow>

    <PostFlow name="PostFlow">
        <Response>
            <!-- Logging after the response -->
            <Step>
                <Name>CallLoggingFlow</Name>
            </Step>
        </Response>
    </PostFlow>
</ProxyEndpoint>
```

## Flow Hooks - Auto-Attach Shared Flows

Flow hooks let you attach a shared flow to every proxy in an environment automatically, without modifying each proxy.

```bash
# Attach a shared flow to the pre-proxy flow hook
curl -X PUT \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/flowhooks/PreProxyFlowHook" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "sharedFlow": "security-shared-flow"
  }'
```

Available flow hook points:
- **PreProxyFlowHook** - runs before every proxy's PreFlow
- **PostProxyFlowHook** - runs after every proxy's PostFlow
- **PreTargetFlowHook** - runs before every target request
- **PostTargetFlowHook** - runs after every target response

This is powerful for organization-wide policies like logging or security headers.

## Managing Shared Flow Versions

Track shared flow revisions and deploy specific versions:

```bash
# List all revisions of a shared flow
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/sharedflows/security-shared-flow" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"

# Check which revision is deployed
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/sharedflows/security-shared-flow/deployments" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"

# Deploy a specific revision
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/sharedflows/security-shared-flow/revisions/2/deployments" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Summary

Shared flows in Apigee eliminate policy duplication across your API proxies. Create shared flows for authentication, logging, CORS, error handling, and any other cross-cutting concern. Call them from individual proxies using FlowCallout policies, or attach them organization-wide using flow hooks. When you need to update the logic, change it once in the shared flow, redeploy, and all proxies benefit immediately. Start with a security shared flow (API key verification plus rate limiting) and a logging shared flow - those two alone will save you significant maintenance effort.
