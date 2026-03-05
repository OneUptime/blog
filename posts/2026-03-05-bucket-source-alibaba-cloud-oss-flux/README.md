# How to Configure Bucket Source with Alibaba Cloud OSS in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Alibaba Cloud, OSS, Bucket, S3

Description: Learn how to configure Flux CD to pull Kubernetes manifests from Alibaba Cloud Object Storage Service (OSS) using the generic S3-compatible Bucket source provider.

---

## Introduction

Alibaba Cloud Object Storage Service (OSS) is a highly scalable object storage service that supports the S3 API. Flux CD can use Alibaba Cloud OSS as a Bucket source by leveraging the `generic` provider, which works with any S3-compatible storage endpoint. This guide covers configuring OSS as a Flux source, including authentication, bucket setup, and integration with CI/CD pipelines.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- An Alibaba Cloud account with OSS enabled
- `aliyun` CLI or `ossutil` installed
- `kubectl` access to your cluster
- An AccessKey pair for authentication

## Creating an OSS Bucket

Create a bucket using the Alibaba Cloud console or CLI.

```bash
# Create an OSS bucket using ossutil
ossutil mb oss://flux-manifests --region cn-hangzhou

# Or using the aliyun CLI
aliyun oss mb oss://flux-manifests --region cn-hangzhou
```

## Uploading Manifests

Upload your Kubernetes manifests to the OSS bucket.

```bash
# Upload manifests using ossutil
ossutil cp -r ./manifests/ oss://flux-manifests/ --region cn-hangzhou

# Verify the upload
ossutil ls oss://flux-manifests/ --region cn-hangzhou
```

Alternatively, use the AWS CLI with the OSS S3-compatible endpoint.

```bash
# Upload using the AWS CLI with Alibaba Cloud OSS endpoint
aws s3 sync ./manifests/ s3://flux-manifests/ \
  --endpoint-url https://oss-cn-hangzhou.aliyuncs.com
```

## Creating an AccessKey for Flux

Create a dedicated RAM user with read-only access to the OSS bucket. Avoid using your root account AccessKey.

```bash
# Create a RAM user for Flux
aliyun ram CreateUser --UserName flux-oss-reader

# Create an AccessKey pair for the user
aliyun ram CreateAccessKey --UserName flux-oss-reader
```

Create a custom policy for read-only OSS access.

```bash
# Create a policy document
cat > flux-oss-policy.json <<'EOF'
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetObject",
        "oss:ListObjects",
        "oss:GetBucketInfo"
      ],
      "Resource": [
        "acs:oss:*:*:flux-manifests",
        "acs:oss:*:*:flux-manifests/*"
      ]
    }
  ]
}
EOF

# Create and attach the policy
aliyun ram CreatePolicy \
  --PolicyName flux-oss-readonly \
  --PolicyDocument "$(cat flux-oss-policy.json)"

aliyun ram AttachPolicyToUser \
  --PolicyName flux-oss-readonly \
  --PolicyType Custom \
  --UserName flux-oss-reader
```

## Creating Flux Credentials

Create a Kubernetes secret with the Alibaba Cloud AccessKey pair. The `generic` provider expects `accesskey` and `secretkey` fields.

```bash
# Create a secret with Alibaba Cloud OSS credentials
kubectl create secret generic oss-bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=YOUR_ACCESS_KEY_ID \
  --from-literal=secretkey=YOUR_ACCESS_KEY_SECRET
```

## Configuring the Bucket Source

Create a Bucket source using the `generic` provider with the Alibaba Cloud OSS endpoint.

```yaml
# flux-system/oss-bucket-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Use generic provider for S3-compatible storage
  provider: generic
  bucketName: flux-manifests
  # Alibaba Cloud OSS endpoint format: oss-{region}.aliyuncs.com
  endpoint: oss-cn-hangzhou.aliyuncs.com
  region: cn-hangzhou
  secretRef:
    name: oss-bucket-creds
```

Apply and verify.

```bash
# Apply the Bucket source
kubectl apply -f oss-bucket-source.yaml

# Check the status
flux get sources bucket -n flux-system
```

## Using the Internal OSS Endpoint

