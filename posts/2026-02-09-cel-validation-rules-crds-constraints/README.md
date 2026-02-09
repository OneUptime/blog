# How to Write CEL Validation Rules in CRDs for Complex Field Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, Validation

Description: Master Common Expression Language validation rules in Kubernetes Custom Resource Definitions to enforce complex field constraints, improve data integrity, and reduce webhook complexity.

---

Custom Resource Definitions (CRDs) are powerful, but validating complex field constraints used to require writing admission webhooks. With Common Expression Language (CEL) validation rules, you can now express sophisticated validation logic directly in your CRD schema, eliminating the need for external webhooks in many cases.

## Why CEL Validation Matters

Before CEL validation, you had two options for validating custom resources:

1. Basic OpenAPI schema validation (type checking, required fields, enums)
2. Admission webhooks (complex validation requiring a running service)

CEL validation fills the gap between these approaches. It allows you to write expressive validation rules inline in your CRD without maintaining webhook infrastructure.

## Basic CEL Validation Syntax

CEL expressions are embedded in the CRD schema using the `x-kubernetes-validations` extension. Here is a simple example:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    kind: Database
    plural: databases
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              replicas:
                type: integer
                minimum: 1
                maximum: 100
              storageGB:
                type: integer
                minimum: 1
            # CEL validation rule
            x-kubernetes-validations:
            - rule: "self.replicas <= 5 || self.storageGB >= 100"
              message: "Databases with more than 5 replicas must have at least 100GB storage"
```

This rule ensures that if you deploy more than 5 replicas, you must provision at least 100GB of storage.

## Accessing Field Values with self

In CEL expressions, `self` refers to the current object being validated. You can access fields using dot notation:

```yaml
x-kubernetes-validations:
- rule: "self.replicas > 0"
  message: "Replicas must be positive"
- rule: "self.region in ['us-east-1', 'us-west-2', 'eu-west-1']"
  message: "Region must be one of the supported regions"
- rule: "self.name.startsWith('db-')"
  message: "Database name must start with 'db-'"
```

## Validating Relationships Between Fields

CEL shines when validating relationships between multiple fields:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: workloads.example.com
spec:
  group: example.com
  names:
    kind: Workload
    plural: workloads
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              type:
                type: string
                enum: ["development", "staging", "production"]
              enableHA:
                type: boolean
              backupEnabled:
                type: boolean
              maxMemoryGB:
                type: integer
            x-kubernetes-validations:
            - rule: "self.type != 'production' || self.enableHA == true"
              message: "Production workloads must have HA enabled"
            - rule: "self.enableHA == false || self.maxMemoryGB >= 8"
              message: "HA workloads require at least 8GB memory"
            - rule: "self.type != 'production' || self.backupEnabled == true"
              message: "Production workloads must have backups enabled"
```

These rules enforce:
- Production workloads must enable HA
- HA workloads need sufficient memory
- Production workloads must enable backups

## Validating Lists and Maps

CEL provides powerful functions for working with lists and maps:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.example.com
spec:
  group: example.com
  names:
    kind: Application
    plural: applications
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              services:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    port:
                      type: integer
              environment:
                type: object
                additionalProperties:
                  type: string
            x-kubernetes-validations:
            # Ensure all service names are unique
            - rule: "self.services.all(s1, self.services.all(s2, s1.name != s2.name || s1 == s2))"
              message: "Service names must be unique"
            # Ensure at least one service is defined
            - rule: "size(self.services) > 0"
              message: "At least one service must be defined"
            # Ensure port numbers are in valid range
            - rule: "self.services.all(s, s.port > 0 && s.port < 65536)"
              message: "Service ports must be between 1 and 65535"
            # Ensure certain environment variables are set
            - rule: "'APP_ENV' in self.environment"
              message: "APP_ENV environment variable is required"
```

## Transition Rules for Updates

CEL validation can enforce rules when resources are updated, not just created. Use `oldSelf` to reference the previous value:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    kind: Database
    plural: databases
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              storageGB:
                type: integer
                minimum: 10
              engine:
                type: string
            x-kubernetes-validations:
            # Storage can only increase, never decrease
            - rule: "!has(oldSelf.storageGB) || self.storageGB >= oldSelf.storageGB"
              message: "Storage size cannot be decreased"
            # Engine type cannot be changed after creation
            - rule: "!has(oldSelf.engine) || self.engine == oldSelf.engine"
              message: "Database engine cannot be changed after creation"
```

