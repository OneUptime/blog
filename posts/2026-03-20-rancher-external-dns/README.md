# How to Set Up External DNS with Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, External DNS, Route53, DNS Automation

Description: Configure External DNS with Rancher to automatically create and update DNS records when services and ingresses are deployed to your Kubernetes clusters.

## Introduction

External DNS automatically manages DNS records in external DNS providers (Route53, Cloudflare, Azure DNS, etc.) based on Kubernetes Service and Ingress resources. When you deploy a service with a hostname annotation, External DNS automatically creates the corresponding DNS record, eliminating manual DNS management. This guide covers deploying External DNS on Rancher with multiple provider configurations.

## Prerequisites

- Rancher-managed Kubernetes cluster
- A domain name managed in Route53, Cloudflare, or another supported provider
- Helm 3.x installed
- kubectl access and appropriate cloud IAM permissions for ExternalDNS

## Step 1: Configure Route53 Permissions

```bash
# Create IAM policy for External DNS

cat > externaldns-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets",
        "route53:ListTagsForResources"
      ],
      "Resource": [
        "arn:aws:route53:::hostedzone/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones"
      ],
      "Resource": ["*"]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ExternalDNSPolicy \
  --policy-document file://externaldns-policy.json
```

## Step 2: Deploy External DNS

```yaml
# externaldns-values.yaml - External DNS configuration
provider: aws

aws:
  region: us-east-1
  # Limit to specific hosted zones
  zoneType: "public"
  zoneTags:
    - "kubernetes=true"

# Source resources to watch
sources:
  - service
  - ingress

# Domain filter (only manage these domains)
domainFilters:
  - example.com

# Annotation filter (only create records for annotated resources)
annotationFilter: "external-dns.alpha.kubernetes.io/hostname"

# Policy: sync (update) or create-only (never delete)
policy: sync

# TXT registry ownership records
txtOwnerId: "rancher-production"
txtPrefix: "_externaldns."

# Interval between synchronizations
interval: 1m

# Log format
logFormat: json
logLevel: info

# RBAC
rbac:
  create: true

serviceAccount:
  create: true
  annotations:
    # For IRSA on EKS
    eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/ExternalDNSRole"

# Resources
resources:
  requests:
    cpu: 50m
    memory: 50Mi
  limits:
    cpu: 100m
    memory: 128Mi

# Service monitor for Prometheus
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
    labels:
      release: rancher-monitoring
```

```bash
# Add Bitnami repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install External DNS
helm install external-dns bitnami/external-dns \
  --namespace external-dns \
  --create-namespace \
  --values externaldns-values.yaml \
  --wait
```

## Step 3: Create Services with DNS Records

### Service with External DNS Annotation

```yaml
# service-with-dns.yaml - LoadBalancer service with DNS record
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
  annotations:
    # Tell External DNS to create this record
    external-dns.alpha.kubernetes.io/hostname: "app.example.com"
    # TTL for the DNS record
    external-dns.alpha.kubernetes.io/ttl: "60"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

### Ingress with DNS Record

```yaml
# ingress-with-dns.yaml - Ingress with automatic DNS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: production
  annotations:
    # Set hostnames on the resource so the TTL annotation is applied
    external-dns.alpha.kubernetes.io/hostname: "app.example.com,api.example.com"
    # Override the TTL
    external-dns.alpha.kubernetes.io/ttl: "120"
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com      # Creates a DNS record for app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
    - host: api.example.com      # Creates a DNS record for api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

## Step 4: Configure Cloudflare Provider

```yaml
# externaldns-cloudflare-values.yaml - Cloudflare provider
provider: cloudflare

cloudflare:
  secretName: "cloudflare-credentials"
  proxied: false  # Set to true to use Cloudflare proxy

sources:
  - service
  - ingress

domainFilters:
  - example.com

policy: sync
txtOwnerId: rancher-production
```

```bash
# Create Cloudflare credentials secret
kubectl create secret generic cloudflare-credentials \
  --from-literal=cloudflare_api_token=<your-cloudflare-api-token> \
  -n external-dns
```

## Step 5: Configure Public and Private Route53 Instances

```yaml
# externaldns-multi-provider.yaml - Route public vs private DNS
# Public DNS with Route53
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-public
  namespace: external-dns
spec:
  replicas: 1
  selector:
    matchLabels:
      app: external-dns-public
  template:
    metadata:
      labels:
        app: external-dns-public
    spec:
      serviceAccountName: external-dns
      containers:
        - name: external-dns
          image: registry.k8s.io/external-dns/external-dns:v0.21.0
          args:
            - --source=ingress
            - --domain-filter=example.com
            - --provider=aws
            - --aws-zone-type=public
            - --policy=sync
            - --txt-owner-id=rancher-public

---
# Private DNS with Route53
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns-private
  namespace: external-dns
spec:
  replicas: 1
  selector:
    matchLabels:
      app: external-dns-private
  template:
    metadata:
      labels:
        app: external-dns-private
    spec:
      serviceAccountName: external-dns
      containers:
        - name: external-dns
          image: registry.k8s.io/external-dns/external-dns:v0.21.0
          args:
            - --source=ingress
            - --source=service
            - --domain-filter=internal.example.com
            - --provider=aws
            - --aws-zone-type=private
            - --policy=sync
            - --txt-owner-id=rancher-private
```

## Step 6: Verify DNS Records are Created

```bash
# Watch External DNS logs
kubectl logs -n external-dns deployment/external-dns -f | grep -i "record\|dns"

# Check Route53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1XXXXXXXXXXXXXX \
  --query 'ResourceRecordSets[?Name==`app.example.com.`].[Name,Type,TTL,AliasTarget.DNSName]' \
  --output table

# DNS resolution test
nslookup app.example.com
dig app.example.com +short

# Verify TXT records (used for ownership)
dig _externaldns.app.example.com TXT +short
```

## Step 7: Handle DNS Record Conflicts

```bash
# List all External DNS managed records
kubectl get dnsendpoints --all-namespaces 2>/dev/null || \
  echo "Using annotation-based management"

# Stop External DNS from managing a specific service
kubectl annotate service my-service \
  -n production \
  external-dns.alpha.kubernetes.io/hostname-

# Force a specific IP for a record
kubectl annotate service my-service \
  -n production \
  "external-dns.alpha.kubernetes.io/target=1.2.3.4"
```

## Conclusion

External DNS eliminates the manual step of creating DNS records when deploying applications to Rancher. It integrates with all major DNS providers and automatically manages record lifecycle-creating records on deployment and removing them when services are deleted. The annotation-based configuration makes it easy to control which services get DNS records and what those records should contain. For production deployments, use IRSA on EKS or similar cloud-native credential mechanisms to avoid long-lived IAM keys.
