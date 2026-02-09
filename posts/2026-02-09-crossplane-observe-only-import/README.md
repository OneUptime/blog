# How to Use Crossplane Observe-Only Mode for Import

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Infrastructure Import, Cloud Migration

Description: Learn how to use Crossplane's observe-only mode to import existing cloud resources without modification, enabling gradual migration to infrastructure-as-code management.

---

Your cloud account has hundreds of resources created manually or through other tools. Moving them to Crossplane risks accidental changes that could break production. Observe-only mode lets Crossplane track existing resources without managing them, providing a safe migration path.

This mode imports resources into Kubernetes as read-only representations. You can view their status, reference them in compositions, and plan migrations without risking modifications. When ready, you can switch to full management and let Crossplane take over.

## Understanding Observe-Only Mode

Crossplane supports three management policies:

**FullControl** manages the resource completely. Crossplane creates, updates, and deletes it based on your spec.

**ObserveOnly** watches the resource without modifying it. Crossplane imports its current state and keeps it synced, but never makes changes.

**OrphanOnDelete** manages the resource normally but orphans it instead of deleting it when the Kubernetes object is removed.

Observe-only mode is perfect for importing existing infrastructure. You can reference imported resources in new compositions while keeping them untouched.

## Importing an Existing Resource

Start by identifying a resource in your cloud account.

```bash
# List existing RDS instances
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,Engine,InstanceClass]'
```

Create a managed resource in observe-only mode.

```yaml
# import-existing-rds.yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: legacy-database
  annotations:
    # Specify the existing resource ID
    crossplane.io/external-name: prod-postgres-01
spec:
  # Observe without managing
  managementPolicies: ["Observe"]
  forProvider:
    region: us-west-2
    # Spec should match the existing resource
    # Crossplane won't enforce these, but they document what exists
    engine: postgres
    engineVersion: "14.7"
    instanceClass: db.r5.large
    allocatedStorage: 500
```

Apply the resource.

```bash
kubectl apply -f import-existing-rds.yaml
```

Crossplane imports the database without making any changes.

```bash
# Check the imported resource status
kubectl get instance legacy-database -o yaml
```

The status reflects the actual state of the RDS instance in AWS.

## Importing Multiple Resources

Import an entire application stack.

```bash
# List resources by tag
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Application,Values=legacy-app \
  --output json
```

Create managed resources for each component.

```yaml
# import-app-stack.yaml
---
# Import the database
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: legacy-app-db
  annotations:
    crossplane.io/external-name: legacy-app-postgres
spec:
  managementPolicies: ["Observe"]
  forProvider:
    region: us-west-2
    engine: postgres
    engineVersion: "14.7"
    instanceClass: db.r5.xlarge
    allocatedStorage: 1000
---
# Import the S3 bucket
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: legacy-app-storage
  annotations:
    crossplane.io/external-name: legacy-app-uploads-prod
spec:
  managementPolicies: ["Observe"]
  forProvider:
    region: us-west-2
---
# Import the load balancer
apiVersion: elbv2.aws.upbound.io/v1beta1
kind: LB
metadata:
  name: legacy-app-lb
  annotations:
    crossplane.io/external-name: legacy-app-alb
spec:
  managementPolicies: ["Observe"]
  forProvider:
    region: us-west-2
    loadBalancerType: application
```

Apply all imports.

```bash
kubectl apply -f import-app-stack.yaml
```

## Referencing Imported Resources

Use imported resources in compositions for new infrastructure.

```yaml
# composition-with-imported-db.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: application-with-legacy-db
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Application
  resources:
    # New application deployment
    - name: app-deployment
      base:
        apiVersion: kubernetes.crossplane.io/v1alpha2
        kind: Object
        spec:
          forProvider:
            manifest:
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: myapp
              spec:
                replicas: 3
      patches:
        # Reference the imported database
        - type: FromCompositeFieldPath
          fromFieldPath: status.importedDb.endpoint
          toFieldPath: spec.forProvider.manifest.spec.template.spec.containers[0].env[0].value
          policy:
            fromFieldPath: Required

    # Cache (new resource under full management)
    - name: redis-cache
      base:
        apiVersion: cache.aws.upbound.io/v1beta1
        kind: Cluster
        spec:
          forProvider:
            region: us-west-2
            cacheNodeType: cache.t3.micro
            engine: redis
            numCacheNodes: 1
```

