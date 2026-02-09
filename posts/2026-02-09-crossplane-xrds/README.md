# How to Implement Crossplane CompositeResourceDefinitions (XRDs)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Platform Engineering

Description: Learn how to create Crossplane CompositeResourceDefinitions (XRDs) to define custom API schemas for platform infrastructure and enable self-service provisioning with type-safe specifications.

---

CompositeResourceDefinitions (XRDs) are Custom Resource Definitions for your platform APIs. While CRDs define Kubernetes resources, XRDs define the resources your platform offers. An XRD might define a "Database" resource where users specify simple parameters like size and version, while Compositions handle the complex implementation details of creating RDS instances, security groups, and networking.

XRDs give your platform a clean API surface. Application teams interact with XRDs, platform teams implement them with Compositions. This separation enables platform evolution without breaking consumers.

## Understanding XRD Structure

An XRD consists of three main components:

**Group and Version**: The API group and version (like database.example.com/v1alpha1)
**Names**: The kind name and plural form
**Schema**: OpenAPI v3 schema defining the resource structure

XRDs create two resource types: the Composite Resource (XR) and the Claim. The XR is cluster-scoped, while Claims are namespace-scoped.

## Creating a Basic XRD

Define a simple PostgreSQL database resource:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresqlinstances.database.example.com
spec:
  group: database.example.com
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  claimNames:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
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
              parameters:
                type: object
                properties:
                  storageGB:
                    type: integer
                    minimum: 20
                    maximum: 1000
                  version:
                    type: string
                    enum:
                    - "13.7"
                    - "14.7"
                    - "15.2"
                required:
                - storageGB
            required:
            - parameters
```

This XRD creates two resources:
- XPostgreSQLInstance (cluster-scoped composite resource)
- PostgreSQLInstance (namespace-scoped claim)

## Defining Complex Schemas

Create comprehensive schemas with nested structures:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xapplications.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XApplication
    plural: xapplications
  claimNames:
    kind: Application
    plural: applications
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
              parameters:
                type: object
                properties:
                  environment:
                    type: string
                    enum:
                    - development
                    - staging
                    - production
                  database:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                        default: true
                      engine:
                        type: string
                        enum:
                        - postgres
                        - mysql
                      version:
                        type: string
                      storageGB:
                        type: integer
                        minimum: 20
                      backupRetentionDays:
                        type: integer
                        minimum: 1
                        maximum: 35
                        default: 7
                  cache:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                        default: false
                      type:
                        type: string
                        enum:
                        - redis
                        - memcached
                      nodeType:
                        type: string
                  storage:
                    type: object
                    properties:
                      enabled:
                        type: boolean
                        default: true
                      sizeGB:
                        type: integer
                        minimum: 10
                required:
                - environment
            required:
            - parameters
```

This comprehensive XRD defines an application platform with optional database, cache, and storage components.

## Using Default Values

Provide sensible defaults to simplify user experience:

```yaml
schema:
  openAPIV3Schema:
    type: object
    properties:
      spec:
        type: object
        properties:
          parameters:
            type: object
            properties:
              size:
                type: string
                enum:
                - small
                - medium
                - large
                default: small
              highAvailability:
                type: boolean
                default: false
              backupEnabled:
                type: boolean
                default: true
              backupRetentionDays:
                type: integer
                default: 7
                minimum: 1
                maximum: 35
```

Users can omit fields with defaults, getting production-ready configurations with minimal input.

## Implementing Status Subresources

Add status fields to track resource state:

```yaml
schema:
  openAPIV3Schema:
    type: object
    properties:
      spec:
        # ... spec definition
      status:
        type: object
        properties:
          databaseEndpoint:
            type: string
          databasePort:
            type: integer
          ready:
            type: boolean
          conditions:
            type: array
            items:
              type: object
              properties:
                type:
                  type: string
                status:
                  type: string
                lastTransitionTime:
                  type: string
                  format: date-time
                reason:
                  type: string
                message:
                  type: string
```

Status fields provide visibility into resource provisioning state.

## Adding Connection Secret Configuration

