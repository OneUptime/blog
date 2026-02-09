# How to Use Crossplane Claims for Self-Service Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Self-Service

Description: Learn how to use Crossplane Claims to enable self-service infrastructure provisioning, allowing application teams to request resources through simple namespace-scoped APIs without platform team intervention.

---

Claims bring self-service infrastructure to Kubernetes. Instead of filing tickets with the platform team for a database, application teams create a Kubernetes manifest in their namespace and get infrastructure automatically provisioned. Claims are namespace-scoped resources that create cluster-scoped composite resources, which Compositions then implement as actual cloud infrastructure.

The claim model separates concerns perfectly - application teams work in their namespaces with simple APIs, while platform teams control implementation through Compositions and enforce governance through RBAC and policies.

## Understanding the Claim Workflow

The claim workflow has four steps:

1. Platform team creates XRD defining the resource API
2. Platform team creates Compositions implementing the XRD
3. Application team creates a Claim in their namespace
4. Crossplane creates a Composite Resource and provisions infrastructure

Claims provide the namespace-scoped entry point to infrastructure, while Composite Resources handle the cluster-level orchestration.

## Creating Your First Claim

After defining an XRD and Composition for PostgreSQL databases, application teams can create claims:

```yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: myapp-db
  namespace: team-a
spec:
  parameters:
    storageGB: 100
    version: "14.7"
    instanceClass: medium
    highAvailability: true
  writeConnectionSecretToRef:
    name: myapp-db-conn
```

This claim creates a PostgreSQL database in the team-a namespace. The platform handles networking, security, backups, and all other implementation details.

## Configuring Connection Secrets

Claims create connection secrets in the claim's namespace:

```yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: api-database
  namespace: production
spec:
  parameters:
    storageGB: 200
    version: "15.2"
  writeConnectionSecretToRef:
    name: api-db-credentials
```

After provisioning completes, a secret appears:

```bash
kubectl get secret api-db-credentials -n production

# Secret contains:
# - username
# - password
# - endpoint
# - port
# - database
```

Application pods consume this secret:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: api
        image: api-server:latest
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: api-db-credentials
              key: endpoint
        - name: DB_PORT
          valueFrom:
            secretKeyRef:
              name: api-db-credentials
              key: port
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: api-db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: api-db-credentials
              key: password
```

## Selecting Compositions

Choose specific Compositions using labels:

```yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: staging-db
  namespace: team-b
spec:
  compositionSelector:
    matchLabels:
      environment: staging
  parameters:
    storageGB: 50
    version: "14.7"
```

The platform can offer multiple Composition implementations (development, staging, production) and let teams select the appropriate one.

## Implementing Resource Lifecycle Management

Claims support standard Kubernetes lifecycle operations:

```bash
# Create claim
kubectl apply -f database-claim.yaml

# Check claim status
kubectl get postgresqlinstance myapp-db -n team-a

# Describe for detailed status
kubectl describe postgresqlinstance myapp-db -n team-a

# Update claim
kubectl edit postgresqlinstance myapp-db -n team-a

# Delete claim (also deletes infrastructure)
kubectl delete postgresqlinstance myapp-db -n team-a
```

Deletion policies control whether cloud resources are deleted or orphaned when claims are deleted.

## Creating Claims with GitOps

Store claims in Git for infrastructure as code:

```yaml
# infrastructure/database.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: production-db
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  parameters:
    storageGB: 500
    version: "15.2"
    instanceClass: large
    highAvailability: true
  writeConnectionSecretToRef:
    name: production-db-conn
```

ArgoCD or Flux deploy claims alongside applications, ensuring infrastructure exists before apps start.

## Using Claims with Namespaced Resource Quotas

Control claim creation with Kubernetes quotas:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: infra-quota
  namespace: team-a
spec:
  hard:
    count/postgresqlinstances.database.example.com: "3"
    count/s3buckets.storage.example.com: "10"
```

This limits team-a to 3 database instances and 10 S3 buckets.

## Implementing Claim Templates

Create claim templates for common patterns:

```yaml
# templates/postgres-small.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: REPLACE_WITH_NAME
  namespace: REPLACE_WITH_NAMESPACE
spec:
  parameters:
    storageGB: 20
    version: "14.7"
    instanceClass: small
  writeConnectionSecretToRef:
    name: REPLACE_WITH_NAME-conn
```

Teams copy and customize templates, reducing errors.

## Using Claims for Multi-Component Applications

Provision all application infrastructure together:

```yaml
# Application database
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: myapp-db
  namespace: myapp
  labels:
    app: myapp
spec:
  parameters:
    storageGB: 100
    version: "14.7"
  writeConnectionSecretToRef:
    name: myapp-db-conn
---
# Application cache
apiVersion: cache.example.com/v1alpha1
kind: RedisCluster
metadata:
  name: myapp-cache
  namespace: myapp
  labels:
    app: myapp
spec:
  parameters:
    nodeType: cache.t3.micro
    numNodes: 2
  writeConnectionSecretToRef:
    name: myapp-cache-conn
---
# Application storage
apiVersion: storage.example.com/v1alpha1
kind: S3Bucket
metadata:
  name: myapp-uploads
  namespace: myapp
  labels:
    app: myapp
spec:
  parameters:
    region: us-west-2
  writeConnectionSecretToRef:
    name: myapp-uploads-conn
```

All infrastructure provisions together, with connection details available as secrets.

## Monitoring Claim Status

Track claim readiness:

```bash
# Check if claim is ready
kubectl get postgresqlinstance myapp-db -n myapp -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

# Wait for claim to be ready
kubectl wait --for=condition=Ready \
  postgresqlinstance/myapp-db \
  -n myapp \
  --timeout=600s
```

Integrate into CI/CD pipelines:

```yaml
# .gitlab-ci.yml
provision-infrastructure:
  script:
    - kubectl apply -f infrastructure/
    - kubectl wait --for=condition=Ready postgresqlinstance/myapp-db -n myapp --timeout=600s
    - echo "Infrastructure ready"

deploy-application:
  needs: [provision-infrastructure]
  script:
    - kubectl apply -f app/
```

## Implementing Claim Validation

Add admission webhooks for custom validation:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: validate-claims
webhooks:
- name: database-claims.example.com
  rules:
  - apiGroups: ["database.example.com"]
    apiVersions: ["v1alpha1"]
    operations: ["CREATE", "UPDATE"]
    resources: ["postgresqlinstances"]
  clientConfig:
    service:
      name: claim-validator
      namespace: crossplane-system
      path: /validate
```

Validate claim parameters against organizational policies before creation.

## Using Claims with External Secrets Operator

Sync claim connection secrets to external secret stores:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-db-secret
  namespace: myapp
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault
    kind: SecretStore
  target:
    name: myapp-db-external
  dataFrom:
  - extract:
      key: secret/data/myapp-db-conn
```

This synchronizes Crossplane-generated secrets to Vault or other secret managers.

## Creating Custom Status Conditions

Surface resource status through claim conditions:

```bash
# Check all conditions
kubectl get postgresqlinstance myapp-db -n myapp -o jsonpath='{.status.conditions[*].type}'

# Check specific condition
kubectl get postgresqlinstance myapp-db -n myapp -o jsonpath='{.status.conditions[?(@.type=="DatabaseReady")].status}'
```

Compositions populate status conditions based on managed resource state.

## Implementing Claim Cleanup Policies

Control resource deletion behavior:

```yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: temporary-db
  namespace: testing
spec:
  deletionPolicy: Delete  # Options: Delete, Orphan
  parameters:
    storageGB: 20
  writeConnectionSecretToRef:
    name: temporary-db-conn
```

`Delete` removes cloud resources when claim is deleted. `Orphan` keeps them.

## Conclusion

Claims enable true self-service infrastructure provisioning in Kubernetes. By providing namespace-scoped APIs backed by platform-controlled Compositions, teams can provision databases, storage, caches, and networks on-demand without platform team intervention. Combined with RBAC, quotas, and GitOps, claims create a scalable, secure, and auditable infrastructure provisioning system that accelerates development velocity while maintaining platform control.
