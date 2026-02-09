# Provisioning Managed Database Services Using Crossplane on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Crossplane, Database, Cloud, Kubernetes, Infrastructure as Code

Description: How to use Crossplane to provision and manage cloud database services like RDS, Cloud SQL, and Azure Database directly from Kubernetes

---

Managing cloud infrastructure has traditionally required separate tooling from application deployment. Development teams submit tickets or use cloud consoles to provision databases, then manually configure connection strings in their Kubernetes workloads. Crossplane changes this paradigm by extending the Kubernetes API to provision and manage cloud resources, including managed database services, using the same declarative approach you use for pods and deployments. This guide demonstrates how to provision databases across AWS, GCP, and Azure using Crossplane, creating a self-service platform for development teams.

## What Is Crossplane?

Crossplane is an open-source Kubernetes add-on that transforms your Kubernetes cluster into a universal control plane for infrastructure. It uses Custom Resource Definitions (CRDs) to represent cloud resources as Kubernetes objects. When you create a Crossplane managed resource, the corresponding cloud resource is provisioned automatically. When you delete it, the cloud resource is cleaned up.

Crossplane providers are plugins that add support for specific cloud platforms. Each provider includes CRDs for the cloud resources it manages and controllers that reconcile the desired state with the actual state of the cloud resources.

## Installing Crossplane

Install Crossplane using Helm:

```bash
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --set args='{"--enable-composition-revisions"}'
```

Verify the installation:

```bash
kubectl get pods -n crossplane-system
kubectl get crds | grep crossplane
```

## Setting Up Cloud Providers

### AWS Provider for RDS

Install the AWS provider and configure credentials:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws-rds:v1.2.0
```

Create a credential secret and ProviderConfig:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: crossplane-system
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = YOUR_ACCESS_KEY
    aws_secret_access_key = YOUR_SECRET_KEY
---
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-credentials
      key: credentials
```

### GCP Provider for Cloud SQL

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp
spec:
  package: xpkg.upbound.io/upbound/provider-gcp-sql:v1.2.0
---
apiVersion: v1
kind: Secret
metadata:
  name: gcp-credentials
  namespace: crossplane-system
type: Opaque
stringData:
  credentials: |
    {
      "type": "service_account",
      "project_id": "your-project",
      "private_key": "...",
      "client_email": "crossplane@your-project.iam.gserviceaccount.com"
    }
---
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: your-project
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-credentials
      key: credentials
```

## Provisioning an AWS RDS PostgreSQL Instance

Create a managed PostgreSQL database on AWS RDS:

```yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: production-postgres
  namespace: default
spec:
  forProvider:
    region: us-east-1
    allocatedStorage: 100
    engine: postgres
    engineVersion: "15.4"
    instanceClass: db.r6g.xlarge
    dbName: appdb
    username: dbadmin
    passwordSecretRef:
      name: db-password
      namespace: default
      key: password
    storageType: gp3
    storageEncrypted: true
    multiAz: true
    publiclyAccessible: false
    vpcSecurityGroupIdRefs:
      - name: db-security-group
    dbSubnetGroupNameRef:
      name: db-subnet-group
    backupRetentionPeriod: 7
    backupWindow: "03:00-04:00"
    maintenanceWindow: "Mon:04:00-Mon:05:00"
    deletionProtection: true
    skipFinalSnapshot: false
    finalSnapshotIdentifier: production-postgres-final
    autoMinorVersionUpgrade: true
  writeConnectionSecretToRef:
    name: production-postgres-connection
    namespace: default
```

The `writeConnectionSecretToRef` field is particularly important. Crossplane automatically creates a Kubernetes secret containing the database connection details (host, port, username, password) that your applications can consume directly.

## Provisioning a Google Cloud SQL Instance

```yaml
apiVersion: sql.gcp.upbound.io/v1beta1
kind: DatabaseInstance
metadata:
  name: production-cloudsql
