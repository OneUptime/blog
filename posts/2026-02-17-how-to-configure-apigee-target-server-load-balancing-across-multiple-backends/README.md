# How to Configure Apigee Target Server Load Balancing Across Multiple Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apigee, GCP, Load Balancing, Target Servers, API Management

Description: Learn how to configure Apigee target servers and load balancers to distribute API traffic across multiple backend instances for high availability and performance.

---

When your API backend runs on multiple servers, you need load balancing at the API gateway level. Apigee target servers let you define backend endpoints separately from your proxy configuration, and the built-in load balancer distributes traffic across them. This gives you high availability (if one backend goes down, traffic routes to the others) and the ability to update backend addresses without redeploying your proxy.

## Why Use Target Servers

Hardcoding a backend URL in your proxy's TargetEndpoint works for simple setups:

```xml
<!-- This works but is inflexible -->
<HTTPTargetConnection>
    <URL>https://backend.example.com</URL>
</HTTPTargetConnection>
```

The problems with hardcoded URLs:
- Changing the backend URL requires a proxy redeployment
- No failover if the backend goes down
- Cannot distribute traffic across multiple instances
- Different environments need different proxy configurations

Target servers solve all of these. They are configured per-environment and referenced by name in the proxy.

## Creating Target Servers

Define your backend server instances as target servers in Apigee.

Create target servers using the management API:

```bash
# Create the first backend server
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/targetservers" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-server-1",
    "host": "backend-1.example.com",
    "port": 443,
    "isEnabled": true,
    "sSLInfo": {
      "enabled": true
    }
  }'

# Create the second backend server
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/targetservers" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-server-2",
    "host": "backend-2.example.com",
    "port": 443,
    "isEnabled": true,
    "sSLInfo": {
      "enabled": true
    }
  }'

# Create the third backend server
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/targetservers" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-server-3",
    "host": "backend-3.example.com",
    "port": 443,
    "isEnabled": true,
    "sSLInfo": {
      "enabled": true
    }
  }'
```

## Configuring the Load Balancer in the Target Endpoint

Reference the target servers in your proxy's TargetEndpoint configuration with a LoadBalancer element.

This configuration distributes traffic across three backend servers:

```xml
<!-- apiproxy/targets/default.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<TargetEndpoint name="default">
    <Description>Load balanced target endpoint</Description>

    <PreFlow name="PreFlow">
        <Request/>
        <Response/>
    </PreFlow>

    <PostFlow name="PostFlow">
        <Request/>
        <Response/>
    </PostFlow>

    <HTTPTargetConnection>
        <LoadBalancer>
            <Server name="backend-server-1"/>
            <Server name="backend-server-2"/>
            <Server name="backend-server-3"/>

            <!-- Load balancing algorithm -->
            <Algorithm>RoundRobin</Algorithm>

            <!-- Maximum number of retry attempts if a server fails -->
            <MaxFailures>3</MaxFailures>

            <!-- Retry if the connection fails -->
            <RetryEnabled>true</RetryEnabled>
        </LoadBalancer>

        <Path>/api/v1</Path>

        <Properties>
            <Property name="connect.timeout.millis">10000</Property>
            <Property name="io.timeout.millis">30000</Property>
        </Properties>
    </HTTPTargetConnection>
</TargetEndpoint>
```

## Load Balancing Algorithms

Apigee supports several load balancing algorithms:

### Round Robin

Distributes requests evenly across all servers in order:

```xml
<LoadBalancer>
    <Server name="backend-server-1"/>
    <Server name="backend-server-2"/>
    <Server name="backend-server-3"/>
    <Algorithm>RoundRobin</Algorithm>
</LoadBalancer>
```

Request 1 goes to server-1, request 2 to server-2, request 3 to server-3, request 4 back to server-1, and so on.

### Weighted Round Robin

Distribute more traffic to more powerful servers:

```xml
<LoadBalancer>
    <Server name="backend-server-1">
        <Weight>3</Weight>
    </Server>
    <Server name="backend-server-2">
        <Weight>2</Weight>
    </Server>
    <Server name="backend-server-3">
        <Weight>1</Weight>
    </Server>
    <Algorithm>Weighted</Algorithm>
</LoadBalancer>
```

With these weights, server-1 gets 50% of traffic, server-2 gets ~33%, and server-3 gets ~17%.

### Least Connections

Routes to the server with the fewest active connections:

```xml
<LoadBalancer>
    <Server name="backend-server-1"/>
    <Server name="backend-server-2"/>
    <Server name="backend-server-3"/>
    <Algorithm>LeastConnections</Algorithm>
</LoadBalancer>
```

