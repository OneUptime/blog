# How to Set Up External DNS on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, External DNS, DNS, Kubernetes, Automation

Description: Deploy and configure ExternalDNS on Talos Linux to automatically manage DNS records for your Kubernetes services and ingresses.

---

Managing DNS records manually for a Kubernetes cluster gets old fast. Every time you create a new service or ingress, someone has to go update DNS. ExternalDNS solves this by watching your Kubernetes resources and automatically creating, updating, and deleting DNS records in your DNS provider. On Talos Linux, ExternalDNS works just like it does on any other Kubernetes distribution, and this guide walks through the setup from start to finish.

## What ExternalDNS Does

ExternalDNS watches Kubernetes resources like Services (type LoadBalancer), Ingresses, and custom resources. When it sees a resource with a hostname annotation or an ingress rule with a host, it creates a corresponding DNS record in your external DNS provider (Route53, Cloudflare, Google Cloud DNS, etc.).

For example, if you create an Ingress with `host: app.example.com` and the Ingress controller has an external IP of 203.0.113.10, ExternalDNS will create an A record `app.example.com -> 203.0.113.10` in your DNS zone.

## Prerequisites

Before setting up ExternalDNS on your Talos Linux cluster, you need:

- A working Talos Linux cluster with kubectl access
- A domain managed by a supported DNS provider
- API credentials for your DNS provider
- Helm installed for easy deployment

## Installing ExternalDNS with Helm

First, add the ExternalDNS Helm chart repository:

```bash
# Add the ExternalDNS Helm repo
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update
```

### AWS Route53 Setup

