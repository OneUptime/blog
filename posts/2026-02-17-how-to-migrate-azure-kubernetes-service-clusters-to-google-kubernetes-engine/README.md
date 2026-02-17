# How to Migrate Azure Kubernetes Service Clusters to Google Kubernetes Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Kubernetes Engine, GKE, Azure AKS, Kubernetes, Cloud Migration

Description: A hands-on guide to migrating Kubernetes workloads from Azure Kubernetes Service to Google Kubernetes Engine, covering cluster setup, workload migration, and networking differences.

---

Migrating Kubernetes clusters between cloud providers is one of the more manageable cloud migrations because Kubernetes provides a consistent API layer. Your pod specs, deployments, and services are largely portable. The cloud-specific parts - load balancers, storage classes, node pools, and identity - are where you need to make changes.

This guide walks through migrating from Azure Kubernetes Service (AKS) to Google Kubernetes Engine (GKE).

## What is Portable and What is Not

Portable across clouds:
- Pod specs, Deployments, StatefulSets, DaemonSets
- ConfigMaps and Secrets (data is portable, references may not be)
- Services (ClusterIP, NodePort)
- RBAC rules (mostly)
- Helm charts (with value overrides)

Cloud-specific (needs changes):
- LoadBalancer Services (annotations differ)
- Ingress controllers and annotations
- StorageClasses and PersistentVolumeClaims
- Node selectors and taints
- Service mesh configuration
- Identity and workload identity
- Container registry references

## Step 1: Export Your AKS Configuration

Pull everything from your AKS cluster.

```bash
# Get AKS cluster details
az aks show \
  --name my-aks-cluster \
  --resource-group my-rg \
  --query '{
    Name:name,
    Version:kubernetesVersion,
    NodePools:agentPoolProfiles[*].{
      Name:name,
      VMSize:vmSize,
      Count:count,
      MinCount:minCount,
      MaxCount:maxCount
    },
    NetworkPlugin:networkProfile.networkPlugin,
    NetworkPolicy:networkProfile.networkPolicy
  }'

# Export all Kubernetes manifests from the cluster
kubectl get all --all-namespaces -o yaml > all-resources.yaml

# Export specific resource types
kubectl get deployments --all-namespaces -o yaml > deployments.yaml
kubectl get services --all-namespaces -o yaml > services.yaml
kubectl get configmaps --all-namespaces -o yaml > configmaps.yaml
kubectl get secrets --all-namespaces -o yaml > secrets.yaml
kubectl get ingress --all-namespaces -o yaml > ingresses.yaml
kubectl get pvc --all-namespaces -o yaml > pvcs.yaml
```

## Step 2: Create the GKE Cluster

Create a GKE cluster that matches your AKS configuration.

```bash
# Map AKS VM sizes to GKE machine types
# Standard_D4s_v3 (4 vCPU, 16 GB) -> e2-standard-4 (4 vCPU, 16 GB)
# Standard_D8s_v3 (8 vCPU, 32 GB) -> e2-standard-8 (8 vCPU, 32 GB)

# Create a GKE Autopilot cluster (recommended - handles node management)
gcloud container clusters create-auto my-gke-cluster \
  --region=us-central1 \
  --release-channel=regular

# Or create a Standard cluster with specific node pools
gcloud container clusters create my-gke-cluster \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --enable-network-policy \
  --workload-pool=my-project.svc.id.goog

# Add additional node pools if needed
gcloud container node-pools create high-memory-pool \
  --cluster=my-gke-cluster \
  --region=us-central1 \
  --machine-type=e2-highmem-8 \
  --num-nodes=2 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=5 \
  --node-taints=workload=memory-intensive:NoSchedule
```

## Step 3: Migrate Container Images

Move your container images from Azure Container Registry to Google Artifact Registry.

```bash
# Create an Artifact Registry repository
gcloud artifacts repositories create my-apps \
  --repository-format=docker \
  --location=us-central1

# Login to both registries
az acr login --name myacr
gcloud auth configure-docker us-central1-docker.pkg.dev

# Pull from ACR and push to Artifact Registry
docker pull myacr.azurecr.io/my-app:v1.2.3
docker tag myacr.azurecr.io/my-app:v1.2.3 \
  us-central1-docker.pkg.dev/my-project/my-apps/my-app:v1.2.3
docker push us-central1-docker.pkg.dev/my-project/my-apps/my-app:v1.2.3
```

For bulk migration, script it:

