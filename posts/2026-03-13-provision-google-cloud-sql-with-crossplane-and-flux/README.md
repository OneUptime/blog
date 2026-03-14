# How to Provision Google Cloud SQL with Crossplane and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, GCP, Cloud SQL, GitOps, Kubernetes, Database, Infrastructure as Code

Description: Provision Google Cloud SQL instances using Crossplane and Flux CD for fully GitOps-managed database lifecycle management on Google Cloud Platform.

---

## Introduction

Google Cloud SQL is GCP's fully managed relational database service supporting PostgreSQL, MySQL, and SQL Server. Provisioning it through Crossplane and Flux brings Cloud SQL under the same GitOps workflow you use for applications. Database instances, their configuration, backup policies, and user accounts all become version-controlled Kubernetes manifests.

Cloud SQL's private IP configuration requires a VPC peering connection between your cluster's VPC and the Google-managed services VPC. Crossplane can manage this peering connection alongside the Cloud SQL instance, making the entire setup declarative. This guide walks through provisioning a Cloud SQL PostgreSQL instance with private IP access.

## Prerequisites

- Crossplane with `provider-gcp-sql` and `provider-gcp-servicenetworking` installed
- The GCP ProviderConfig named `default` configured with your project ID
- Flux CD bootstrapped on the cluster
- An existing GCP VPC network

## Step 1: Enable Private Service Access

Private IP for Cloud SQL requires a private service connection to the Google-managed services network.

```yaml
# infrastructure/databases/gcp/private-service-access.yaml
apiVersion: servicenetworking.gcp.upbound.io/v1beta1
kind: Connection
metadata:
  name: private-service-access
spec:
  forProvider:
    network: projects/my-gcp-project/global/networks/main-vpc
    service: servicenetworking.googleapis.com
    reservedPeeringRangeRefs:
      - name: google-managed-services-range
  providerConfigRef:
    name: default

---
# Reserve an IP range for the Google-managed services
apiVersion: compute.gcp.upbound.io/v1beta1
kind: GlobalAddress
metadata:
  name: google-managed-services-range
spec:
  forProvider:
    addressType: INTERNAL
    network: projects/my-gcp-project/global/networks/main-vpc
    purpose: VPC_PEERING
    prefixLength: 16
    description: "Reserved for Google-managed services (Cloud SQL private IP)"
  providerConfigRef:
    name: default
```

## Step 2: Create the Cloud SQL Instance

```yaml
# infrastructure/databases/gcp/cloudsql-instance.yaml
apiVersion: sql.gcp.upbound.io/v1beta1
kind: DatabaseInstance
metadata:
  name: production-postgres
spec:
  forProvider:
    databaseVersion: POSTGRES_15
    region: us-central1
    settings:
      - tier: db-custom-2-7680  # 2 vCPUs, 7.5 GB RAM
        availabilityType: REGIONAL  # Multi-AZ equivalent
        diskAutoresize: true
        diskSize: 100
        diskType: PD_SSD
        # Backup configuration
        backupConfiguration:
          - enabled: true
            startTime: "03:00"  # Backup window in UTC
            pointInTimeRecoveryEnabled: true
            backupRetentionSettings:
              - retainedBackups: 14
                retentionUnit: COUNT
        # Maintenance window
        maintenanceWindow:
          - hour: 4
            day: 1  # Monday
            updateTrack: stable
        # IP configuration - private IP only
        ipConfiguration:
          - ipv4Enabled: false  # Disable public IP
            privateNetwork: projects/my-gcp-project/global/networks/main-vpc
            requireSsl: true
        # Database flags for PostgreSQL tuning
        databaseFlags:
          - name: max_connections
            value: "200"
          - name: log_min_duration_statement
            value: "1000"  # Log queries taking more than 1 second
          - name: cloudsql.iam_authentication
            value: "on"  # Enable IAM-based authentication
        # Insights for query performance analysis
        insightsConfig:
          - queryInsightsEnabled: true
            queryStringLength: 1024
            recordApplicationTags: true
    # Deletion protection prevents accidental instance deletion
    deletionProtection: true
  writeConnectionSecretsToRef:
    namespace: crossplane-system
    name: production-postgres-connection
  providerConfigRef:
    name: default
```

## Step 3: Create the Database and User

```yaml
# infrastructure/databases/gcp/cloudsql-database.yaml
apiVersion: sql.gcp.upbound.io/v1beta1
kind: Database
metadata:
  name: production-appdb
spec:
  forProvider:
    instanceRef:
      name: production-postgres
    charset: UTF8
    collation: en_US.UTF8
  providerConfigRef:
    name: default

---
# infrastructure/databases/gcp/cloudsql-user.yaml
apiVersion: sql.gcp.upbound.io/v1beta1
kind: User
metadata:
  name: production-appuser
spec:
  forProvider:
    instanceRef:
      name: production-postgres
    # Use BUILT_IN for password auth or CLOUD_IAM_USER for IAM auth
    type: BUILT_IN
    name: appuser
    passwordSecretRef:
      namespace: crossplane-system
      name: cloudsql-user-password
      key: password
  providerConfigRef:
    name: default
```

## Step 4: Create the User Password Secret

```bash
# Create a strong password
kubectl create secret generic cloudsql-user-password \
  --from-literal=password="$(openssl rand -base64 24)" \
  --namespace crossplane-system
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/gcp-databases.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gcp-databases
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/databases/gcp
  prune: false  # Never auto-prune databases
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane-providers-gcp
  healthChecks:
    - apiVersion: sql.gcp.upbound.io/v1beta1
      kind: DatabaseInstance
      name: production-postgres
```

## Step 6: Verify the Cloud SQL Instance

```bash
# Watch provisioning progress (Cloud SQL takes 5-10 minutes)
kubectl get databaseinstance.sql.gcp.upbound.io production-postgres --watch

# Check the instance status
kubectl describe databaseinstance.sql.gcp.upbound.io production-postgres

# Verify the database was created
kubectl get database.sql.gcp.upbound.io production-appdb

# Get connection details from the secret
kubectl get secret production-postgres-connection \
  -n crossplane-system \
  -o jsonpath='{.data.privateIpAddress}' | base64 -d
```

## Best Practices

- Always set `ipConfiguration.ipv4Enabled: false` and `requireSsl: true` to ensure Cloud SQL instances are only accessible via private IP with TLS.
- Enable `cloudsql.iam_authentication` and use IAM-based database authentication for service accounts running in GKE with Workload Identity, eliminating password management.
- Set `availabilityType: REGIONAL` for production instances to enable automatic failover across zones within the region.
- Enable `pointInTimeRecoveryEnabled: true` to allow restoring the database to any point within the backup retention window.
- Set `deletionProtection: true` in both the Crossplane resource spec and Flux Kustomization (`prune: false`) for defense-in-depth against accidental deletion.

## Conclusion

Google Cloud SQL is now provisioned and managed through Crossplane and Flux CD. The instance, its database, and user accounts are all defined declaratively in Git. Crossplane continuously reconciles the Cloud SQL resources, ensuring configuration drift is corrected automatically. With private IP access configured, your applications can connect securely through the VPC network without exposing the database to the public internet.