These transition rules prevent dangerous operations like shrinking storage or changing the database engine.

## Using CEL Functions

CEL provides many built-in functions:

```yaml
x-kubernetes-validations:
# String functions
- rule: "self.name.matches('^[a-z0-9-]+$')"
  message: "Name must contain only lowercase letters, numbers, and hyphens"
- rule: "size(self.description) <= 500"
  message: "Description cannot exceed 500 characters"

# Numeric functions
- rule: "self.cpu.matches('^[0-9]+m$') || self.cpu.matches('^[0-9]+$')"
  message: "CPU must be in millicores (e.g., 500m) or cores (e.g., 2)"

# Logical operations
- rule: "!(self.enableCache && self.enablePersistence) || self.storageClass != ''"
  message: "Persistent cache requires a storage class"

# Type checking
- rule: "type(self.timeout) == duration"
  message: "Timeout must be a duration value"
```

## Complex Example: Validating a ClusterConfig CRD

Here is a comprehensive example showing various CEL validation techniques:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: clusterconfigs.example.com
spec:
  group: example.com
  names:
    kind: ClusterConfig
    plural: clusterconfigs
  scope: Cluster
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              environment:
                type: string
                enum: ["dev", "staging", "prod"]
              nodeCount:
                type: integer
                minimum: 1
              nodePools:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    size:
                      type: string
                    minNodes:
                      type: integer
                    maxNodes:
                      type: integer
              features:
                type: object
                properties:
                  autoScaling:
                    type: boolean
                  monitoring:
                    type: boolean
                  backups:
                    type: boolean
            x-kubernetes-validations:
            # Production clusters must have at least 3 nodes
            - rule: "self.environment != 'prod' || self.nodeCount >= 3"
              message: "Production clusters must have at least 3 nodes"

            # Node pool min/max validation
            - rule: "self.nodePools.all(p, p.minNodes <= p.maxNodes)"
              message: "Node pool minNodes must be less than or equal to maxNodes"

            # Auto-scaling requires min != max
            - rule: "!self.features.autoScaling || self.nodePools.all(p, p.minNodes < p.maxNodes)"
              message: "Auto-scaling requires minNodes < maxNodes for all node pools"

            # Production must have monitoring and backups
            - rule: "self.environment != 'prod' || (self.features.monitoring && self.features.backups)"
              message: "Production clusters must enable monitoring and backups"

            # Total min nodes across pools must not exceed nodeCount
            - rule: "self.nodePools.map(p, p.minNodes).sum() <= self.nodeCount"
              message: "Sum of minimum nodes across pools cannot exceed total node count"

            # Node pool names must be unique
            - rule: "self.nodePools.all(p1, self.nodePools.all(p2, p1.name != p2.name || p1 == p2))"
              message: "Node pool names must be unique"
```

## Error Messages and User Experience

Good error messages are critical for user experience. Make your messages:

1. Descriptive: Explain what is wrong
2. Actionable: Tell users how to fix it
3. Specific: Include field names and expected values

```yaml
x-kubernetes-validations:
# Bad message
- rule: "self.replicas > 0"
  message: "Invalid"

# Good message
- rule: "self.replicas > 0"
  message: "spec.replicas must be a positive integer (got: %d)"
  messageExpression: "'spec.replicas must be a positive integer (got: ' + string(self.replicas) + ')'"
```

The `messageExpression` field allows dynamic error messages using CEL.

## Performance Considerations

CEL validation runs on every create and update operation. Keep these guidelines in mind:

1. Avoid expensive operations in validation rules
2. Use early termination with logical operators (`&&`, `||`)
3. Limit list iterations for large arrays
4. Cache complex calculations when possible

## Testing CEL Validation Rules

Test your validation rules thoroughly:

```bash
# Create a test resource that should succeed
kubectl apply -f valid-resource.yaml

# Create a test resource that should fail
kubectl apply -f invalid-resource.yaml

# You should see your custom error message
# Error from server (Invalid): error when creating "invalid-resource.yaml":
# admission webhook denied the request:
# spec.replicas must be a positive integer (got: 0)
```

## Conclusion

CEL validation rules in CRDs provide a powerful middle ground between basic schema validation and complex admission webhooks. By expressing validation logic directly in your CRD schema, you simplify your architecture, reduce operational overhead, and provide immediate feedback to users. Master these patterns to build robust, self-validating custom resources that enforce your business rules without requiring webhook infrastructure.
