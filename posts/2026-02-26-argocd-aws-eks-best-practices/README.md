# How to Use ArgoCD with AWS EKS Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, AWS, EKS

Description: Learn the best practices for running ArgoCD on AWS EKS, covering IAM integration, networking, high availability, secret management, and production-ready configuration patterns.

---

Running ArgoCD on Amazon EKS is one of the most common production setups. While getting ArgoCD installed on EKS is straightforward, running it well requires attention to AWS-specific configuration - IAM roles, networking, ECR integration, and more.

This guide covers the best practices for a production-ready ArgoCD deployment on EKS.

## Installation: Use the HA Manifests

For production EKS clusters, always use the high-availability installation:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
```

Or better, use Helm for more control:

```yaml
# values.yaml for production EKS
global:
  image:
    tag: v2.10.0

controller:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      memory: 2Gi
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

server:
  replicas: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
  ingress:
    enabled: true
    ingressClassName: alb
    annotations:
      alb.ingress.kubernetes.io/scheme: internal
      alb.ingress.kubernetes.io/target-type: ip
      alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/abc-123
      alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
      alb.ingress.kubernetes.io/ssl-redirect: "443"
      alb.ingress.kubernetes.io/backend-protocol: HTTPS
    hosts:
      - argocd.internal.example.com
    tls:
      - hosts:
          - argocd.internal.example.com

repoServer:
  replicas: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
  resources:
    requests:
      cpu: 250m
      memory: 256Mi

redis-ha:
  enabled: true
  haproxy:
    enabled: true

configs:
  params:
    server.insecure: false
    reposerver.parallelism.limit: 10
```

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd -n argocd --create-namespace -f values.yaml
```

## IAM Roles for Service Accounts (IRSA)

Never use long-lived credentials. Use IRSA for all AWS integrations:

```bash
# Create an OIDC provider for your EKS cluster (if not already done)
eksctl utils associate-iam-oidc-provider --cluster my-cluster --approve
```

### IRSA for ArgoCD Repo Server (ECR Access)

```bash
# Create IAM policy for ECR access
cat > ecr-policy.json << 'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
POLICY

aws iam create-policy \
  --policy-name ArgoCD-ECR-ReadOnly \
  --policy-document file://ecr-policy.json

# Create service account with IAM role
eksctl create iamserviceaccount \
  --name argocd-repo-server \
  --namespace argocd \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789:policy/ArgoCD-ECR-ReadOnly \
  --approve \
  --override-existing-serviceaccounts
```

### IRSA for ArgoCD Image Updater

If you use ArgoCD Image Updater to watch ECR for new images:

```bash
eksctl create iamserviceaccount \
  --name argocd-image-updater \
  --namespace argocd \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789:policy/ArgoCD-ECR-ReadOnly \
  --approve
```

## Networking Best Practices

### Internal ALB

Keep ArgoCD behind an internal ALB - it should not be publicly accessible:

```yaml
# Ingress annotations for AWS ALB
annotations:
  alb.ingress.kubernetes.io/scheme: internal
  alb.ingress.kubernetes.io/target-type: ip
  alb.ingress.kubernetes.io/security-groups: sg-xxxxxxxxx
  alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:...
  alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
  alb.ingress.kubernetes.io/ssl-redirect: "443"
  alb.ingress.kubernetes.io/backend-protocol: HTTPS
  alb.ingress.kubernetes.io/healthcheck-path: /healthz
  alb.ingress.kubernetes.io/healthcheck-protocol: HTTPS
```

### Network Policy

Restrict ArgoCD network access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: kube-system   # ALB controller
      ports:
        - port: 8080
        - port: 8083
  egress:
    - to: []  # Allow all egress (needed for Git and cluster access)
```

## Multi-Cluster Management on AWS

If you manage multiple EKS clusters with ArgoCD:

```bash
# Register additional clusters
# First, make sure the kubeconfig has the right context
aws eks update-kubeconfig --name staging-cluster --alias staging
aws eks update-kubeconfig --name production-cluster --alias production

