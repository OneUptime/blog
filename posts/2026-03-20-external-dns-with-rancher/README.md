# How to Set Up External DNS with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, External DNS, Kubernetes, DNS, Route53, Automation

Description: Configure External DNS in Rancher to automatically create and manage DNS records for Kubernetes Ingress and Service resources in cloud DNS providers.

## Introduction

External DNS watches Kubernetes Ingress and LoadBalancer Service resources and automatically creates corresponding DNS records in your cloud DNS provider (Route53, Cloudflare, Google Cloud DNS, etc.). This eliminates manual DNS management when deploying applications on Rancher.

## Prerequisites

- Rancher cluster with an Ingress controller
- Cloud DNS provider with API access
- `helm` and `kubectl` configured

## Step 1: Add the External DNS Repository

```bash
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update
```

## Step 2: Configure AWS Route53 Credentials

```bash
# Create an IAM policy allowing Route53 record management

kubectl create namespace external-dns

# Then create a Kubernetes Secret with the credentials
kubectl create secret generic route53-credentials \
  --from-literal=aws_access_key_id=YOUR_ACCESS_KEY \
  --from-literal=aws_secret_access_key=YOUR_SECRET_KEY \
  -n external-dns
```

## Step 3: Create Values File

```yaml
# external-dns-values.yaml
provider:
  name: aws

# AWS Route53 configuration
env:
  - name: AWS_DEFAULT_REGION
    value: us-east-1
  - name: AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: route53-credentials
        key: aws_access_key_id
  - name: AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: route53-credentials
        key: aws_secret_access_key

extraArgs:
  aws-zone-type: public    # "public", "private", or omit for both

# Which domains External DNS is allowed to manage
domainFilters:
  - example.com       # Only create records under this domain

# How to handle record ownership
policy: sync          # "sync" deletes records when resources are removed
                      # "upsert-only" only creates/updates, never deletes

# Sources to watch
sources:
  - ingress           # Watch Ingress resources
  - service           # Watch Service resources of type LoadBalancer

txtOwnerId: "rancher-cluster"   # Unique ID to track owned records
```

## Step 4: Deploy External DNS

```bash
helm install external-dns external-dns/external-dns \
  --namespace external-dns \
  --values external-dns-values.yaml
```

## Step 5: Annotate Ingress Resources

External DNS reads annotations to determine which DNS records to create:

```yaml
# myapp-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: production
  annotations:
    external-dns.alpha.kubernetes.io/hostname: myapp.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"    # TTL in seconds
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
```

## Step 6: Verify DNS Records

```bash
# Check External DNS logs for record creation
kubectl logs -n external-dns deployment/external-dns | grep -i "desired change"

# Verify the DNS record was created in Route53
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --query "ResourceRecordSets[?Name=='myapp.example.com.']"
```

## Step 7: Use with Cloudflare

```yaml
# Cloudflare provider configuration
provider:
  name: cloudflare
env:
  - name: CF_API_TOKEN
    value: YOUR_CLOUDFLARE_API_TOKEN
extraArgs:
  cloudflare-proxied: false    # Set true to proxy through Cloudflare CDN
```

## Conclusion

External DNS on Rancher eliminates DNS manual management entirely. When you deploy an application with a hostname annotation, DNS records are created automatically. When you delete the application, External DNS removes the records (in `sync` policy mode). This is especially powerful in GitOps workflows where infrastructure state is driven by repository changes.