spec:
  forProvider:
    region: us-central1
    databaseVersion: POSTGRES_15
    deletionProtection: true
    settings:
      - tier: db-custom-4-16384
        diskSize: 100
        diskType: PD_SSD
        diskAutoresize: true
        diskAutoresizeLimit: 500
        availabilityType: REGIONAL
        backupConfiguration:
          - enabled: true
            pointInTimeRecoveryEnabled: true
            startTime: "03:00"
            backupRetentionSettings:
              - retainedBackups: 7
        ipConfiguration:
          - ipv4Enabled: false
            privateNetworkRef:
              name: production-vpc
        maintenanceWindow:
          - day: 1
            hour: 4
            updateTrack: stable
        insightsConfig:
          - queryInsightsEnabled: true
            queryPlansPerMinute: 5
            queryStringLength: 1024
  writeConnectionSecretToRef:
    name: production-cloudsql-connection
    namespace: default
```

## Creating Compositions for Self-Service

Raw managed resources expose every cloud-specific parameter, which can overwhelm development teams. Crossplane Compositions let you create simplified, opinionated abstractions:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XDatabase
    plural: xdatabases
  claimNames:
    kind: Database
    plural: databases
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                size:
                  type: string
                  enum: ["small", "medium", "large"]
                  description: "Database size tier"
                engine:
                  type: string
                  enum: ["postgres", "mysql"]
                  description: "Database engine"
                version:
                  type: string
                  description: "Engine version"
              required:
                - size
                - engine
```

Now create a Composition that maps these simple inputs to cloud resources:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aws-database
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XDatabase
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-east-1
            engine: postgres
            storageType: gp3
            storageEncrypted: true
            multiAz: true
            publiclyAccessible: false
            backupRetentionPeriod: 7
            deletionProtection: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.engine
          toFieldPath: spec.forProvider.engine
        - type: FromCompositeFieldPath
          fromFieldPath: spec.version
          toFieldPath: spec.forProvider.engineVersion
        - type: FromCompositeFieldPath
          fromFieldPath: spec.size
          toFieldPath: spec.forProvider.instanceClass
          transforms:
            - type: map
              map:
                small: db.t4g.medium
                medium: db.r6g.large
                large: db.r6g.2xlarge
        - type: FromCompositeFieldPath
          fromFieldPath: spec.size
          toFieldPath: spec.forProvider.allocatedStorage
          transforms:
            - type: map
              map:
                small: 50
                medium: 200
                large: 500
```

## Consuming Databases from Applications

With the Composition in place, developers can request databases with a simple claim:

```yaml
apiVersion: platform.example.com/v1alpha1
kind: Database
metadata:
  name: my-app-database
  namespace: my-app
spec:
  size: medium
  engine: postgres
  version: "15.4"
  compositionSelector:
    matchLabels:
      provider: aws
```

The connection secret is automatically created in the application namespace and can be consumed by pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: my-app-database
                  key: endpoint
            - name: DB_PORT
              valueFrom:
                secretKeyRef:
                  name: my-app-database
                  key: port
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: my-app-database
                  key: password
```

## Monitoring and Troubleshooting

Check the status of provisioned databases:

```bash
# View all database claims
kubectl get databases -A

# Check the composite resource status
kubectl get xdatabases

# Inspect the underlying managed resource
kubectl describe instance.rds production-postgres

# View Crossplane events
kubectl get events --field-selector involvedObject.kind=Instance
```

Common issues and their solutions:

- **Resource stuck in "Creating"**: Check provider logs with `kubectl logs -n crossplane-system -l pkg.crossplane.io/revision`
- **Permission errors**: Verify IAM roles have the necessary permissions for the resource type
- **Connection secret not appearing**: Ensure `writeConnectionSecretToRef` namespace matches the claim namespace

## Conclusion

Crossplane transforms database provisioning from a manual, ticket-driven process into a self-service, declarative workflow. By defining Compositions that encode your organization's best practices for database configuration, you empower development teams to provision production-grade databases without deep cloud expertise. The Kubernetes-native approach means databases are managed alongside application resources, connection secrets flow naturally into pods, and the entire lifecycle is governed by Kubernetes RBAC. Whether you are running on AWS, GCP, Azure, or a combination, Crossplane provides a consistent interface that abstracts cloud-specific complexity while maintaining full configurability when needed.