```bash
# Bulk migrate images from ACR to Artifact Registry
for image in $(az acr repository list --name myacr --output tsv); do
  tags=$(az acr repository show-tags --name myacr --repository $image --output tsv)
  for tag in $tags; do
    echo "Migrating $image:$tag"
    docker pull "myacr.azurecr.io/$image:$tag"
    docker tag "myacr.azurecr.io/$image:$tag" \
      "us-central1-docker.pkg.dev/my-project/my-apps/$image:$tag"
    docker push "us-central1-docker.pkg.dev/my-project/my-apps/$image:$tag"
  done
done
```

## Step 4: Update Kubernetes Manifests

Update your manifests to work with GKE. Here are the common changes:

### Container Image References

```yaml
# Before (ACR)
spec:
  containers:
    - name: my-app
      image: myacr.azurecr.io/my-app:v1.2.3

# After (Artifact Registry)
spec:
  containers:
    - name: my-app
      image: us-central1-docker.pkg.dev/my-project/my-apps/my-app:v1.2.3
```

### StorageClass Changes

```yaml
# Before (AKS - Azure managed disk)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS

# After (GKE - Persistent Disk)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ssd-storage
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### LoadBalancer Service Annotations

```yaml
# Before (AKS - Azure Load Balancer)
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080

# After (GKE - Internal Load Balancer)
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    networking.gke.io/load-balancer-type: "Internal"
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
```

### Ingress Changes

```yaml
# Before (AKS with NGINX Ingress or Azure Application Gateway)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod

# After (GKE with Google Cloud Load Balancer)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    networking.gke.io/managed-certificates: "my-cert"
    kubernetes.io/ingress.global-static-ip-name: "my-static-ip"
```

## Step 5: Set Up Workload Identity

AKS uses Azure AD Pod Identity or Workload Identity. GKE uses GKE Workload Identity.

```bash
# Create a GCP service account
gcloud iam service-accounts create my-app-ksa \
  --display-name="My App Kubernetes SA"

# Grant it necessary permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-ksa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Link the Kubernetes service account to the GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  my-app-ksa@my-project.iam.gserviceaccount.com \
  --member="serviceAccount:my-project.svc.id.goog[my-namespace/my-ksa]" \
  --role="roles/iam.workloadIdentityUser"
```

Update the Kubernetes service account:

```yaml
# Kubernetes ServiceAccount with GKE Workload Identity annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-ksa
  namespace: my-namespace
  annotations:
    iam.gke.io/gcp-service-account: my-app-ksa@my-project.iam.gserviceaccount.com
```

## Step 6: Migrate Persistent Data

For StatefulSets with persistent volumes, you need to migrate the data.

```bash
# Option 1: Application-level backup and restore
# Use your application's backup tools (e.g., pg_dump for PostgreSQL)

# Option 2: Volume snapshot and restore
# Export data from AKS PV to a file, upload to GCS, import to GKE PV
kubectl exec -n my-namespace my-statefulset-0 -- \
  tar czf /tmp/data-backup.tar.gz /data

kubectl cp my-namespace/my-statefulset-0:/tmp/data-backup.tar.gz ./data-backup.tar.gz
gsutil cp ./data-backup.tar.gz gs://my-migration-bucket/data-backup.tar.gz
```

## Step 7: Deploy to GKE

Apply your updated manifests to the GKE cluster.

```bash
# Get credentials for the GKE cluster
gcloud container clusters get-credentials my-gke-cluster \
  --region=us-central1

# Apply namespaces first
kubectl apply -f namespaces.yaml

# Apply ConfigMaps and Secrets
kubectl apply -f configmaps.yaml
kubectl apply -f secrets.yaml

# Apply StorageClasses and PVCs
kubectl apply -f storageclasses.yaml
kubectl apply -f pvcs.yaml

# Deploy workloads
kubectl apply -f deployments.yaml
kubectl apply -f statefulsets.yaml
kubectl apply -f services.yaml
kubectl apply -f ingresses.yaml

# Verify pods are running
kubectl get pods --all-namespaces
```

## Step 8: Validate and Cutover

Run thorough validation before switching traffic.

```bash
# Check all pods are running and healthy
kubectl get pods --all-namespaces -o wide | grep -v Running

# Run smoke tests against the GKE services
kubectl port-forward svc/my-app 8080:80 -n my-namespace
curl http://localhost:8080/health

# Compare resource usage between AKS and GKE
kubectl top pods --all-namespaces
kubectl top nodes
```

## Summary

Migrating from AKS to GKE is one of the smoother cloud migrations because Kubernetes abstracts away most of the underlying infrastructure differences. The main areas requiring changes are container image references, storage classes, load balancer annotations, ingress configuration, and identity management. Use a blue-green approach - run both clusters in parallel, verify everything works on GKE, then cut over DNS. Kubernetes' declarative model makes it straightforward to apply the same workloads on a new cluster.