Define how connection secrets should be created:

```yaml
spec:
  group: database.example.com
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  claimNames:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
  connectionSecretKeys:
  - username
  - password
  - endpoint
  - port
  - database
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
              writeConnectionSecretToRef:
                type: object
                properties:
                  name:
                    type: string
                  namespace:
                    type: string
                required:
                - name
```

This ensures connection secrets contain the specified keys and can be created in user-specified locations.

## Creating Multi-Version XRDs

Support multiple API versions:

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
    referenceable: false
    deprecated: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              size:
                type: string
  - name: v1beta1
    served: true
    referenceable: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              parameters:
                type: object
                properties:
                  instanceClass:
                    type: string
                  storageGB:
                    type: integer
```

This allows gradual API evolution while maintaining backward compatibility.

## Implementing Composition Selection

Enable composition selection through labels:

```yaml
spec:
  group: database.example.com
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  claimNames:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
  defaultCompositionRef:
    name: postgres-production
  enforcedCompositionRef:
    name: postgres-production
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
              compositionSelector:
                type: object
                properties:
                  matchLabels:
                    type: object
                    additionalProperties:
                      type: string
```

Users can select specific Compositions through labels, or the platform can enforce a specific Composition.

## Validating Field Values

Add validation rules to XRD schemas:

```yaml
properties:
  storageGB:
    type: integer
    minimum: 20
    maximum: 1000
    multipleOf: 10
  databaseName:
    type: string
    pattern: '^[a-z][a-z0-9-]{2,62}$'
    minLength: 3
    maxLength: 63
  tags:
    type: object
    additionalProperties:
      type: string
    maxProperties: 50
  replicaCount:
    type: integer
    minimum: 1
    maximum: 10
```

Kubernetes validates these constraints before resources are created.

## Using Printer Columns

Define which fields appear in kubectl output:

```yaml
versions:
- name: v1alpha1
  served: true
  referenceable: true
  additionalPrinterColumns:
  - name: Ready
    type: string
    jsonPath: .status.conditions[?(@.type=='Ready')].status
  - name: Environment
    type: string
    jsonPath: .spec.parameters.environment
  - name: Size
    type: string
    jsonPath: .spec.parameters.size
  - name: Age
    type: date
    jsonPath: .metadata.creationTimestamp
  schema:
    # ... schema definition
```

This makes kubectl get output more useful:

```bash
kubectl get databases
# NAME        READY   ENVIRONMENT   SIZE     AGE
# myapp-db    True    production    medium   5d
```

## Documenting XRDs

Add descriptions for better usability:

```yaml
schema:
  openAPIV3Schema:
    type: object
    description: "PostgreSQL database instance"
    properties:
      spec:
        type: object
        description: "Desired state of the PostgreSQL instance"
        properties:
          parameters:
            type: object
            description: "Configuration parameters"
            properties:
              storageGB:
                type: integer
                description: "Storage size in GB (20-1000)"
                minimum: 20
                maximum: 1000
              version:
                type: string
                description: "PostgreSQL version"
                enum:
                - "14.7"
                - "15.2"
```

These descriptions appear in kubectl explain output.

## Testing XRDs

Validate XRD schemas:

```bash
# Apply XRD
kubectl apply -f xrd.yaml

# Check XRD status
kubectl get xrd

# Describe XRD for details
kubectl describe xrd xpostgresqlinstances.database.example.com

# Test with a sample claim
kubectl apply -f - <<EOF
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: test-db
  namespace: default
spec:
  parameters:
    storageGB: 50
    version: "14.7"
  writeConnectionSecretToRef:
    name: test-db-conn
EOF

# Verify claim created composite resource
kubectl get xpostgresqlinstance
```

## Conclusion

CompositeResourceDefinitions create type-safe, versioned APIs for your platform. By defining clear schemas with validation, defaults, and documentation, XRDs make infrastructure accessible to application teams while maintaining control and consistency. Combined with Compositions, XRDs enable true platform engineering where complex infrastructure is exposed through simple, intuitive interfaces.
