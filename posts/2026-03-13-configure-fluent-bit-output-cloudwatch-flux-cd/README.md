# How to Configure Fluent Bit Output to CloudWatch with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Fluent Bit, AWS CloudWatch, EKS

Description: Configure Fluent Bit to send Kubernetes logs to AWS CloudWatch Logs using Flux CD for GitOps-managed cloud-native log delivery.

---

## Introduction

AWS CloudWatch Logs is the natural destination for teams running EKS who want to centralize Kubernetes logs alongside EC2, Lambda, and RDS logs without managing a separate logging backend. Fluent Bit's CloudWatch output plugin uses the CloudWatch Logs API directly, creating log groups and streams automatically and supporting structured JSON logging natively.

Managing this configuration with Flux CD ensures that log group names, retention periods, and IAM role annotations remain consistent across clusters and environments. Credential management through IRSA (IAM Roles for Service Accounts) means no long-lived access keys are ever committed to Git.

This guide covers deploying Fluent Bit with the CloudWatch Logs output plugin on EKS using Flux CD, with IAM authentication via IRSA and structured log group organization.

## Prerequisites

- EKS cluster with IRSA enabled
- Flux CD bootstrapped to your Git repository
- IAM role with `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` permissions
- `kubectl`, `flux`, `eksctl`, and `aws` CLIs installed

## Step 1: Create the IAM Role for CloudWatch Access

```json
// cloudwatch-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents",
        "logs:PutRetentionPolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
aws iam create-policy \
  --policy-name FluentBitCloudWatchPolicy \
  --policy-document file://cloudwatch-policy.json

eksctl create iamserviceaccount \
  --name fluent-bit \
  --namespace logging \
  --cluster my-eks-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/FluentBitCloudWatchPolicy \
  --approve \
  --override-existing-serviceaccounts
```

## Step 2: Add the Fluent Bit HelmRepository

```yaml
# infrastructure/sources/fluent-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: fluent
  namespace: flux-system
spec:
  interval: 12h
  url: https://fluent.github.io/helm-charts
```

## Step 3: Deploy Fluent Bit with CloudWatch Output

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
    serviceAccount:
      create: false
      name: fluent-bit   # IRSA-annotated ServiceAccount

    tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule

    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "256Mi"

    # Pass AWS region as an environment variable
    env:
      - name: AWS_REGION
        value: us-east-1
      - name: CLUSTER_NAME
        value: my-eks-cluster

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

        # Collect systemd journal logs (kubelet, containerd)
        [INPUT]
            Name            systemd
            Tag             host.*
            Systemd_Filter  _SYSTEMD_UNIT=kubelet.service
            Systemd_Filter  _SYSTEMD_UNIT=containerd.service
            Read_From_Tail  On

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
            # Extract namespace and pod for log stream naming
            Labels              On
            Annotations         Off

      outputs: |
        # Application logs → /eks/<cluster>/containers/<namespace>
        [OUTPUT]
            Name                cloudwatch_logs
            Match               kube.*
            region              ${AWS_REGION}
            # Log group per namespace for fine-grained retention policies
            log_group_name      /eks/${CLUSTER_NAME}/containers
            log_stream_prefix   ${CLUSTER_NAME}-
            log_stream_template $kubernetes['namespace_name'].$kubernetes['pod_name'].$kubernetes['container_name']
            # Use structured logging format
            log_format          json/emf
            # Set retention in days (0 = never expire)
            log_retention_days  30
            # Automatically create log group if it doesn't exist
            auto_create_group   true

        # Host/system logs → /eks/<cluster>/host
        [OUTPUT]
            Name                cloudwatch_logs
            Match               host.*
            region              ${AWS_REGION}
            log_group_name      /eks/${CLUSTER_NAME}/host
            log_stream_prefix   ${CLUSTER_NAME}-
            auto_create_group   true
            log_retention_days  7
```

## Step 4: Route Critical Logs with Higher Retention

Use `rewrite_tag` to separate critical application logs and send them to a log group with longer retention:

```yaml
      filters: |
        # (existing kubernetes filter above) ...

        [FILTER]
            Name    rewrite_tag
            Match   kube.*
            # Route logs from production namespace separately
            Rule    $kubernetes['namespace_name'] ^production$ kube.production false

      outputs: |
        # Production logs with 90-day retention
        [OUTPUT]
            Name                cloudwatch_logs
            Match               kube.production
            region              ${AWS_REGION}
            log_group_name      /eks/${CLUSTER_NAME}/production
            log_stream_prefix   prod-
            auto_create_group   true
            log_retention_days  90

        # All other logs with 14-day retention
        [OUTPUT]
            Name                cloudwatch_logs
            Match               kube.*
            region              ${AWS_REGION}
            log_group_name      /eks/${CLUSTER_NAME}/containers
            log_stream_prefix   ${CLUSTER_NAME}-
            auto_create_group   true
            log_retention_days  14
```

## Step 5: Apply via Flux Kustomization

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

## Step 6: Verify CloudWatch Log Delivery

```bash
# Check Fluent Bit is running on all nodes
kubectl get daemonset fluent-bit -n logging

# View Fluent Bit output metrics
kubectl exec -n logging daemonset/fluent-bit -- \
  curl -s http://localhost:2020/api/v1/metrics | jq '.output'

# List CloudWatch log groups
aws logs describe-log-groups \
  --log-group-name-prefix /eks/my-eks-cluster \
  --region us-east-1

# Tail logs in CloudWatch
aws logs tail /eks/my-eks-cluster/containers --follow --region us-east-1
```

## Best Practices

- Use `log_stream_template` to create descriptive stream names like `namespace.pod.container` for easy filtering in the CloudWatch console.
- Set `log_retention_days` in the plugin rather than managing retention separately - this ensures new log groups get the right retention policy automatically.
- Use IRSA with least-privilege policies rather than node instance profile permissions, so only Fluent Bit can write to CloudWatch.
- Monitor CloudWatch Logs costs using AWS Cost Explorer. High-cardinality log streams can generate significant API costs.
- Enable CloudWatch Contributor Insights on your log groups to automatically detect top contributors to log volume.

## Conclusion

Fluent Bit with CloudWatch Logs output, managed by Flux CD on EKS, provides a native AWS logging solution with zero backend infrastructure to operate. IRSA handles credential management seamlessly, log groups are auto-created with the right retention, and every configuration parameter is tracked in Git. Teams who are already invested in the AWS ecosystem will find this approach reduces operational complexity compared to self-managed Elasticsearch or Loki deployments.