For AWS Route53, create an IAM policy and user:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "route53:ChangeResourceRecordSets"
            ],
            "Resource": [
                "arn:aws:route53:::hostedzone/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "route53:ListHostedZones",
                "route53:ListResourceRecordSets",
                "route53:ListTagsForResource"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
```

Create a Kubernetes secret with the credentials:

```bash
kubectl create namespace external-dns

kubectl create secret generic external-dns-aws \
    --namespace external-dns \
    --from-literal=aws_access_key_id=YOUR_KEY \
    --from-literal=aws_secret_access_key=YOUR_SECRET
```

Install ExternalDNS for Route53:

```bash
helm install external-dns external-dns/external-dns \
    --namespace external-dns \
    --set provider.name=aws \
    --set env[0].name=AWS_ACCESS_KEY_ID \
    --set env[0].valueFrom.secretKeyRef.name=external-dns-aws \
    --set env[0].valueFrom.secretKeyRef.key=aws_access_key_id \
    --set env[1].name=AWS_SECRET_ACCESS_KEY \
    --set env[1].valueFrom.secretKeyRef.name=external-dns-aws \
    --set env[1].valueFrom.secretKeyRef.key=aws_secret_access_key \
    --set domainFilters[0]=example.com \
    --set policy=sync \
    --set txtOwnerId=talos-cluster
```

### Cloudflare Setup

For Cloudflare, create an API token with DNS edit permissions:

```bash
kubectl create namespace external-dns

kubectl create secret generic external-dns-cloudflare \
    --namespace external-dns \
    --from-literal=cloudflare_api_token=YOUR_API_TOKEN
```

Install ExternalDNS for Cloudflare:

```bash
helm install external-dns external-dns/external-dns \
    --namespace external-dns \
    --set provider.name=cloudflare \
    --set env[0].name=CF_API_TOKEN \
    --set env[0].valueFrom.secretKeyRef.name=external-dns-cloudflare \
    --set env[0].valueFrom.secretKeyRef.key=cloudflare_api_token \
    --set domainFilters[0]=example.com \
    --set policy=sync \
    --set txtOwnerId=talos-cluster
```

## Configuration with Values File

For more control, use a values file instead of command-line flags:

```yaml
# external-dns-values.yaml
provider:
  name: cloudflare

env:
  - name: CF_API_TOKEN
    valueFrom:
      secretKeyRef:
        name: external-dns-cloudflare
        key: cloudflare_api_token

# Only manage records in these domains
domainFilters:
  - example.com
  - internal.example.com

# sync mode will create and delete records
# upsert-only will only create/update, never delete
policy: sync

# Unique identifier for this cluster's records
txtOwnerId: talos-cluster

# Sources to watch for DNS records
sources:
  - service
  - ingress

# How often to sync DNS records
interval: 1m

# Log level for debugging
logLevel: info

# Resource limits
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 100m
    memory: 128Mi

# Run on control plane nodes if needed
tolerations:
  - key: node-role.kubernetes.io/control-plane
    operator: Exists
    effect: NoSchedule
```

Install with the values file:

```bash
helm install external-dns external-dns/external-dns \
    --namespace external-dns \
    -f external-dns-values.yaml
```

## Creating DNS Records via Annotations

Once ExternalDNS is running, it picks up DNS hostnames from your resources automatically.

### From Ingress Resources

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: production
  annotations:
    # ExternalDNS picks this up automatically from the rules
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

### From LoadBalancer Services

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
  annotations:
    external-dns.alpha.kubernetes.io/hostname: app.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: my-app
```

### Multiple Hostnames

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    external-dns.alpha.kubernetes.io/hostname: "app.example.com,www.example.com"
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: my-app
```

## Verifying ExternalDNS is Working

Check the ExternalDNS logs to see what it is doing:

```bash
# Watch ExternalDNS logs
kubectl logs -n external-dns -l app.kubernetes.io/name=external-dns -f

# You should see lines like:
# "Creating record app.example.com A 203.0.113.10"
# "Updating record www.example.com A 203.0.113.10"
```

Verify the DNS records were created:

```bash
# Check with dig
dig app.example.com +short

# Check with nslookup
nslookup app.example.com

# Check TXT ownership records
dig _externaldns.app.example.com TXT +short
```

ExternalDNS creates TXT records alongside your A/CNAME records to track ownership. This prevents it from modifying records it did not create.

## Restricting Which Resources ExternalDNS Manages

You might not want ExternalDNS to create records for every service. Use annotation filters:

```yaml
# In external-dns-values.yaml
annotationFilter: "external-dns.alpha.kubernetes.io/managed=true"
```

Then only resources with that annotation will get DNS records:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    external-dns.alpha.kubernetes.io/managed: "true"
    external-dns.alpha.kubernetes.io/hostname: app.example.com
spec:
  type: LoadBalancer
  # ...
```

## RBAC Configuration

ExternalDNS needs permissions to watch Kubernetes resources. The Helm chart creates these automatically, but here is what they look like:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-dns
rules:
- apiGroups: [""]
  resources: ["services", "endpoints", "pods", "nodes"]
  verbs: ["get", "watch", "list"]
- apiGroups: ["extensions", "networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "watch", "list"]
```

## Handling Multiple Clusters

If you have multiple Talos clusters sharing the same DNS zone, use different `txtOwnerId` values for each cluster:

```bash
# Cluster 1
--set txtOwnerId=talos-production

# Cluster 2
--set txtOwnerId=talos-staging
```

This prevents one cluster from deleting records created by another.

## Troubleshooting

Common issues and how to fix them:

```bash
# Check if ExternalDNS pod is running
kubectl get pods -n external-dns

# Check for permission errors
kubectl logs -n external-dns -l app.kubernetes.io/name=external-dns | grep -i error

# Verify the service has an external IP assigned
kubectl get svc -n production my-app

# Force a sync by restarting ExternalDNS
kubectl rollout restart deployment external-dns -n external-dns
```

## Wrapping Up

ExternalDNS removes the manual step of managing DNS records for your Talos Linux cluster. Once configured, it quietly keeps your DNS in sync with your Kubernetes resources. The key decisions are choosing the right policy (sync vs upsert-only), setting appropriate TTLs, and using ownership IDs to prevent conflicts in multi-cluster setups. Start with a non-production domain to get comfortable with the behavior before pointing it at your production DNS zone.
