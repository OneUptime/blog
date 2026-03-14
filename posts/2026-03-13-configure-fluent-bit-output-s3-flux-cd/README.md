# How to Configure Fluent Bit Output to S3 with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Fluent Bit, AWS S3, Log Archival

Description: Configure Fluent Bit to archive Kubernetes logs to AWS S3 using Flux CD for GitOps-managed long-term log storage.

---

## Introduction

Shipping logs to AWS S3 is a common requirement for long-term retention and compliance. S3 offers virtually unlimited storage at low cost, and logs stored there can be queried with Amazon Athena, processed with AWS Glue, or ingested into a SIEM. Fluent Bit's S3 output plugin writes log chunks directly to S3 in a configurable format (JSON Lines, Parquet via AWS Kinesis Firehose, etc.) with built-in upload buffering and retry logic.

Managing the S3 output configuration through Flux CD ensures that bucket names, IAM role annotations, and upload intervals are version-controlled. AWS IAM credentials are injected via IRSA (IAM Roles for Service Accounts) or environment variables from Kubernetes Secrets — never stored in plaintext in Git.

This guide configures Fluent Bit's S3 output plugin as a Flux HelmRelease on an EKS cluster using IRSA for credential-free authentication.

## Prerequisites

- EKS cluster with IRSA enabled (or any cluster with AWS credentials available)
- Fluent Bit Helm repository added to Flux
- An S3 bucket created and an IAM role with `s3:PutObject` permission
- `kubectl` and `flux` CLIs installed

## Step 1: Create the IAM Role and Service Account

Create an IAM role that allows the Fluent Bit service account to write to your S3 bucket.

```json
// iam-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-logs-bucket",
        "arn:aws:s3:::my-logs-bucket/*"
      ]
    }
  ]
}
```

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name FluentBitS3Policy \
  --policy-document file://iam-policy.json

# Create IAM role with IRSA trust policy (replace with your cluster OIDC URL)
eksctl create iamserviceaccount \
  --name fluent-bit \
  --namespace logging \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789:policy/FluentBitS3Policy \
  --approve
```

## Step 2: Deploy Fluent Bit with S3 Output

```yaml
# infrastructure/logging/fluent-bit.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: fluent-bit
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: fluent-bit
      version: "0.46.7"
      sourceRef:
        kind: HelmRepository
        name: fluent
        namespace: flux-system
  values:
    # Use the IRSA-annotated ServiceAccount
    serviceAccount:
      create: false
      name: fluent-bit  # pre-created by eksctl with IRSA annotation

    tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule

    resources:
      requests:
        cpu: "50m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"

    config:
      inputs: |
        [INPUT]
            Name              tail
            Path              /var/log/containers/*.log
            Parser            cri
            Tag               kube.*
            Mem_Buf_Limit     32MB
            Skip_Long_Lines   On
            Refresh_Interval  10

      filters: |
        [FILTER]
            Name                kubernetes
            Match               kube.*
            Kube_URL            https://kubernetes.default.svc:443
            Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
            Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
            Merge_Log           On
            Keep_Log            Off
            K8S-Logging.Parser  On
            K8S-Logging.Exclude On

      outputs: |
        [OUTPUT]
            Name                          s3
            Match                         kube.*
            bucket                        my-logs-bucket
            region                        us-east-1
            # S3 object key prefix - uses strftime formatting
            s3_key_format                 /kubernetes/%Y/%m/%d/%H/$TAG[1].json.gz
            # Compress with gzip before uploading
            compression                   gzip
            # Upload a new object every 5 minutes
            upload_timeout                5m
            # Minimum object size before uploading (100 MB)
            upload_chunk_size             100000000
            # Use multipart upload for large objects
            use_put_object                Off
            # Local buffer directory for in-progress uploads
            store_dir                     /tmp/fluent-bit/s3
            store_dir_limit_size          2G
            # Retry on failure
            Retry_Limit                   5
            # Add a unique suffix to prevent key collisions between pods
            static_file_path              Off

    # Persistent storage for S3 upload buffer
    extraVolumes:
      - name: s3-buffer
        emptyDir:
          sizeLimit: 2Gi
    extraVolumeMounts:
      - name: s3-buffer
        mountPath: /tmp/fluent-bit/s3
```

## Step 3: Route Specific Namespaces to Separate S3 Prefixes

Use the `rewrite_tag` filter to route logs from different namespaces to different S3 paths:

```yaml
      filters: |
        # (existing kubernetes filter) ...

        [FILTER]
            Name    rewrite_tag
            Match   kube.*
            Rule    $kubernetes['namespace_name'] ^production$ kube.prod false
            Rule    $kubernetes['namespace_name'] ^staging$    kube.staging false

      outputs: |
        [OUTPUT]
            Name            s3
            Match           kube.prod
            bucket          my-logs-bucket
            region          us-east-1
            s3_key_format   /production/%Y/%m/%d/%H/$TAG.json.gz
            compression     gzip
            upload_timeout  5m

        [OUTPUT]
            Name            s3
            Match           kube.staging
            bucket          my-logs-bucket-staging
            region          us-east-1
            s3_key_format   /staging/%Y/%m/%d/%H/$TAG.json.gz
            compression     gzip
            upload_timeout  10m
```

## Step 4: Configure S3 Lifecycle for Retention

Apply an S3 lifecycle policy outside of Flux to automatically delete old logs:

```json
// s3-lifecycle.json
{
  "Rules": [
    {
      "ID": "DeleteOldLogs",
      "Status": "Enabled",
      "Filter": {"Prefix": "kubernetes/"},
      "Expiration": {"Days": 90}
    },
    {
      "ID": "TransitionToIA",
      "Status": "Enabled",
      "Filter": {"Prefix": "kubernetes/"},
      "Transitions": [{"Days": 30, "StorageClass": "STANDARD_IA"}]
    }
  ]
}
```

## Step 5: Apply with Flux Kustomization

```yaml
# clusters/production/fluent-bit-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fluent-bit
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: fluent-bit
      namespace: logging
```

## Step 6: Verify S3 Uploads

```bash
# Check Fluent Bit S3 output metrics
kubectl exec -n logging daemonset/fluent-bit -- \
  curl -s http://localhost:2020/api/v1/metrics | jq '.output'

# List recent S3 objects
aws s3 ls s3://my-logs-bucket/kubernetes/ --recursive | tail -20

# Check Fluent Bit logs for upload confirmations
kubectl logs -n logging daemonset/fluent-bit --tail=50 | grep "s3"
```

## Best Practices

- Use IRSA instead of long-lived access keys so credentials rotate automatically and are never stored in Git.
- Enable gzip compression to reduce S3 storage costs by 60-80% for JSON log data.
- Configure `store_dir_limit_size` to cap local disk usage when S3 is temporarily unavailable.
- Use date-partitioned S3 key prefixes (`%Y/%m/%d/%H`) so Athena and Glue can efficiently scan time ranges.
- Set S3 lifecycle policies for automatic transition to Infrequent Access and eventual expiration.

## Conclusion

Fluent Bit's S3 output plugin, managed through a Flux HelmRelease with IRSA authentication, delivers a production-ready log archival pipeline with minimal operational overhead. Logs are automatically compressed, partitioned by date, and uploaded to S3 where they can be queried for compliance, debugging, or security analysis. Every configuration parameter — bucket name, prefix pattern, upload interval — is a Git-reviewed change, keeping your archival pipeline as well-governed as the rest of your infrastructure.
