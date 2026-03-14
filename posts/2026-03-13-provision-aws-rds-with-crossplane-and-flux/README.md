# How to Provision AWS RDS with Crossplane and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, AWS, RDS, GitOps, Kubernetes, Database, Infrastructure as Code

Description: Provision AWS RDS database instances using Crossplane managed resources reconciled by Flux CD for fully GitOps-driven database lifecycle management.

---

## Introduction

Provisioning an AWS RDS database typically involves navigating the AWS console, running Terraform, or writing CloudFormation templates. With Crossplane and Flux, you can provision an RDS instance by committing a YAML manifest to Git. Flux reconciles the manifest to the cluster, Crossplane translates it into AWS API calls, and the database is created. Drift from the desired configuration is automatically corrected.

This approach puts database provisioning on the same footing as application deployment: everything is in Git, everything is reviewable, and rollback means reverting a commit. The RDS instance lifecycle, from creation through modification to deletion, is driven entirely by changes to manifests in your repository.

This guide provisions an RDS PostgreSQL instance with a subnet group and security group, all managed through Flux CD.

## Prerequisites

- Crossplane with `provider-aws-rds` and `provider-aws-ec2` installed
- The AWS ProviderConfig named `default` configured
- Flux CD bootstrapped on the cluster
- An existing VPC with private subnets

## Step 1: Create a DB Subnet Group

The DB subnet group defines which VPC subnets RDS can use for the database instance.

```yaml
# infrastructure/databases/production/rds-subnet-group.yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: SubnetGroup
metadata:
  name: production-db-subnet-group
  annotations:
    # Crossplane will wait for this resource before marking it ready
    crossplane.io/paused: "false"
spec:
  forProvider:
    region: us-east-1
    description: "Subnet group for production RDS instances"
    # Reference private subnets in at least two AZs for multi-AZ support
    subnetIds:
      - subnet-0a1b2c3d4e5f60001  # us-east-1a private subnet
      - subnet-0a1b2c3d4e5f60002  # us-east-1b private subnet
      - subnet-0a1b2c3d4e5f60003  # us-east-1c private subnet
    tags:
      Environment: production
      ManagedBy: crossplane
  providerConfigRef:
    name: default
```

## Step 2: Create a Security Group for RDS

```yaml
# infrastructure/databases/production/rds-security-group.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: SecurityGroup
metadata:
  name: production-rds-sg
spec:
  forProvider:
    region: us-east-1
    vpcId: vpc-0a1b2c3d4e5f60000
    name: production-rds-sg
    description: "Security group for production RDS instances"
    tags:
      Environment: production
      ManagedBy: crossplane
  providerConfigRef:
    name: default

---
# Allow inbound PostgreSQL from the application security group
apiVersion: ec2.aws.upbound.io/v1beta1
kind: SecurityGroupRule
metadata:
  name: production-rds-ingress
spec:
  forProvider:
    region: us-east-1
    type: ingress
    fromPort: 5432
    toPort: 5432
    protocol: tcp
    # Reference the application security group by its ID
    sourceSecurityGroupId: sg-0a1b2c3d4e5f60010
    securityGroupIdSelector:
      matchLabels:
        crossplane.io/name: production-rds-sg
  providerConfigRef:
    name: default
```

## Step 3: Create the RDS Instance

```yaml
# infrastructure/databases/production/rds-instance.yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: production-postgres
spec:
  forProvider:
    region: us-east-1
    # Database engine configuration
    engine: postgres
    engineVersion: "15.4"
    instanceClass: db.t3.medium
    # Storage configuration
    allocatedStorage: 100
    maxAllocatedStorage: 500  # Enable storage autoscaling up to 500 GB
    storageType: gp3
    storageEncrypted: true
    # Network configuration
    dbSubnetGroupName: production-db-subnet-group
    vpcSecurityGroupIds:
      - sg-0a1b2c3d4e5f60011  # production-rds-sg ID (after creation)
    publiclyAccessible: false
    # Database settings
    dbName: appdb
    # Credentials are managed via the passwordSecretRef
    username: dbadmin
    passwordSecretRef:
      namespace: crossplane-system
      name: rds-master-password
      key: password
    # Backup configuration
    backupRetentionPeriod: 7
    backupWindow: "03:00-04:00"
    maintenanceWindow: "Mon:04:00-Mon:05:00"
    # High availability
    multiAz: true
    # Performance Insights for query analysis
    performanceInsightsEnabled: true
    # Prevent accidental deletion
    deletionProtection: true
    skipFinalSnapshot: false
    finalSnapshotIdentifierPrefix: production-postgres-final
    # Auto minor version upgrades during maintenance window
    autoMinorVersionUpgrade: true
    tags:
      Environment: production
      ManagedBy: crossplane
  # Publish connection details to a secret for applications
  writeConnectionSecretsToRef:
    namespace: crossplane-system
    name: production-postgres-connection
  providerConfigRef:
    name: default
```

## Step 4: Create the Master Password Secret

```bash
# Generate a secure password
DB_PASSWORD=$(openssl rand -base64 32)

# Create the secret (use SOPS to encrypt in Git)
kubectl create secret generic rds-master-password \
  --from-literal=password="${DB_PASSWORD}" \
  --namespace crossplane-system
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/production-databases.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-databases
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/databases/production
  prune: false  # Never prune databases automatically - require explicit deletion
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane-providers-aws
  healthChecks:
    - apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      name: production-postgres
```

## Step 6: Verify RDS Provisioning

```bash
# Watch the RDS instance status (provisioning takes 5-10 minutes)
kubectl get instances.rds.aws.upbound.io production-postgres --watch

# Check the detailed status and any errors
kubectl describe instance.rds.aws.upbound.io production-postgres

# Once ready, retrieve the connection details
kubectl get secret production-postgres-connection \
  -n crossplane-system \
  -o jsonpath='{.data.endpoint}' | base64 -d
```

## Best Practices

- Set `prune: false` on Kustomizations managing databases. This prevents Flux from deleting the database if you accidentally remove the manifest.
- Always enable `deletionProtection: true` and `storageEncrypted: true` for production RDS instances.
- Use `maxAllocatedStorage` to enable storage autoscaling and avoid emergency storage capacity incidents.
- Store the RDS master password in a SOPS-encrypted secret in Git, or use External Secrets Operator to pull it from AWS Secrets Manager.
- Enable `performanceInsightsEnabled: true` and set `backupRetentionPeriod` to at least 7 days for production workloads.

## Conclusion

You have provisioned an AWS RDS PostgreSQL instance using Crossplane managed resources reconciled by Flux CD. The entire database configuration is in Git, enabling peer review of database changes, rollback to previous configurations, and consistent provisioning across environments. Crossplane continuously reconciles the RDS instance state, correcting any drift detected between the actual AWS resource and the desired state in your Git repository.
