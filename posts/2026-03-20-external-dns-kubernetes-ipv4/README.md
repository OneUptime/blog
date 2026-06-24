# How to Configure External DNS with Kubernetes for IPv4 Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ExternalDNS, Kubernetes, IPv4, DNS, Automation, Networking

Description: Deploy ExternalDNS to automatically create and manage IPv4 DNS records in Route53, Cloudflare, or other DNS providers when Kubernetes services and Ingresses are created.

ExternalDNS watches Kubernetes Services and Ingresses and automatically creates DNS records from their published load balancer targets. For IPv4-backed Services, this typically means A records pointing to the external IPv4 address. This eliminates manual DNS management.

## Prerequisites

```bash
# Ensure your services have external IPs (MetalLB or cloud LB)

kubectl get svc -A | grep LoadBalancer

# You'll need DNS provider credentials (example uses Cloudflare)
```

## Step 1: Create DNS Provider Credentials

```bash
kubectl create namespace external-dns
```

For Cloudflare:

```bash
# Create a secret with Cloudflare API token
kubectl create secret generic cloudflare-api-token \
  --from-literal=cloudflare_api_token=<YOUR_TOKEN> \
  -n external-dns
```

For AWS Route53:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=aws_access_key_id=<KEY_ID> \
  --from-literal=aws_secret_access_key=<SECRET_KEY> \
  -n external-dns
```

## Step 2: Deploy ExternalDNS

```yaml
# external-dns.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns
  namespace: external-dns
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-dns
rules:
- apiGroups: [""]
  resources: ["services", "pods"]
  verbs: ["get", "watch", "list"]
- apiGroups: ["discovery.k8s.io"]
  resources: ["endpointslices"]
  verbs: ["get", "watch", "list"]
- apiGroups: ["extensions", "networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "watch", "list"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: external-dns-viewer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: external-dns
subjects:
- kind: ServiceAccount
  name: external-dns
  namespace: external-dns
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: external-dns
spec:
  replicas: 1
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.21.0
        args:
        # DNS sources
        - --source=service
        - --source=ingress
        # Only manage records in this domain
        - --domain-filter=example.com
        # Cloudflare provider
        - --provider=cloudflare
        # Create and update records, but do not delete them
        - --policy=upsert-only
        # Use TXT records to identify records owned by this cluster
        - --txt-owner-id=my-k8s-cluster
        env:
        - name: CF_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: cloudflare-api-token
              key: cloudflare_api_token
```

```bash
kubectl apply -f external-dns.yaml
```

## Step 3: Annotate Services for DNS Records

```yaml
# service-with-dns.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
  namespace: default
  annotations:
    # ExternalDNS will create a DNS record for this hostname
    external-dns.alpha.kubernetes.io/hostname: api.example.com
spec:
  type: LoadBalancer
  selector:
    app: my-api
  ports:
  - port: 80
```

```bash
kubectl apply -f service-with-dns.yaml

# Watch ExternalDNS create the record
kubectl logs -n external-dns deploy/external-dns -f | grep -i "api.example.com"
# Expected: log output mentioning api.example.com once ExternalDNS reconciles the Service
```

## Step 4: Ingress-Based DNS Records

ExternalDNS also picks up hostnames from Ingress resources automatically once your Ingress controller publishes an address:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  # No ExternalDNS annotation needed for Ingress - it reads spec.rules[].host by default
spec:
  rules:
  - host: app.example.com  # ExternalDNS creates a DNS record for this host
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-service
            port:
              number: 80
```

## Verifying DNS Record Creation

```bash
# Check ExternalDNS logs
kubectl logs -n external-dns deploy/external-dns | tail -20

# Verify the DNS record externally
dig api.example.com A
# For an IPv4-backed Service, this should return the service's external IPv4 address

# Check TXT ownership records (ExternalDNS creates these)
dig TXT api.example.com
# Should return a TXT record containing ExternalDNS ownership metadata
```

ExternalDNS turns DNS record management from a manual toil into a fully automated process tied to Kubernetes service lifecycle.
