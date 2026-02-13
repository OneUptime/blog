# How to Set Up a Lightsail Load Balancer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lightsail, Load Balancer, Networking

Description: Configure an Amazon Lightsail load balancer for distributing traffic across multiple instances, with SSL termination and health checks included.

---

A Lightsail load balancer distributes incoming traffic across multiple instances. It also gives you free SSL certificates and handles HTTPS termination, so your application instances don't need to manage certificates. At $18/month, it's straightforward and affordable.

## What You Get

A Lightsail load balancer includes:
- HTTP and HTTPS load balancing
- Free SSL/TLS certificate (one per load balancer)
- Health checks to route traffic only to healthy instances
- Session stickiness (optional)
- Support for up to 5 target instances

## Creating the Load Balancer

Create a load balancer and specify the port your application listens on.

```bash
# Create a load balancer that forwards traffic to port 80 on instances
aws lightsail create-load-balancer \
  --load-balancer-name my-app-lb \
  --instance-port 80 \
  --health-check-path "/health" \
  --tags key=Environment,value=production
```

The `instance-port` is where your application runs on the target instances. The load balancer listens on port 80 (HTTP) and 443 (HTTPS) by default and forwards to the instance port.

Check the status.

```bash
# Get load balancer details
aws lightsail get-load-balancer \
  --load-balancer-name my-app-lb \
  --query 'loadBalancer.{
    State: state,
    DNS: dnsName,
    Protocol: protocol,
    Port: instancePort,
    HealthCheck: healthCheckPath,
    InstanceCount: instanceHealthSummary | length(@)
  }'
```

## Attaching Instances

Attach your Lightsail instances to the load balancer.

```bash
# Attach instances to the load balancer
aws lightsail attach-instances-to-load-balancer \
  --load-balancer-name my-app-lb \
  --instance-names my-web-server-1 my-web-server-2

# Verify the instances are attached and healthy
aws lightsail get-load-balancer \
  --load-balancer-name my-app-lb \
  --query 'loadBalancer.instanceHealthSummary[].{Instance: instanceName, Health: instanceHealth}'
```

Instance health states:
- **healthy** - passing health checks, receiving traffic
- **unhealthy** - failing health checks, not receiving traffic
- **initial** - just attached, health checks in progress
- **draining** - being removed, finishing existing connections
- **unavailable** - instance is stopped or in an error state

## Setting Up SSL

Lightsail provides free SSL certificates for your custom domain. Create one and attach it to the load balancer.

```bash
# Create an SSL certificate
aws lightsail create-load-balancer-tls-certificate \
  --load-balancer-name my-app-lb \
  --certificate-name my-app-cert \
  --certificate-domain-name app.example.com \
  --certificate-alternative-names www.app.example.com
```

You'll need to add CNAME records to your DNS to validate domain ownership.

```bash
# Get the validation records
aws lightsail get-load-balancer-tls-certificates \
  --load-balancer-name my-app-lb \
  --query 'tlsCertificates[0].domainValidationRecords'
```

Add those CNAME records to your DNS provider. Once validated, the certificate is automatically attached.

```bash
# Check certificate status
aws lightsail get-load-balancer-tls-certificates \
  --load-balancer-name my-app-lb \
  --query 'tlsCertificates[].{Name: name, Status: status, Domain: domainName}'
```

## Configuring HTTPS Redirection

Force all HTTP traffic to HTTPS.

```bash
# Enable HTTPS redirection
aws lightsail update-load-balancer-attribute \
  --load-balancer-name my-app-lb \
  --attribute-name HttpsRedirectionEnabled \
  --attribute-value true
```

## Setting Up Session Stickiness

If your application requires sessions (like a shopping cart that stores state on the server), enable session stickiness.

```bash
# Enable session stickiness with a 1-hour cookie duration
aws lightsail update-load-balancer-attribute \
  --load-balancer-name my-app-lb \
  --attribute-name SessionStickinessEnabled \
  --attribute-value true

aws lightsail update-load-balancer-attribute \
  --load-balancer-name my-app-lb \
  --attribute-name SessionStickiness_LB_CookieDurationSeconds \
  --attribute-value "3600"
```

When enabled, the load balancer sets a cookie that ties a user's session to a specific instance.

## Configuring Health Checks