The composition creates new resources while referencing the imported database.

## Gradual Migration to Full Management

When ready, transition from observe-only to full management.

```yaml
# migrate-to-full-management.yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: legacy-database
  annotations:
    crossplane.io/external-name: prod-postgres-01
spec:
  # Remove ObserveOnly, add full management
  managementPolicies: ["*"]
  forProvider:
    region: us-west-2
    engine: postgres
    engineVersion: "14.7"
    instanceClass: db.r5.large
    allocatedStorage: 500
    # Now Crossplane will enforce these settings
    backupRetentionPeriod: 7
    multiAz: true
    storageEncrypted: true
```

Apply the change.

```bash
kubectl apply -f migrate-to-full-management.yaml
```

Crossplane compares the desired state with actual state. If they differ, it updates the resource to match your spec.

## Importing with Automatic Discovery

Use a script to discover and import resources automatically.

```bash
#!/bin/bash
# import-rds-instances.sh

# Get all RDS instances
instances=$(aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,Engine,EngineVersion,DBInstanceClass,AllocatedStorage]' --output json)

# Generate manifests for each instance
echo "$instances" | jq -c '.[]' | while read -r instance; do
  identifier=$(echo "$instance" | jq -r '.[0]')
  engine=$(echo "$instance" | jq -r '.[1]')
  version=$(echo "$instance" | jq -r '.[2]')
  class=$(echo "$instance" | jq -r '.[3]')
  storage=$(echo "$instance" | jq -r '.[4]')

  cat <<EOF > "import-${identifier}.yaml"
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: imported-${identifier}
  annotations:
    crossplane.io/external-name: ${identifier}
spec:
  managementPolicies: ["Observe"]
  forProvider:
    region: us-west-2
    engine: ${engine}
    engineVersion: "${version}"
    instanceClass: ${class}
    allocatedStorage: ${storage}
EOF

  kubectl apply -f "import-${identifier}.yaml"
done
```

Run the script to import all RDS instances.

```bash
chmod +x import-rds-instances.sh
./import-rds-instances.sh
```

## Observe-Only with Status Monitoring

Monitor imported resources for changes.

```yaml
# prometheus-rules-imported.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: crossplane-imported-resources
  namespace: monitoring
data:
  rules.yaml: |
    groups:
      - name: crossplane-imports
        rules:
          # Alert when imported resource drifts
          - alert: ImportedResourceDrift
            expr: |
              crossplane_managed_resource_condition{
                type="Synced",
                status="False",
                management_policy="Observe"
              } > 0
            for: 15m
            labels:
              severity: warning
            annotations:
              summary: "Imported resource out of sync"
              description: "Resource {{ $labels.name }} has drifted from expected state"

          # Track number of imported resources
          - record: crossplane_imported_resources_total
            expr: |
              count(crossplane_managed_resource_info{management_policy="Observe"})
```

Check imported resource health.

```bash
# List all imported resources
kubectl get managed -l crossplane.io/management-policy=Observe

# Check sync status
kubectl get managed -l crossplane.io/management-policy=Observe -o custom-columns=\
NAME:.metadata.name,\
READY:.status.conditions[?(@.type=='Ready')].status,\
SYNCED:.status.conditions[?(@.type=='Synced')].status
```

## Selective Management Policies

Mix observe-only and full management in compositions.

```yaml
# composition-hybrid-management.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: hybrid-app-stack
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: ApplicationStack
  resources:
    # Imported legacy database (observe only)
    - name: legacy-db
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        metadata:
          annotations:
            crossplane.io/external-name: legacy-prod-db
        spec:
          managementPolicies: ["Observe"]
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "14.7"

    # New cache (fully managed)
    - name: cache
      base:
        apiVersion: cache.aws.upbound.io/v1beta1
        kind: Cluster
        spec:
          managementPolicies: ["*"]
          forProvider:
            region: us-west-2
            cacheNodeType: cache.t3.micro
            engine: redis

    # New storage (fully managed)
    - name: storage
      base:
        apiVersion: s3.aws.upbound.io/v1beta1
        kind: Bucket
        spec:
          managementPolicies: ["*"]
          forProvider:
            region: us-west-2
```