If your Kubernetes cluster runs on Alibaba Cloud (ACK), use the internal endpoint for lower latency and no data transfer charges.

```yaml
# flux-system/oss-bucket-internal.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: generic
  bucketName: flux-manifests
  # Use the internal endpoint for clusters on Alibaba Cloud
  endpoint: oss-cn-hangzhou-internal.aliyuncs.com
  region: cn-hangzhou
  secretRef:
    name: oss-bucket-creds
```

## Using Prefixes

Scope the download to specific paths within the bucket.

```yaml
# flux-system/oss-bucket-prefix.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  interval: 5m
  provider: generic
  bucketName: flux-manifests
  endpoint: oss-cn-hangzhou.aliyuncs.com
  region: cn-hangzhou
  # Only download files under the production prefix
  prefix: production/my-app/
  secretRef:
    name: oss-bucket-creds
```

## Connecting a Kustomization

Deploy the manifests from the OSS Bucket source.

```yaml
# flux-system/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: my-app
  sourceRef:
    kind: Bucket
    name: my-app
  path: ./
  prune: true
  wait: true
```

## CI/CD Integration

Upload manifests to OSS from your CI/CD pipeline using ossutil or the AWS CLI.

```yaml
# .github/workflows/upload-to-oss.yaml
name: Upload Manifests to Alibaba Cloud OSS
on:
  push:
    branches: [main]
    paths: ['manifests/**']

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ossutil
        run: |
          curl -sL https://gosspublic.alicdn.com/ossutil/1.7.18/ossutil-v1.7.18-linux-amd64.zip \
            -o ossutil.zip
          unzip ossutil.zip
          chmod +x ossutil-v1.7.18-linux-amd64/ossutil64
          sudo mv ossutil-v1.7.18-linux-amd64/ossutil64 /usr/local/bin/ossutil

      - name: Configure ossutil
        run: |
          ossutil config \
            -e oss-cn-hangzhou.aliyuncs.com \
            -i ${{ secrets.OSS_ACCESS_KEY_ID }} \
            -k ${{ secrets.OSS_ACCESS_KEY_SECRET }}

      - name: Upload manifests
        run: |
          # Sync manifests to OSS
          ossutil sync ./manifests/ oss://flux-manifests/ --force --delete
```

## Verifying the Setup

```bash
# Check Bucket source status
flux get sources bucket -n flux-system

# Get detailed status
kubectl describe bucket my-app -n flux-system

# View source-controller logs
kubectl logs -n flux-system deployment/source-controller | grep -i "my-app"
```

## Troubleshooting

**Error: AccessDenied**

The AccessKey does not have permission to access the bucket. Verify the RAM policy is attached to the user.

```bash
# Check policies attached to the user
aliyun ram ListPoliciesForUser --UserName flux-oss-reader
```

**Error: NoSuchBucket**

The bucket name or region is incorrect. OSS bucket names are globally unique.

```bash
# List your buckets
ossutil ls
```

**Error: connection timeout**

If the cluster is on Alibaba Cloud, make sure you are using the internal endpoint. If the cluster is external, ensure the public endpoint is reachable.

## Best Practices

1. **Use RAM users with minimal permissions.** Create a dedicated RAM user for Flux with read-only access to the specific bucket.

2. **Use internal endpoints on ACK.** When running on Alibaba Cloud Kubernetes (ACK), use the internal OSS endpoint for better performance and no egress charges.

3. **Enable OSS versioning.** Turn on bucket versioning to maintain object change history and enable recovery from accidental overwrites.

4. **Rotate AccessKeys regularly.** Set up a rotation schedule for the AccessKey pair used by Flux.

5. **Enable OSS logging.** Turn on access logging to track who reads and writes to the bucket.

## Conclusion

Alibaba Cloud OSS works seamlessly with Flux CD through the `generic` S3-compatible provider. By creating a dedicated RAM user, configuring the appropriate OSS endpoint, and setting up the Bucket source, you can deliver Kubernetes manifests through Alibaba Cloud's object storage. For ACK clusters, using the internal endpoint provides optimal performance. Combined with CI/CD automation, this creates a complete GitOps pipeline for Alibaba Cloud-based infrastructure.
