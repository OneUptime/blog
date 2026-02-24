# How to Set Up Egress for Cloud Provider Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Cloud Providers, AWS, GCP, Azure

Description: Configure Istio egress rules for AWS, GCP, and Azure cloud services including S3, BigQuery, Blob Storage, and managed databases.

---

When your Kubernetes workloads run on a cloud provider, they almost certainly need to talk to that provider's services. Your app might pull objects from S3, write logs to CloudWatch, query BigQuery, or connect to a managed database. If you have Istio running in REGISTRY_ONLY mode, all of those calls will fail unless you configure ServiceEntries for each cloud endpoint.

Cloud provider services make this tricky because they use many different hostnames, some of which are dynamically generated. This guide covers practical configurations for the three major cloud providers.

## AWS Services

AWS services use regional endpoints with a predictable pattern. Here are ServiceEntries for the most commonly accessed services.

### S3

S3 has both path-style and virtual-hosted-style endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3
  namespace: default
spec:
  hosts:
  - "s3.amazonaws.com"
  - "s3.us-east-1.amazonaws.com"
  - "s3.us-west-2.amazonaws.com"
  - "*.s3.amazonaws.com"
  - "*.s3.us-east-1.amazonaws.com"
  - "*.s3.us-west-2.amazonaws.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

Note that wildcard hosts use `resolution: NONE` because Istio cannot do DNS lookups on wildcard entries.

### SQS and SNS

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-sqs-sns
  namespace: default
spec:
  hosts:
  - "sqs.us-east-1.amazonaws.com"
  - "sqs.us-west-2.amazonaws.com"
  - "sns.us-east-1.amazonaws.com"
  - "sns.us-west-2.amazonaws.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### RDS and DynamoDB

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-databases
  namespace: default
spec:
  hosts:
  - "dynamodb.us-east-1.amazonaws.com"
  - "dynamodb.us-west-2.amazonaws.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-rds
  namespace: default
spec:
  hosts:
  - "mydb-instance.abc123def456.us-east-1.rds.amazonaws.com"
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  - number: 3306
    name: tcp-mysql
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

For RDS, you need to list the specific endpoint for your database instance. Each RDS instance has a unique hostname.

### STS (Security Token Service)

Almost every AWS SDK call starts with STS for credential management. Do not forget this one:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-sts
  namespace: default
spec:
  hosts:
  - "sts.amazonaws.com"
  - "sts.us-east-1.amazonaws.com"
  - "sts.us-west-2.amazonaws.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### EC2 Metadata Service

If your pods use IRSA (IAM Roles for Service Accounts) or instance metadata, you need to allow access to the metadata endpoint:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-metadata
  namespace: default
spec:
  hosts:
  - "169.254.169.254"
  addresses:
  - "169.254.169.254"
  ports:
  - number: 80
    name: http
    protocol: HTTP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 169.254.169.254
```

## Google Cloud Platform Services

GCP services generally use `*.googleapis.com` domains.

### General GCP APIs

A broad ServiceEntry that covers most GCP API calls:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-apis
  namespace: default
spec:
  hosts:
  - "*.googleapis.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

If you prefer to be more specific instead of using a wildcard:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-specific-apis
  namespace: default
spec:
  hosts:
  - "storage.googleapis.com"
  - "bigquery.googleapis.com"
  - "pubsub.googleapis.com"
  - "logging.googleapis.com"
  - "monitoring.googleapis.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### GCP OAuth and Auth

GCP SDK calls need access to auth endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-auth
  namespace: default
spec:
  hosts:
  - "oauth2.googleapis.com"
  - "accounts.google.com"
  - "www.googleapis.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### GCP Metadata Server

Similar to AWS, GKE pods use a metadata server:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: gcp-metadata
  namespace: default
spec:
  hosts:
  - "metadata.google.internal"
  addresses:
  - "169.254.169.254"
  ports:
  - number: 80
    name: http
    protocol: HTTP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 169.254.169.254
```

## Azure Services

Azure services use `*.core.windows.net`, `*.azure.com`, and several other domains.

### Azure Storage

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: azure-storage
  namespace: default
spec:
  hosts:
  - "*.blob.core.windows.net"
  - "*.queue.core.windows.net"
  - "*.table.core.windows.net"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

### Azure Active Directory

Azure SDK calls usually start with AAD authentication:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: azure-auth
  namespace: default
spec:
  hosts:
  - "login.microsoftonline.com"
  - "graph.microsoft.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### Azure SQL and Cosmos DB

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: azure-databases
  namespace: default
spec:
  hosts:
  - "*.database.windows.net"
  - "*.documents.azure.com"
  ports:
  - number: 1433
    name: tcp-mssql
    protocol: TCP
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

## Adding Connection Pool Settings

For cloud services that you call heavily, add DestinationRules with connection pool settings to prevent overwhelming the endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: s3-connection-pool
  namespace: default
spec:
  host: "s3.us-east-1.amazonaws.com"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 50
    tls:
      mode: SIMPLE
```

## Debugging Cloud Provider Egress

When cloud SDK calls fail after enabling REGISTRY_ONLY mode, the most common issue is a missing hostname. Cloud SDKs often call multiple endpoints during a single operation. For example, an AWS S3 upload might hit STS first, then the S3 regional endpoint, then the bucket-specific virtual host.

Enable Envoy access logging and watch for 502 errors:

```bash
kubectl logs <pod-name> -c istio-proxy | grep "BlackHoleCluster"
```

Each BlackHoleCluster line tells you a hostname that needs a ServiceEntry. Add them one by one until the full operation succeeds.

You can also check which external hosts your pod is trying to reach by looking at Envoy stats:

```bash
kubectl exec <pod-name> -c istio-proxy -- pilot-agent request GET /stats | grep "BlackHoleCluster"
```

This systematic approach works for any cloud provider. Start with the main service endpoints, test, find missing hosts in the logs, and add them until everything works.
