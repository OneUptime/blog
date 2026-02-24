# How to Set Up ServiceEntry for AWS Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, AWS, Kubernetes, Cloud Services

Description: Configure Istio ServiceEntry for AWS services like S3, SQS, DynamoDB, and others to get mesh observability and traffic management for AWS API calls.

---

If you run workloads on Kubernetes and use AWS services, your pods are constantly calling AWS APIs. Every S3 upload, SQS message, DynamoDB query, and Secrets Manager fetch goes through an HTTPS call to an AWS endpoint. By default, Istio does not know about these calls, so they either get blocked (in REGISTRY_ONLY mode) or fly under the radar with no metrics.

Setting up ServiceEntries for AWS services gives you visibility into which pods call which AWS services, how often they call them, and how fast those calls are. That is incredibly useful for debugging and capacity planning.

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

This allows any call to `*.amazonaws.com` through the mesh. The `resolution: NONE` is required for wildcard hosts because Envoy cannot know which specific hostname will be requested ahead of time.

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

Now your Prometheus metrics show separate entries for S3, SQS, and DynamoDB.

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

The wildcard entries handle virtual-hosted bucket names. The `resolution: NONE` is necessary because of the wildcards.

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

If your pods pull images from ECR or your application interacts with ECR:

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

You can apply timeout and retry policies to AWS API calls:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: aws-s3-policy
spec:
  hosts:
    - "s3.us-east-1.amazonaws.com"
  http:
    - timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: 5xx,reset,connect-failure
      route:
        - destination:
            host: s3.us-east-1.amazonaws.com
            port:
              number: 443
```

Be careful with retries on AWS services though. The AWS SDK already implements retry logic with exponential backoff. Adding Istio retries on top can cause double-retrying, which wastes resources and can hit API rate limits faster.

A safer approach is to set only timeouts at the Istio level and let the AWS SDK handle retries:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: aws-dynamodb-timeout
spec:
  hosts:
    - "dynamodb.us-east-1.amazonaws.com"
  http:
    - timeout: 15s
      route:
        - destination:
            host: dynamodb.us-east-1.amazonaws.com
            port:
              number: 443
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
      http:
        maxRequestsPerConnection: 100
        maxPendingRequests: 50
```

## Monitoring AWS API Calls

After registering AWS services, check your metrics:

```bash
# See which AWS services your pods call
istio_requests_total{destination_service=~".*amazonaws.com"}

# Check latency to DynamoDB
istio_request_duration_milliseconds_bucket{destination_service="dynamodb.us-east-1.amazonaws.com"}
```

In Kiali, AWS services appear as external service nodes in your service graph, showing you exactly which microservices depend on which AWS services.

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

This gives you a solid foundation. As you add more AWS services, extend the hosts list or create new ServiceEntries. The key is to make sure every AWS endpoint your application calls is registered so you get full visibility into your AWS dependencies.
