# How to Configure External DNS with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, DNS, Service Discovery

Description: Learn how to configure ExternalDNS in Rancher to automatically manage DNS records for your Kubernetes services and ingresses.

ExternalDNS synchronizes Kubernetes resources (Services, Ingresses) with external DNS providers, automatically creating and updating DNS records when you deploy or modify services. This guide shows you how to set up ExternalDNS in a Rancher-managed cluster.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- A domain managed by a supported DNS provider (AWS Route 53, Cloudflare, Google Cloud DNS, Azure DNS, etc.)
- API credentials for your DNS provider
- Helm installed or access to the Rancher Apps marketplace

## Step 1: Install ExternalDNS via Helm

```bash
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update
```

## Step 2: Configure ExternalDNS for AWS Route 53

Create a values file for AWS:

```yaml
# values-aws.yaml

provider:
  name: aws
env:
  - name: AWS_DEFAULT_REGION
    value: us-east-1
domainFilters:
  - example.com
policy: sync
registry: txt
txtOwnerId: my-rancher-cluster
sources:
  - service
  - ingress
serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/external-dns
```

Install:

```bash
helm install external-dns external-dns/external-dns \
  --namespace external-dns \
  --create-namespace \
  -f values-aws.yaml
```

Alternatively, if you are not using EKS IAM Roles for Service Accounts, use a secret for credentials:

```ini
# credentials
[default]
aws_access_key_id = AKIAXXXXXXXX
aws_secret_access_key = XXXXXXXXXXXX
```

```bash
kubectl create secret generic external-dns \
  --from-file=my_credentials=./credentials \
  -n external-dns
```

Then update `values-aws.yaml` to mount the credentials file:

```yaml
env:
  - name: AWS_DEFAULT_REGION
    value: us-east-1
  - name: AWS_SHARED_CREDENTIALS_FILE
    value: /etc/aws/credentials/my_credentials
extraVolumes:
  - name: aws-credentials
    secret:
      secretName: external-dns
extraVolumeMounts:
  - name: aws-credentials
    mountPath: /etc/aws/credentials
    readOnly: true
```

If you use this method, you can omit the `serviceAccount.annotations` block.

## Step 3: Configure ExternalDNS for Cloudflare

```yaml
# values-cloudflare.yaml
provider:
  name: cloudflare
env:
  - name: CF_API_TOKEN
    valueFrom:
      secretKeyRef:
        name: cloudflare-api-token
        key: api-token
domainFilters:
  - example.com
policy: sync
registry: txt
txtOwnerId: my-rancher-cluster
sources:
  - service
  - ingress
```

Create the API token secret:

```bash
kubectl create secret generic cloudflare-api-token \
  --from-literal=api-token=YOUR_CF_API_TOKEN \
  -n external-dns
```

Install:

```bash
helm install external-dns external-dns/external-dns \
  --namespace external-dns \
  --create-namespace \
  -f values-cloudflare.yaml
```

## Step 4: Configure ExternalDNS for Google Cloud DNS

```yaml
# values-gcp.yaml
provider:
  name: google
env:
  - name: GOOGLE_APPLICATION_CREDENTIALS
    value: /etc/secrets/service-account/credentials.json
domainFilters:
  - example.com
policy: sync
registry: txt
txtOwnerId: my-rancher-cluster
sources:
  - service
  - ingress
extraArgs:
  google-project: my-gcp-project
extraVolumes:
  - name: google-service-account
    secret:
      secretName: google-credentials
extraVolumeMounts:
  - name: google-service-account
    mountPath: /etc/secrets/service-account
    readOnly: true
```

Create a service account key and store it as a secret:

```bash
kubectl create secret generic google-credentials \
  --from-file=credentials.json=./service-account-key.json \
  -n external-dns
```

Install:

```bash
helm install external-dns external-dns/external-dns \
  --namespace external-dns \
  --create-namespace \
  -f values-gcp.yaml
```

## Step 5: Verify the Installation

```bash
kubectl get pods -n external-dns
kubectl logs -n external-dns -l app.kubernetes.io/name=external-dns
```

The logs should show ExternalDNS starting up and listing existing DNS records.

## Step 6: Create a Service with DNS Annotation

Annotate a LoadBalancer service to create a DNS record:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-app
  namespace: default
  annotations:
    external-dns.alpha.kubernetes.io/hostname: webapp.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
spec:
  type: LoadBalancer
  selector:
    app: my-web-app
  ports:
  - port: 80
    targetPort: 8080
```

ExternalDNS will automatically create a DNS record for `webapp.example.com`. Depending on the provider and load balancer, this may be an A/AAAA, CNAME, or provider-specific alias record.

## Step 7: Create an Ingress with DNS

Ingress hosts are automatically picked up by ExternalDNS:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    external-dns.alpha.kubernetes.io/hostname: app.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port:
              number: 80
```

ExternalDNS creates a DNS record for `app.example.com` using the ingress host. Depending on the provider and ingress endpoint, this may be an A/AAAA, CNAME, or provider-specific alias record.

## Step 8: Configure Multiple Hostnames

Create multiple DNS records for a single service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: multi-dns-app
  namespace: default
  annotations:
    external-dns.alpha.kubernetes.io/hostname: "app.example.com,www.example.com,api.example.com"
spec:
  type: LoadBalancer
  selector:
    app: multi-dns-app
  ports:
  - port: 80
    targetPort: 8080
```

## Step 9: Configure the Sync Policy

ExternalDNS supports different policies:

- **sync**: Creates and deletes records (full lifecycle management)
- **upsert-only**: Creates and updates, but never deletes
- **create-only**: Only creates new records

For safety in production, start with `upsert-only`:

```bash
helm upgrade external-dns external-dns/external-dns \
  --namespace external-dns \
  --reuse-values \
  --set policy=upsert-only
```

## Step 10: Monitor ExternalDNS

Check logs for DNS operations:

```bash
kubectl logs -n external-dns -l app.kubernetes.io/name=external-dns --tail=50

# Watch for changes
kubectl logs -n external-dns -l app.kubernetes.io/name=external-dns -f
```

Verify DNS records were created:

```bash
# Check DNS resolution
nslookup app.example.com
dig app.example.com

# List TXT ownership records
dig TXT app.example.com
```

## Troubleshooting

- **Records not created**: Check ExternalDNS logs for permission errors
- **Wrong IP**: Verify the service has an external IP assigned
- **Duplicate records**: Check the txtOwnerId is unique per cluster
- **Slow updates**: ExternalDNS polls on an interval (default 1 minute); check the `--interval` flag
- **Domain not matched**: Verify `domainFilters` includes your domain
- **Permission denied**: Check IAM roles or API token permissions for your DNS provider

## Summary

ExternalDNS automates DNS record management for Kubernetes services and ingresses in Rancher-managed clusters. By configuring it with your DNS provider, you eliminate manual DNS management and ensure your DNS records always match your deployed services. Combined with cert-manager for TLS certificates, ExternalDNS provides a fully automated workflow for exposing applications with custom domain names.