# Add clusters to ArgoCD
argocd cluster add staging --name staging-eks
argocd cluster add production --name production-eks
```

For automated cluster registration, use cluster secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: production-eks
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: production-eks
  server: https://ABCDEFG.gr7.us-east-1.eks.amazonaws.com
  config: |
    {
      "awsAuthConfig": {
        "clusterName": "production-cluster",
        "roleARN": "arn:aws:iam::123456789:role/ArgoCD-CrossAccount-Role"
      }
    }
```

This uses IAM roles for cluster authentication instead of static tokens.

## ECR Integration

Configure ArgoCD to pull Helm charts and images from ECR:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ecr-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: my-ecr-charts
  url: oci://123456789.dkr.ecr.us-east-1.amazonaws.com
  enableOCI: "true"
```

For ECR authentication, you can use the credential helper:

```yaml
# In the argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  helm.valuesFileSchemes: >-
    secrets+gpg-import, secrets+gpg-import-kubernetes,
    secrets, secrets+literal,
    ref+awsssm, ref+vault
```

## Secrets Management with AWS Secrets Manager

Use External Secrets Operator to pull secrets from AWS Secrets Manager:

```yaml
# ClusterSecretStore pointing to AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets

---
# Example usage in an application
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: prod/my-app/database
        property: url
```

## Node Placement

Run ArgoCD on dedicated nodes to avoid resource contention:

```yaml
# In Helm values
controller:
  nodeSelector:
    node-role: platform
  tolerations:
    - key: "platform"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"

server:
  nodeSelector:
    node-role: platform
  tolerations:
    - key: "platform"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"

repoServer:
  nodeSelector:
    node-role: platform
```

## Monitoring on EKS

Integrate ArgoCD metrics with Amazon Managed Prometheus or your own Prometheus:

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: argocd
  endpoints:
    - port: metrics
      interval: 30s
```

Key metrics to watch:

```yaml
# CloudWatch alarm for ArgoCD sync failures
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-alerts
spec:
  groups:
    - name: argocd
      rules:
        - alert: ArgoCDAppOutOfSync
          expr: argocd_app_info{sync_status="OutOfSync"} == 1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Application {{ $labels.name }} has been OutOfSync for 30 minutes"

        - alert: ArgoCDAppUnhealthy
          expr: argocd_app_info{health_status!="Healthy"} == 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "Application {{ $labels.name }} is unhealthy"

        - alert: ArgoCDHighMemory
          expr: container_memory_working_set_bytes{namespace="argocd"} > 2e9
          for: 5m
          labels:
            severity: warning
```

## Backup and Disaster Recovery

Back up ArgoCD configuration to S3:

```bash
# Export all ArgoCD applications
kubectl get applications -n argocd -o yaml > argocd-apps-backup.yaml

# Export all AppProjects
kubectl get appprojects -n argocd -o yaml > argocd-projects-backup.yaml

# Export repositories (secrets)
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository -o yaml > argocd-repos-backup.yaml

# Upload to S3
aws s3 cp argocd-apps-backup.yaml s3://backups/argocd/$(date +%Y%m%d)/
aws s3 cp argocd-projects-backup.yaml s3://backups/argocd/$(date +%Y%m%d)/
```

Automate this with a CronJob managed by ArgoCD itself:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup
  namespace: argocd
spec:
  schedule: "0 2 * * *"  # Daily at 2am
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-backup-sa
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  DATE=$(date +%Y%m%d)
                  kubectl get applications -n argocd -o yaml > /tmp/apps.yaml
                  kubectl get appprojects -n argocd -o yaml > /tmp/projects.yaml
                  aws s3 cp /tmp/apps.yaml s3://argocd-backups/$DATE/apps.yaml
                  aws s3 cp /tmp/projects.yaml s3://argocd-backups/$DATE/projects.yaml
          restartPolicy: OnFailure
```

## Conclusion

Running ArgoCD on EKS in production comes down to a few key practices: use IRSA instead of static credentials, keep ArgoCD behind an internal ALB, use the HA installation, integrate with AWS Secrets Manager through External Secrets Operator, and monitor ArgoCD itself as critical infrastructure. These practices give you a reliable, secure GitOps platform on AWS.

For end-to-end monitoring of your EKS clusters and ArgoCD-managed applications, [OneUptime](https://oneuptime.com) provides unified observability, alerting, and status pages.
