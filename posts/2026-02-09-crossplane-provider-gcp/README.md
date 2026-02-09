# How to Use Crossplane Provider for GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, GCP

Description: Learn how to configure and use the Crossplane GCP provider to manage Google Cloud Platform resources from Kubernetes with declarative infrastructure management.

---

The Crossplane GCP provider enables managing Google Cloud resources through Kubernetes APIs. Provision Cloud SQL databases, GCS buckets, GKE clusters, and Compute Engine instances using kubectl instead of gcloud CLI or Terraform. The provider maintains continuous reconciliation between your Kubernetes manifests and actual GCP infrastructure.

Google Cloud's extensive API surface translates into hundreds of Kubernetes CRDs through the Crossplane provider. Each GCP resource type gets a corresponding Kubernetes resource definition, bringing infrastructure management into your GitOps workflows.

## Installing the GCP Provider

Install the provider package:

```bash
# Install GCP provider
kubectl crossplane install provider \
  xpkg.upbound.io/crossplane-contrib/provider-gcp:v0.36.0

# Check installation status
kubectl get providers

# Wait for provider to become healthy
kubectl wait --for=condition=Healthy \
  provider/provider-gcp \
  --timeout=300s

# Verify CRDs are installed
kubectl get crds | grep gcp.crossplane.io | wc -l
```

The provider creates controllers for GCP services and installs CRDs representing GCP resources.

## Creating a Service Account

Create a GCP service account for Crossplane:

```bash
# Set project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Create service account
gcloud iam service-accounts create crossplane-sa \
  --display-name="Crossplane Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:crossplane-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/editor"

# Create and download service account key
gcloud iam service-accounts keys create crossplane-gcp-key.json \
  --iam-account=crossplane-sa@${PROJECT_ID}.iam.gserviceaccount.com

# View the key file
cat crossplane-gcp-key.json
```

## Creating Credentials Secret

Store GCP credentials as a Kubernetes secret:

```bash
# Create secret from service account key
kubectl create secret generic gcp-creds \
  -n crossplane-system \
  --from-file=creds=./crossplane-gcp-key.json

# Verify secret creation
kubectl describe secret gcp-creds -n crossplane-system

# Secure the key file
chmod 600 crossplane-gcp-key.json
# Or delete it for security
rm crossplane-gcp-key.json
```

## Configuring the GCP Provider

Create ProviderConfig for authentication:

```yaml
apiVersion: gcp.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: your-project-id
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-creds
      key: creds
```

Apply the configuration:

```bash
kubectl apply -f gcp-providerconfig.yaml

# Verify ProviderConfig
kubectl get providerconfigs
kubectl describe providerconfig default
```

## Provisioning a Cloud Storage Bucket

Create a GCS bucket:

```yaml
apiVersion: storage.gcp.crossplane.io/v1alpha1
kind: Bucket
metadata:
  name: crossplane-gcs-bucket
spec:
  forProvider:
    location: US
    storageClass: STANDARD
    uniformBucketLevelAccess: true
    versioning:
      enabled: true
    encryption:
      defaultKmsKeyName: ""
    lifecycle:
      rule:
      - action:
          type: Delete
        condition:
          age: 365
    labels:
      environment: production
      managed-by: crossplane
  providerConfigRef:
    name: default
```

Apply and monitor:

```bash
kubectl apply -f gcs-bucket.yaml

# Watch bucket creation
kubectl get bucket crossplane-gcs-bucket -w

# Check status
kubectl describe bucket crossplane-gcs-bucket

# Verify in GCP
gsutil ls | grep crossplane-gcs-bucket
```

## Creating a Cloud SQL Instance

Provision a PostgreSQL Cloud SQL database:

```yaml
apiVersion: database.gcp.crossplane.io/v1beta1
kind: CloudSQLInstance
metadata:
  name: crossplane-cloudsql
spec:
  forProvider:
    databaseVersion: POSTGRES_14
    region: us-central1
    settings:
      tier: db-f1-micro
      ipConfiguration:
        ipv4Enabled: true
        requireSsl: true
        authorizedNetworks:
        - name: allow-all
          value: "0.0.0.0/0"
      backupConfiguration:
        enabled: true
        startTime: "03:00"
        pointInTimeRecoveryEnabled: true
      maintenanceWindow:
        day: 7
        hour: 3
      databaseFlags:
      - name: max_connections
        value: "100"
      userLabels:
        environment: production
        managed-by: crossplane
  writeConnectionSecretToRef:
    namespace: default
    name: cloudsql-conn
  providerConfigRef:
    name: default
```

The connection secret contains the instance connection details.

## Managing Compute Engine Instances

Create a Compute Engine VM:

```yaml
apiVersion: compute.gcp.crossplane.io/v1beta1
kind: Instance
metadata:
  name: crossplane-vm
spec:
  forProvider:
    zone: us-central1-a
    machineType: n1-standard-1
    bootDisk:
      initializeParams:
        sourceImage: projects/debian-cloud/global/images/family/debian-11
        diskSizeGb: 20
    networkInterface:
    - network: default
      accessConfig:
      - name: External NAT
        type: ONE_TO_ONE_NAT
    metadata:
      startup-script: |
        #!/bin/bash
        apt-get update
        apt-get install -y nginx
        systemctl enable nginx
        systemctl start nginx
    labels:
      environment: development
      managed-by: crossplane
  providerConfigRef:
    name: default
```

## Provisioning a GKE Cluster

Deploy a Google Kubernetes Engine cluster:

```yaml
apiVersion: container.gcp.crossplane.io/v1beta2
kind: Cluster
metadata:
  name: crossplane-gke
spec:
  forProvider:
    initialClusterVersion: "1.27"
    location: us-central1
    network: default
    subnetwork: default
    addonsConfig:
      httpLoadBalancing:
        disabled: false
      horizontalPodAutoscaling:
        disabled: false
    ipAllocationPolicy:
      useIpAliases: true
    masterAuth:
      clientCertificateConfig:
        issueClientCertificate: false
    networkPolicy:
      enabled: true
      provider: CALICO
    loggingService: logging.googleapis.com/kubernetes
    monitoringService: monitoring.googleapis.com/kubernetes
    resourceLabels:
      environment: production
      managed-by: crossplane
  writeConnectionSecretToRef:
    namespace: default
    name: gke-kubeconfig
  providerConfigRef:
    name: default
---
apiVersion: container.gcp.crossplane.io/v1beta1
kind: NodePool
metadata:
  name: crossplane-gke-nodepool
spec:
  forProvider:
    clusterSelector:
      matchLabels:
        name: crossplane-gke
    initialNodeCount: 3
    autoscaling:
      enabled: true
      minNodeCount: 1
      maxNodeCount: 5
    config:
      machineType: n1-standard-2
      diskSizeGb: 100
      diskType: pd-standard
      preemptible: false
      oauthScopes:
      - https://www.googleapis.com/auth/cloud-platform
    management:
      autoUpgrade: true
      autoRepair: true
  providerConfigRef:
    name: default
```

Retrieve the kubeconfig:

```bash
kubectl get secret gke-kubeconfig -o jsonpath='{.data.kubeconfig}' | base64 -d > gke-kubeconfig.yaml

# Connect to GKE cluster
export KUBECONFIG=gke-kubeconfig.yaml
kubectl get nodes
```

## Creating VPC Networks

Configure a custom VPC network:

```yaml
apiVersion: compute.gcp.crossplane.io/v1beta1
kind: Network
metadata:
  name: crossplane-vpc
spec:
  forProvider:
    autoCreateSubnetworks: false
    routingConfig:
      routingMode: REGIONAL
    description: Crossplane managed VPC
  providerConfigRef:
    name: default
---
apiVersion: compute.gcp.crossplane.io/v1beta1
kind: Subnetwork
metadata:
  name: crossplane-subnet
spec:
  forProvider:
    ipCidrRange: 10.0.0.0/24
    region: us-central1
    networkSelector:
      matchLabels:
        name: crossplane-vpc
    privateIpGoogleAccess: true
    logConfig:
      enable: true
      aggregationInterval: INTERVAL_5_SEC
      flowSampling: 0.5
  providerConfigRef:
    name: default
```

## Using Workload Identity

Configure Crossplane to use Workload Identity:

```bash
# Create Kubernetes service account
kubectl create serviceaccount crossplane-gcp \
  -n crossplane-system

# Bind to GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  crossplane-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:${PROJECT_ID}.svc.id.goog[crossplane-system/crossplane-gcp]"

# Annotate Kubernetes service account
kubectl annotate serviceaccount crossplane-gcp \
  -n crossplane-system \
  iam.gke.io/gcp-service-account=crossplane-sa@${PROJECT_ID}.iam.gserviceaccount.com
```

Update ProviderConfig:

```yaml
apiVersion: gcp.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: workload-identity
spec:
  projectID: your-project-id
  credentials:
    source: InjectedIdentity
```

## Managing Multiple Projects

Configure different GCP projects:

```yaml
apiVersion: gcp.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: production
spec:
  projectID: prod-project-id
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-prod-creds
      key: creds
---
apiVersion: gcp.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: development
spec:
  projectID: dev-project-id
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-dev-creds
      key: creds
```

Reference the appropriate config in resources.

## Implementing Resource References

Link resources using selectors:

```yaml
apiVersion: servicenetworking.gcp.crossplane.io/v1beta1
kind: Connection
metadata:
  name: cloudsql-private
spec:
  forProvider:
    parent: services/servicenetworking.googleapis.com
    networkSelector:
      matchLabels:
        name: crossplane-vpc
    reservedPeeringRanges:
    - google-managed-services-crossplane-vpc
  providerConfigRef:
    name: default
```

## Monitoring GCP Resources

Track resource status:

```bash
# List all GCP managed resources
kubectl get managed | grep gcp

# Check specific resource type
kubectl get cloudsqlinstance

# Describe for detailed status
kubectl describe cloudsqlinstance crossplane-cloudsql

# Check synchronization status
kubectl get bucket -o jsonpath='{.items[*].status.conditions[?(@.type=="Synced")].status}'
```

Create alerts for resource issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: crossplane-gcp-alerts
spec:
  groups:
  - name: crossplane-gcp
    rules:
    - alert: GCPResourceNotReady
      expr: |
        crossplane_managed_resource_exists{provider="gcp"} == 1
        and
        crossplane_managed_resource_ready{provider="gcp"} == 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "GCP resource {{ $labels.name }} not ready"
```

## Troubleshooting GCP Provider

Common issues and solutions:

**Authentication failures**:
```bash
# Verify credentials
kubectl get secret gcp-creds -n crossplane-system -o jsonpath='{.data.creds}' | base64 -d

# Test service account
gcloud auth activate-service-account --key-file=crossplane-gcp-key.json
gcloud projects list
```

**Resource creation stuck**:
```bash
# Check resource events
kubectl describe bucket crossplane-gcs-bucket

# View provider logs
kubectl logs -n crossplane-system -l pkg.crossplane.io/provider=provider-gcp --tail=50
```

**Permission errors**:
```bash
# Verify service account roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:crossplane-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Add missing permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:crossplane-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/compute.admin"
```

## Conclusion

The Crossplane GCP provider enables managing Google Cloud infrastructure through Kubernetes APIs. By configuring authentication with service accounts or Workload Identity, using resource selectors for dependencies, and implementing proper RBAC controls, you create a robust platform for GCP resource management. The provider's comprehensive API coverage allows provisioning and managing virtually any GCP service through familiar kubectl commands and GitOps workflows.