This is useful when backend requests have variable processing times. Servers that process requests faster naturally get more traffic.

## Configuring Health Checks

Health checks let Apigee automatically remove unhealthy servers from the rotation and add them back when they recover.

Add a HealthMonitor to your LoadBalancer:

```xml
<HTTPTargetConnection>
    <LoadBalancer>
        <Server name="backend-server-1"/>
        <Server name="backend-server-2"/>
        <Server name="backend-server-3"/>
        <Algorithm>RoundRobin</Algorithm>
        <MaxFailures>3</MaxFailures>
    </LoadBalancer>

    <HealthMonitor>
        <IsEnabled>true</IsEnabled>

        <!-- Check every 30 seconds -->
        <IntervalInSec>30</IntervalInSec>

        <HTTPMonitor>
            <Request>
                <Verb>GET</Verb>
                <Path>/health</Path>
                <Header name="Accept">application/json</Header>
            </Request>

            <!-- Consider the server healthy if it returns 200 -->
            <SuccessResponse>
                <ResponseCode>200</ResponseCode>
            </SuccessResponse>
        </HTTPMonitor>
    </HealthMonitor>

    <Path>/api/v1</Path>
</HTTPTargetConnection>
```

The health monitor periodically sends requests to the `/health` endpoint on each target server. If a server returns a non-200 response or times out, it is removed from the rotation. When it starts responding correctly again, it is added back.

## Failover Configuration

Configure how the load balancer handles failures:

```xml
<LoadBalancer>
    <Server name="backend-server-1" isFallback="false"/>
    <Server name="backend-server-2" isFallback="false"/>
    <Server name="backend-server-3" isFallback="true"/>
    <Algorithm>RoundRobin</Algorithm>

    <!-- After 5 consecutive failures, mark the server as down -->
    <MaxFailures>5</MaxFailures>

    <!-- Retry on a different server if the first fails -->
    <RetryEnabled>true</RetryEnabled>

    <!-- Mark the server as available again after this delay -->
    <ServerUnhealthyResponse>
        <ResponseCode>503</ResponseCode>
    </ServerUnhealthyResponse>
</LoadBalancer>
```

The `isFallback="true"` setting on server-3 means it only receives traffic when the primary servers (1 and 2) are both down. This is useful for disaster recovery or overflow scenarios.

## Managing Target Servers Without Redeployment

One of the biggest advantages of target servers is that you can manage them without touching the proxy.

### Disable a Server for Maintenance

```bash
# Disable a target server (removes from rotation)
curl -X PUT \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/targetservers/backend-server-2" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-server-2",
    "host": "backend-2.example.com",
    "port": 443,
    "isEnabled": false,
    "sSLInfo": {
      "enabled": true
    }
  }'
```

### Update a Server's Address

```bash
# Change the backend host without redeploying the proxy
curl -X PUT \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/targetservers/backend-server-1" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-server-1",
    "host": "new-backend-1.example.com",
    "port": 443,
    "isEnabled": true,
    "sSLInfo": {
      "enabled": true
    }
  }'
```

### List All Target Servers

```bash
# List target servers for an environment
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/targetservers" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Environment-Specific Configuration

Because target servers are defined per environment, you can have different backends for different environments without changing the proxy:

```bash
# Development environment uses dev backends
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/dev/targetservers" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-server-1",
    "host": "dev-backend.example.com",
    "port": 443,
    "isEnabled": true
  }'

# Production environment uses production backends
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/targetservers" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-server-1",
    "host": "prod-backend-1.example.com",
    "port": 443,
    "isEnabled": true
  }'
```

The proxy references `backend-server-1` by name, and Apigee resolves it to the correct host based on which environment the proxy is deployed to.

## Monitoring Load Balancer Behavior

Track how traffic is distributed and which servers are handling requests:

```bash
# Check traffic distribution per target server
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/stats/target?select=sum(message_count)&timeRange=02/10/2026+00:00~02/17/2026+23:59&timeUnit=hour" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

Use the Trace tool to see which target server handled a specific request. The trace shows the `target.url` variable with the resolved server address.

## Summary

Apigee target server load balancing gives you flexible, manageable traffic distribution across multiple backend instances. Define servers per environment, choose the right algorithm (Round Robin for even distribution, Weighted for capacity-based, Least Connections for variable workloads), add health checks for automatic failover, and use the management API to enable, disable, or relocate servers without proxy redeployment. The separation between proxy configuration and server addresses is what makes this approach powerful - your proxy logic stays stable while your infrastructure evolves underneath it.
