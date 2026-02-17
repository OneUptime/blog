# How to Set Up ExternalDNS on GKE to Automatically Manage Cloud DNS Records from Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, ExternalDNS, Cloud DNS, Kubernetes, Networking

Description: Step-by-step guide to deploying ExternalDNS on GKE so that Kubernetes Services and Ingresses automatically create and update Cloud DNS records.

---

Managing DNS records manually every time you deploy a new service to Kubernetes gets old fast. You create a LoadBalancer service, wait for the external IP, then go to Cloud DNS and add an A record pointing to that IP. And when the IP changes? You get to do it all over again.

ExternalDNS solves this by watching your Kubernetes resources - Services, Ingresses, and more - and automatically creating the corresponding DNS records in Cloud DNS. Once it is running, you just annotate your Service with the hostname you want, and ExternalDNS takes care of the rest.

## Prerequisites

Before getting started, you need a few things in place:

- A running GKE cluster
- A Cloud DNS managed zone for your domain
- The gcloud CLI configured with appropriate permissions

If you do not have a Cloud DNS zone yet, create one first:

```bash
# Create a Cloud DNS managed zone for your domain
gcloud dns managed-zones create my-zone \
  --dns-name="example.com." \
  --description="Zone for ExternalDNS"
```

## Setting Up IAM Permissions

ExternalDNS needs permission to read and write DNS records in Cloud DNS. The cleanest way to do this on GKE is with Workload Identity, which lets Kubernetes service accounts act as Google Cloud service accounts without needing keys.

First, create a Google Cloud service account for ExternalDNS:

```bash
# Create the service account that ExternalDNS will use
gcloud iam service-accounts create external-dns \
  --display-name="ExternalDNS Service Account"
```

Grant the service account permission to manage DNS records:

```bash
# Give the service account DNS admin permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:external-dns@my-project.iam.gserviceaccount.com" \
  --role="roles/dns.admin"
```

Now bind the Kubernetes service account to the Google Cloud service account:

```bash
# Allow the Kubernetes service account to impersonate the GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  external-dns@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[external-dns/external-dns]"
```

## Creating the Kubernetes Namespace and Service Account

Set up the namespace and annotated service account for ExternalDNS:

```yaml
# namespace.yaml - Dedicated namespace for ExternalDNS
apiVersion: v1
kind: Namespace
metadata:
  name: external-dns
---
# serviceaccount.yaml - K8s service account linked to GCP service account via Workload Identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns
  namespace: external-dns
  annotations:
    iam.gke.io/gcp-service-account: external-dns@my-project.iam.gserviceaccount.com
```

Apply the namespace and service account:

```bash
kubectl apply -f namespace.yaml
```

## RBAC Configuration

ExternalDNS needs permission to watch Services, Ingresses, and other resources in the cluster:

```yaml
# rbac.yaml - Cluster-level permissions for ExternalDNS to read K8s resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-dns
rules:
  - apiGroups: [""]
    resources: ["services", "endpoints", "pods"]
    verbs: ["get", "watch", "list"]
  - apiGroups: ["extensions", "networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "watch", "list"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["list"]
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
```

## Deploying ExternalDNS

Here is the Deployment manifest for ExternalDNS configured to work with Google Cloud DNS:

```yaml
# deployment.yaml - ExternalDNS deployment targeting Cloud DNS
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
  strategy:
    type: Recreate
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
            # Use Google Cloud DNS as the provider
            - --provider=google
            # Your GCP project ID
            - --google-project=my-project
            # Only manage records in this DNS zone
            - --domain-filter=example.com
            # Only look at Services with LoadBalancer type and Ingresses
            - --source=service
            - --source=ingress
            # Use a TXT record prefix to track ownership
            - --txt-owner-id=my-gke-cluster
            # Sync mode: upsert-only means it will create and update but not delete
            - --policy=upsert-only
            # How often to check for changes
            - --interval=1m
            # Log level for debugging
            - --log-level=info
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              memory: 128Mi
```

Apply all the manifests:

```bash
kubectl apply -f rbac.yaml
kubectl apply -f deployment.yaml
```

## Using ExternalDNS with a Service

With ExternalDNS running, you can annotate your Services to automatically create DNS records. The key annotation is `external-dns.alpha.kubernetes.io/hostname`.

This creates a LoadBalancer Service that ExternalDNS will pick up and create a DNS record for:

```yaml
# my-app-service.yaml - Service with ExternalDNS annotation for automatic DNS
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    # Tell ExternalDNS to create a record for this hostname
    external-dns.alpha.kubernetes.io/hostname: myapp.example.com
    # Optional: set the TTL for the DNS record
    external-dns.alpha.kubernetes.io/ttl: "300"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

After applying this, ExternalDNS will notice the new Service, wait for it to get an external IP, and then create an A record in Cloud DNS pointing `myapp.example.com` to that IP.

## Using ExternalDNS with an Ingress

ExternalDNS also works with Ingress resources. It reads the hostnames from the Ingress rules:

```yaml
# ingress.yaml - Ingress with host rules that ExternalDNS will pick up automatically
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
spec:
  rules:
    - host: myapp.example.com
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

You do not even need the annotation here because ExternalDNS reads the `host` field from the Ingress spec directly.

## Verifying It Works

Check the ExternalDNS logs to see if it is picking up your resources:

```bash
# Check ExternalDNS logs for record creation events
kubectl logs -n external-dns deployment/external-dns
```

You should see lines like "Creating DNS record" or "Updating DNS record." You can also verify directly in Cloud DNS:

```bash
# List records in your Cloud DNS zone to confirm the record was created
gcloud dns record-sets list --zone=my-zone --filter="name=myapp.example.com."
```

## Switching to sync Policy

The `upsert-only` policy is safe for getting started because it never deletes records. Once you are comfortable with ExternalDNS, you can switch to `sync` mode, which will also clean up DNS records when you delete the corresponding Kubernetes resource:

```yaml
# Change this argument in the deployment
- --policy=sync
```

Be careful with sync mode - it will delete any DNS records in the managed zone that do not correspond to a Kubernetes resource with the matching owner TXT record.

## Troubleshooting Common Issues

If records are not being created, check these things:

First, verify Workload Identity is working by running a test pod with the same service account and checking if it can authenticate as the GCP service account. Second, make sure your domain filter matches the hostnames you are using. If you set `--domain-filter=example.com` but annotate a Service with `myapp.otherdomain.com`, ExternalDNS will ignore it. Third, check that the Cloud DNS zone is properly configured and that the nameservers for your domain point to the Google Cloud DNS nameservers.

ExternalDNS is one of those tools that you set up once and then forget about. It quietly does its job in the background, keeping your DNS records in sync with your Kubernetes resources. No more manually updating records, no more stale entries pointing to decommissioned services. Just annotate and go.
