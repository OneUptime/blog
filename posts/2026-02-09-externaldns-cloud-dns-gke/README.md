# How to Set Up ExternalDNS with Cloud DNS for GKE Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Kubernetes, DNS, GKE

Description: Configure ExternalDNS on GKE to automatically manage Google Cloud DNS records for Kubernetes services and ingress resources.

---

ExternalDNS automates DNS record management for GKE workloads by synchronizing Kubernetes services and ingresses with Google Cloud DNS. Instead of manually creating DNS records, ExternalDNS watches your cluster and updates Cloud DNS automatically.

This guide shows you how to set up ExternalDNS on GKE with Cloud DNS integration.

## Creating a Cloud DNS Zone

First, create a Cloud DNS managed zone:

```bash
# Create Cloud DNS zone
gcloud dns managed-zones create example-zone \
  --dns-name=example.com \
  --description="Kubernetes services zone"

# Get nameservers
gcloud dns managed-zones describe example-zone \
  --format="value(nameServers)"
```

Update your domain registrar to use these nameservers.

## Setting Up Workload Identity

ExternalDNS needs permissions to manage Cloud DNS records. Use Workload Identity:

```bash
# Create service account
gcloud iam service-accounts create external-dns \
  --display-name="ExternalDNS Service Account"

# Grant DNS admin role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:external-dns@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/dns.admin

# Bind Kubernetes SA to Google SA
gcloud iam service-accounts add-iam-policy-binding \
  external-dns@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:PROJECT_ID.svc.id.goog[kube-system/external-dns]"
```

## Installing ExternalDNS

Create Kubernetes service account:

```yaml
# external-dns-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns
  namespace: kube-system
  annotations:
    iam.gke.io/gcp-service-account: external-dns@PROJECT_ID.iam.gserviceaccount.com
```

Deploy ExternalDNS:

```yaml
# externaldns-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  strategy:
    type: Recreate
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
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --provider=google
        - --google-project=PROJECT_ID
        - --policy=sync
        - --txt-owner-id=gke-cluster
        - --domain-filter=example.com
        - --registry=txt
        - --log-level=info
```

Apply the configuration:

```bash
kubectl apply -f external-dns-sa.yaml
kubectl apply -f externaldns-deployment.yaml

# Verify deployment
kubectl get pods -n kube-system -l app=external-dns
kubectl logs -n kube-system -l app=external-dns
```

## Managing DNS for LoadBalancer Services

Create a service with DNS annotation:

```yaml
# web-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    external-dns.alpha.kubernetes.io/hostname: web.example.com
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

ExternalDNS creates an A record pointing to the load balancer IP.

Verify DNS record:

```bash
# Check Cloud DNS records
gcloud dns record-sets list \
  --zone=example-zone \
  --filter="name:web.example.com"

# Test resolution
dig web.example.com
```

## Managing DNS for Ingress

Create ingress with hostname:

```yaml
# app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: app-service
            port:
              number: 80
```

ExternalDNS automatically creates records for ingress hosts.

## Using Helm for Installation

Install with Helm:

```bash
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update

helm install external-dns external-dns/external-dns \
  --namespace kube-system \
  --set provider=google \
  --set google.project=PROJECT_ID \
  --set domainFilters[0]=example.com \
  --set policy=sync \
  --set txtOwnerId=gke-cluster \
  --set serviceAccount.annotations."iam\.gke\.io/gcp-service-account"=external-dns@PROJECT_ID.iam.gserviceaccount.com
```

## Configuring Multiple DNS Zones

Manage multiple zones:

```yaml
args:
- --source=service
- --source=ingress
- --provider=google
- --google-project=PROJECT_ID
- --domain-filter=example.com
- --domain-filter=example.net
```

Or use zone ID filters:

```yaml
args:
- --google-zone-visibility=public
- --txt-owner-id=gke-cluster
```

## Setting Custom TTL

Configure TTL for DNS records:

```yaml
metadata:
  annotations:
    external-dns.alpha.kubernetes.io/hostname: web.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
```

## Private DNS Zones

For private zones:

```bash
# Create private zone
gcloud dns managed-zones create internal-zone \
  --dns-name=internal.example.com \
  --description="Internal services" \
  --visibility=private \
  --networks=my-vpc
```

Configure ExternalDNS:

```yaml
args:
- --provider=google
- --google-project=PROJECT_ID
- --google-zone-visibility=private
- --domain-filter=internal.example.com
```

## Monitoring and Troubleshooting

Check ExternalDNS logs:

```bash
kubectl logs -n kube-system deployment/external-dns -f
```

Verify service account binding:

```bash
kubectl describe sa -n kube-system external-dns
```

Test DNS resolution:

```bash
dig @8.8.8.8 web.example.com
```

View Cloud DNS changes:

```bash
gcloud dns record-sets list --zone=example-zone
```

## Using TXT Record Ownership

ExternalDNS creates TXT records for ownership:

```bash
# View TXT records
gcloud dns record-sets list \
  --zone=example-zone \
  --filter="type:TXT"
```

This prevents multiple clusters from conflicting.

## Filtering by Annotation

Only manage annotated resources:

```yaml
args:
- --annotation-filter=dns=external
```

Then annotate services:

```yaml
metadata:
  annotations:
    dns: external
    external-dns.alpha.kubernetes.io/hostname: web.example.com
```

## Conclusion

ExternalDNS with Google Cloud DNS provides automated DNS management for GKE services, eliminating manual record updates. Using Workload Identity ensures secure, permission-scoped access to Cloud DNS, while TXT record ownership prevents conflicts between multiple clusters.

The integration streamlines DNS operations for microservices architectures where services frequently change, ensuring DNS records stay synchronized with cluster state.