The health check determines which instances receive traffic. Customize it to match your application.

```bash
# Update the health check path
aws lightsail update-load-balancer-attribute \
  --load-balancer-name my-app-lb \
  --attribute-name HealthCheckPath \
  --attribute-value "/api/health"
```

Your health check endpoint should return a 200 status code when the instance is ready to serve traffic.

```javascript
// Simple health check endpoint for your application
const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  // Check dependencies like database, cache, etc.
  const isDbConnected = checkDatabaseConnection();
  const isCacheReady = checkCacheConnection();

  if (isDbConnected && isCacheReady) {
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      db: isDbConnected,
      cache: isCacheReady
    });
  }
});
```

## DNS Configuration

Point your domain to the load balancer's DNS name using a CNAME record.

```bash
# Get the load balancer DNS name
aws lightsail get-load-balancer \
  --load-balancer-name my-app-lb \
  --query 'loadBalancer.dnsName' \
  --output text
```

If using Lightsail DNS:

```bash
# Create a CNAME record pointing your domain to the load balancer
aws lightsail create-domain-entry \
  --domain-name example.com \
  --domain-entry '{
    "name": "app.example.com",
    "type": "CNAME",
    "target": "my-app-lb-abc123.us-east-1.elb.amazonaws.com"
  }'
```

For the apex domain (example.com without a subdomain), you'll need to use an A record with an alias if your DNS provider supports it, or use a subdomain with CNAME.

## Monitoring the Load Balancer

Check load balancer metrics to understand traffic patterns and health.

```bash
# Get request count for the last hour
aws lightsail get-load-balancer-metric-data \
  --load-balancer-name my-app-lb \
  --metric-name RequestCount \
  --period 300 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --statistics Sum \
  --unit Count

# Check for HTTP 5xx errors
aws lightsail get-load-balancer-metric-data \
  --load-balancer-name my-app-lb \
  --metric-name HTTPCode_Instance_5XX_Count \
  --period 300 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --statistics Sum \
  --unit Count

# Check unhealthy host count
aws lightsail get-load-balancer-metric-data \
  --load-balancer-name my-app-lb \
  --metric-name UnhealthyHostCount \
  --period 60 \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --statistics Maximum \
  --unit Count
```

## Scaling Behind the Load Balancer

To add capacity, create new instances and attach them.

```bash
# Create a new instance from a snapshot (clone of existing server)
aws lightsail create-instances-from-snapshot \
  --instance-names my-web-server-3 \
  --availability-zone us-east-1b \
  --instance-snapshot-name server-snapshot \
  --bundle-id small_3_0

# Wait for it to be running, then attach
aws lightsail attach-instances-to-load-balancer \
  --load-balancer-name my-app-lb \
  --instance-names my-web-server-3
```

To remove an instance for maintenance:

```bash
# Detach an instance (it will drain existing connections)
aws lightsail detach-instances-from-load-balancer \
  --load-balancer-name my-app-lb \
  --instance-names my-web-server-1
```

## Preparing Your Application for Load Balancing

A few things to consider when running behind a load balancer:

1. **Stateless design**: Don't store session data in memory - use a database or Redis
2. **Health endpoint**: Implement a reliable health check endpoint
3. **Shared storage**: If instances need to share files, use S3 or an attached disk
4. **Logs**: Centralize logging since requests hit different instances
5. **X-Forwarded-For**: The real client IP is in the `X-Forwarded-For` header

```javascript
// Get the real client IP behind the load balancer
app.get('/api/info', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;

  res.json({
    clientIp,
    protocol,
    server: require('os').hostname()
  });
});
```

## Troubleshooting Checklist

1. All instances unhealthy? Check that the health check path returns 200 and the instance port is correct
2. 502 Bad Gateway? Your application isn't running or isn't listening on the instance port
3. SSL not working? Verify the certificate is validated and the CNAME records are correct
4. Uneven traffic distribution? Check instance health - unhealthy instances don't get traffic
5. Timeouts? Your application might be too slow - check instance performance metrics

The Lightsail load balancer is the easiest way to add redundancy and SSL to your web applications. For protecting your data with backups, see our guide on [using Lightsail snapshots](https://oneuptime.com/blog/post/2026-02-12-use-lightsail-snapshots-backup/view).
