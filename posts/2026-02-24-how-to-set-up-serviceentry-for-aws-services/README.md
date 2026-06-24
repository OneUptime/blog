# How to Set Up ServiceEntry for AWS Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, AWS, Kubernetes, Cloud Services

Description: Configure Istio ServiceEntry for AWS services like S3, SQS, DynamoDB, and others to get mesh observability and traffic management for AWS API calls.

---

If you run workloads on Kubernetes and use AWS services, your pods are constantly calling AWS APIs. Every S3 upload, SQS message, DynamoDB query, and Secrets Manager fetch goes through an HTTPS call to an AWS endpoint. By default, Istio does not know about these calls, so they either get blocked (in REGISTRY_ONLY mode) or fly under the radar as passthrough traffic.

Setting up ServiceEntries for AWS services gives you visibility into which pods connect to which AWS service hostnames. For normal AWS SDK HTTPS traffic, Istio sees the SNI and connection-level telemetry, not individual HTTP API operations inside the encrypted TLS stream. That is still useful for debugging and capacity planning.

## AWS Endpoint Patterns

AWS services follow predictable endpoint patterns. Most use regional endpoints like:

- `s3.us-east-1.amazonaws.com`
- `sqs.us-east-1.amazonaws.com`
- `dynamodb.us-east-1.amazonaws.com`

Some services use global endpoints:
- `sts.amazonaws.com`
- `iam.amazonaws.com`

And S3 has additional bucket-specific endpoints:
- `my-bucket.s3.us-east-1.amazonaws.com`

Understanding these patterns helps you decide whether to create specific ServiceEntries or use wildcards.

## Wildcard ServiceEntry for All AWS Services

The simplest approach is a single wildcard ServiceEntry that covers all AWS API calls:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-apis
spec:
  hosts:
    - "*.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

This allows any call to `*.amazonaws.com` through the mesh. The `resolution: NONE` setting is commonly used for wildcard hosts because the application resolves the actual hostname before the connection is redirected to the sidecar. In Istio versions that support it, `DYNAMIC_DNS` is another option for wildcard HTTPS destinations.

Pros:
- One resource covers all AWS services
- No maintenance when you start using new AWS services

Cons:
- Less granular metrics (harder to tell S3 traffic from DynamoDB traffic)
- Cannot apply different traffic policies per AWS service
- Opens access to all AWS endpoints

## Per-Service AWS ServiceEntries

For better observability, create separate ServiceEntries for each AWS service you use:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3
spec:
  hosts:
    - "s3.us-east-1.amazonaws.com"
    - "s3.us-west-2.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-sqs
spec:
  hosts:
    - "sqs.us-east-1.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-dynamodb
spec:
  hosts:
    - "dynamodb.us-east-1.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Now Istio can label the destination service separately for S3, SQS, and DynamoDB instead of treating everything as unknown passthrough traffic.

## S3 Specific Configuration

S3 is tricky because the AWS SDK can use different endpoint styles:

**Path-style**: `s3.us-east-1.amazonaws.com/my-bucket/key`
**Virtual-hosted style**: `my-bucket.s3.us-east-1.amazonaws.com/key`

For virtual-hosted style, you need to handle the bucket name in the hostname:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3-buckets
spec:
  hosts:
    - "*.s3.us-east-1.amazonaws.com"
    - "s3.us-east-1.amazonaws.com"
    - "*.s3.amazonaws.com"
    - "s3.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

The wildcard entries handle virtual-hosted bucket names. Use `resolution: NONE` for the broadest compatibility with wildcard hosts, or `DYNAMIC_DNS` on Istio versions that support wildcard DNS resolution.

## STS and IAM (Global Endpoints)

AWS STS (Security Token Service) and IAM use global endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-global-services
spec:
  hosts:
    - "sts.amazonaws.com"
    - "iam.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

If you use regional STS endpoints (recommended for latency), add those too:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-sts-regional
spec:
  hosts:
    - "sts.us-east-1.amazonaws.com"
    - "sts.us-west-2.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## ECR (Container Registry)

Kubernetes image pulls are done by the kubelet on the node, outside the application pod's sidecar. Add ECR ServiceEntries when an application inside the mesh calls the ECR API or talks to an ECR registry endpoint:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-ecr
spec:
  hosts:
    - "api.ecr.us-east-1.amazonaws.com"
    - "123456789012.dkr.ecr.us-east-1.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Replace `123456789012` with your actual AWS account ID.

## Adding Traffic Policies for AWS Services

For normal AWS SDK HTTPS calls, Istio does not decrypt the HTTP request, so `VirtualService` HTTP timeout and retry policies do not apply to the AWS API operation. Istio `http` routes apply to HTTP, HTTP/2, and gRPC service ports; HTTPS passthrough traffic uses TLS routing based on SNI.

If you need mesh-level limits for AWS HTTPS calls, prefer connection-level controls and let the AWS SDK handle request timeouts and retries:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: aws-dynamodb-connections
spec:
  host: dynamodb.us-east-1.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
        maxConnections: 200
```

## Connection Pool Limits

AWS services have their own rate limits. You can use Istio to enforce connection limits from your side:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: aws-dynamodb-pool
spec:
  host: dynamodb.us-east-1.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
```

## Monitoring AWS API Calls

After registering AWS services, check your metrics. For normal AWS SDK HTTPS traffic, use TCP metrics:

```bash
# See which AWS service hosts your pods connect to

istio_tcp_connections_opened_total{destination_service=~".*amazonaws.com"}

# Check bytes sent to DynamoDB
istio_tcp_sent_bytes_total{destination_service="dynamodb.us-east-1.amazonaws.com"}
```

If you use TLS origination or otherwise make HTTP visible to Istio, HTTP metrics such as `istio_requests_total` and `istio_request_duration_milliseconds` can apply. In Kiali, AWS services can appear as external service nodes in your service graph, showing you which microservices depend on which AWS service hostnames.

## Complete Example for a Typical Application

Here is a comprehensive set of ServiceEntries for an application that uses S3, SQS, DynamoDB, Secrets Manager, and STS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-services
spec:
  hosts:
    - "s3.us-east-1.amazonaws.com"
    - "sqs.us-east-1.amazonaws.com"
    - "dynamodb.us-east-1.amazonaws.com"
    - "secretsmanager.us-east-1.amazonaws.com"
    - "sts.us-east-1.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
# Separate entry for S3 virtual-hosted buckets
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3-buckets
spec:
  hosts:
    - "*.s3.us-east-1.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

This gives you a solid foundation. As you add more AWS services, extend the hosts list or create new ServiceEntries. The key is to make sure every AWS endpoint your application calls is registered so you get visibility into your AWS dependencies.