New components get full management. Legacy components stay in observe mode.

## Importing Resources with Dependencies

Handle resources that reference each other.

```yaml
# import-with-dependencies.yaml
---
# Import VPC first
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: legacy-vpc
  annotations:
    crossplane.io/external-name: vpc-12345678
spec:
  managementPolicies: ["Observe"]
  forProvider:
    region: us-west-2
    cidrBlock: "10.0.0.0/16"
---
# Import subnet that references VPC
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: legacy-subnet-a
  annotations:
    crossplane.io/external-name: subnet-abc12345
spec:
  managementPolicies: ["Observe"]
  forProvider:
    region: us-west-2
    availabilityZone: us-west-2a
    cidrBlock: "10.0.1.0/24"
    # Reference the imported VPC
    vpcIdRef:
      name: legacy-vpc
---
# Import database in the subnet
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: legacy-db
  annotations:
    crossplane.io/external-name: legacy-prod-postgres
spec:
  managementPolicies: ["Observe"]
  forProvider:
    region: us-west-2
    engine: postgres
    engineVersion: "14.7"
    instanceClass: db.r5.large
    # Reference imported subnet group
    dbSubnetGroupNameRef:
      name: legacy-subnet-group
```

Import resources in dependency order: VPC, then subnets, then databases.

## Generating Import Manifests from State

Create import manifests from existing Terraform state.

```bash
# Extract resource IDs from Terraform state
terraform state list | while read -r resource; do
  # Get resource details
  terraform state show "$resource" -json > /tmp/resource.json

  # Generate Crossplane manifest
  # (Simplified example, real implementation needs type mapping)
  resource_type=$(jq -r '.type' /tmp/resource.json)
  resource_id=$(jq -r '.values.id' /tmp/resource.json)

  # Map to Crossplane resource type
  # Generate manifest with managementPolicies: ["Observe"]
done
```

## Validation Before Full Management

Validate that observed state matches desired state before taking over management.

```bash
#!/bin/bash
# validate-import.sh

resource_name=$1

# Get observed state
observed=$(kubectl get instance "$resource_name" -o json | jq '.status.atProvider')

# Get desired state
desired=$(kubectl get instance "$resource_name" -o json | jq '.spec.forProvider')

# Compare critical fields
engine_match=$(jq -n --argjson obs "$observed" --argjson des "$desired" '$obs.engine == $des.engine')
class_match=$(jq -n --argjson obs "$observed" --argjson des "$desired" '$obs.instanceClass == $des.instanceClass')

if [ "$engine_match" = "true" ] && [ "$class_match" = "true" ]; then
  echo "Resource $resource_name ready for full management"
  exit 0
else
  echo "Resource $resource_name has drift, review before taking control"
  exit 1
fi
```

Run validation before switching to full management.

```bash
./validate-import.sh legacy-database
```

## Removing Imported Resources

When you no longer need to observe a resource, remove the managed resource object.

```bash
# Delete the Crossplane resource
kubectl delete instance legacy-database
```

The actual cloud resource remains untouched. Crossplane just stops tracking it.

## Summary

Crossplane's observe-only mode safely imports existing cloud resources without modifying them. Set managementPolicies to ["Observe"] to track resources without taking control. Reference imported resources in compositions while keeping them unchanged.

Use observe mode to gradually migrate infrastructure to Crossplane management. Import resources, validate their configuration, and switch to full management when ready. This approach minimizes risk when adopting infrastructure-as-code for existing environments.

Observe-only mode bridges the gap between manual infrastructure and automated management. You can start tracking resources immediately without disrupting production, then gradually transition to full Crossplane control as your confidence grows.
