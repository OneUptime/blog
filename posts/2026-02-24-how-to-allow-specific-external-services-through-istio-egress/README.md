# How to Allow Specific External Services Through Istio Egress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, ServiceEntry, Allowlisting, Service Mesh

Description: Practical guide to creating precise ServiceEntry configurations that allow specific external services through Istio egress while keeping everything else blocked.

---

Once you switch Istio to REGISTRY_ONLY mode, every external service your applications need must be explicitly registered. Getting the ServiceEntry configuration right for each type of service is where most people spend their time. Different external services have different port requirements, protocol needs, and DNS behaviors.

This guide provides tested ServiceEntry patterns for common external services and explains the configuration choices behind each one.

## The Basics of ServiceEntry

A ServiceEntry tells Istio's service registry about an external service. The minimum required fields are:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: my-external-service
spec:
  hosts:
  - "api.example.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Each field matters:

- **hosts** - The hostname(s) your application connects to
- **ports** - The port and protocol. Naming the port correctly is critical for Istio to handle the traffic properly
- **resolution** - How Istio resolves the host to an IP address
- **location** - MESH_EXTERNAL tells Istio this service is outside the mesh

## Allowing HTTPS API Services

Most external APIs use HTTPS on port 443. Use `protocol: TLS` (not `HTTPS`) when your application initiates TLS directly:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: payment-services
spec:
  hosts:
  - "api.stripe.com"
  - "api.paypal.com"
  - "api.square.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Why `TLS` and not `HTTPS`? When your application sends HTTPS, the sidecar sees an already-encrypted TLS connection. It cannot inspect the HTTP layer. Setting the protocol to `TLS` tells Istio to handle it as a TLS passthrough, routing based on the SNI header.

Use `protocol: HTTPS` only when you are doing TLS origination at the sidecar (where the application sends plain HTTP and Istio encrypts it).

## Allowing External Databases

### Amazon RDS PostgreSQL

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-postgres
spec:
  hosts:
  - "mydb.cluster-abc123.us-east-1.rds.amazonaws.com"
  - "mydb.cluster-ro-abc123.us-east-1.rds.amazonaws.com"
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

Include both the writer and reader endpoints for Aurora clusters.

### Google Cloud SQL MySQL

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloud-sql
spec:
  hosts:
  - "cloud-sql-proxy.local"
  addresses:
  - "10.100.0.5/32"
  ports:
  - number: 3306
    name: tcp-mysql
    protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 10.100.0.5
```

If you are using the Cloud SQL Auth Proxy as a sidecar, traffic goes to localhost and you don't need a ServiceEntry. If connecting directly to a private IP, use STATIC resolution.

### MongoDB Atlas

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas
spec:
  hosts:
  - "*.abc123.mongodb.net"
  ports:
  - number: 27017
    name: tcp-mongo
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

MongoDB Atlas uses multiple shard hosts under the same domain. The wildcard handles all of them.

### Redis (ElastiCache or Memorystore)

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-cache
spec:
  hosts:
  - "my-redis.abc123.use1.cache.amazonaws.com"
  ports:
  - number: 6379
    name: tcp-redis
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

For Redis clusters with TLS enabled:

```yaml
ports:
- number: 6380
  name: tls-redis
  protocol: TLS
```

## Allowing Messaging and Notification Services

### Slack Webhooks

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: slack
spec:
  hosts:
  - "hooks.slack.com"
  - "slack.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### SendGrid Email

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: sendgrid
spec:
  hosts:
  - "api.sendgrid.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### Twilio SMS

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: twilio
spec:
  hosts:
  - "api.twilio.com"
  - "video.twilio.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Allowing Cloud Provider Services

### AWS Services

AWS services spread across many domains. You often need wildcards:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-core
spec:
  hosts:
  - "*.amazonaws.com"
  - "*.aws.amazon.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

If you want tighter control, list specific services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-specific
spec:
  hosts:
  - "s3.us-east-1.amazonaws.com"
  - "sqs.us-east-1.amazonaws.com"
  - "sns.us-east-1.amazonaws.com"
  - "sts.amazonaws.com"
  - "secretsmanager.us-east-1.amazonaws.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### GCP Services

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-services
spec:
  hosts:
  - "*.googleapis.com"
  - "accounts.google.com"
  - "oauth2.googleapis.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

## Allowing Monitoring and Observability Services

### Datadog

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: datadog
spec:
  hosts:
  - "*.datadoghq.com"
  - "*.datadoghq.eu"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

### New Relic

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: newrelic
spec:
  hosts:
  - "*.newrelic.com"
  - "*.nr-data.net"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

## Organizing ServiceEntries

As your allow list grows, organization becomes important. A few strategies:

### By Namespace

Put ServiceEntries in the namespace that needs them, with `exportTo` to limit scope:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe
  namespace: payments
spec:
  hosts:
  - "api.stripe.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "."
```

Only pods in the `payments` namespace can reach Stripe.

### Shared ServiceEntries

For services used across namespaces, put them in a shared namespace and export to all:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: common-services
  namespace: istio-config
spec:
  hosts:
  - "hooks.slack.com"
  - "api.pagerduty.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "*"
```

## Verifying Allow List Entries

After creating ServiceEntries, verify they work:

```bash
# Check the service is in the registry
istioctl proxy-config clusters deploy/my-app | grep stripe

# Test connectivity
kubectl exec deploy/my-app -- curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com

# Check that unlisted services are blocked
kubectl exec deploy/my-app -- curl -s -o /dev/null -w "%{http_code}" https://not-allowed.com
# Should return 502
```

## Troubleshooting

**Getting 502 even after adding ServiceEntry.** Check the ServiceEntry is in the correct namespace and the `exportTo` setting allows visibility. Also verify the port number and protocol match what your application actually uses.

**Getting connection reset instead of 502.** This usually happens for TCP protocol connections (databases). The sidecar resets the TCP connection instead of sending an HTTP 502.

**Application works but metrics show unknown destination.** The ServiceEntry might have the wrong protocol. For HTTPS traffic from the application, use `protocol: TLS`. For HTTP traffic, use `protocol: HTTP`.

## Summary

Allowing specific external services through Istio egress requires creating ServiceEntry resources with the correct host, port, protocol, and resolution settings. Use `protocol: TLS` for services your application connects to with HTTPS, `protocol: TCP` for databases, and `resolution: DNS` for single hosts or `resolution: NONE` for wildcards. Organize ServiceEntries by namespace using `exportTo` to limit which workloads can access each external service, and always verify connectivity after adding new entries.
