# How to Implement CRD Validation with CEL Expressions in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, Validation, CEL

Description: Learn how to use Common Expression Language (CEL) for advanced validation rules in Custom Resource Definitions to enforce complex business logic and field dependencies.

---

OpenAPI schema validation gets you type checking and basic constraints. But what happens when you need validation rules like "if field A is set, field B must also be set" or "the sum of these three fields cannot exceed 100"? Traditional schema validation can't express these relationships.

Common Expression Language (CEL) support in Kubernetes CRDs solves this problem. CEL lets you write validation rules that reference multiple fields, perform calculations, and enforce complex business logic. This guide shows you how to use CEL to build robust validation into your CRDs.

## Understanding CEL Validation

CEL is a simple expression language designed for fast, safe evaluation. It's sandboxed, deterministic, and prevents infinite loops or resource exhaustion. Kubernetes uses CEL for admission control and CRD validation.

CEL validation rules run during admission. If an expression evaluates to false, the API server rejects the request with a custom error message. This happens before any controller code runs, catching errors immediately.

## Basic CEL Validation Rules

Let's start with simple validation rules to understand the syntax.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: deployments.example.com
spec:
  group: example.com
  names:
    kind: Deployment
    plural: deployments
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
              minReplicas:
                type: integer
                minimum: 1
              maxReplicas:
                type: integer
                minimum: 1
              targetReplicas:
                type: integer
                minimum: 1
            x-kubernetes-validations:
            - rule: "self.maxReplicas >= self.minReplicas"
              message: "maxReplicas must be greater than or equal to minReplicas"
            - rule: "self.targetReplicas >= self.minReplicas && self.targetReplicas <= self.maxReplicas"
              message: "targetReplicas must be between minReplicas and maxReplicas"
```

The `self` keyword refers to the object being validated. In this case, `self` is the spec object, so `self.maxReplicas` accesses the maxReplicas field.

## Field Dependency Validation

One of the most common use cases is validating that certain fields are set together.

```yaml
spec:
  versions:
  - name: v1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              type:
                type: string
                enum:
                - basic
                - advanced
              advancedConfig:
                type: object
                properties:
                  algorithm:
                    type: string
                  parameters:
                    type: object
            x-kubernetes-validations:
            - rule: "self.type != 'advanced' || has(self.advancedConfig)"
              message: "advancedConfig is required when type is 'advanced'"
            - rule: "self.type != 'basic' || !has(self.advancedConfig)"
              message: "advancedConfig should not be set when type is 'basic'"
```

The `has()` function checks if a field exists. The `||` operator creates conditional logic.

## Validating Mutually Exclusive Fields

Some configurations should be mutually exclusive. You want exactly one field set, not multiple.

```yaml
properties:
  spec:
    type: object
    properties:
      source:
        type: object
        properties:
          git:
            type: object
            properties:
              repository:
                type: string
              branch:
                type: string
          s3:
            type: object
            properties:
              bucket:
                type: string
              key:
                type: string
          http:
            type: object
            properties:
              url:
                type: string
        x-kubernetes-validations:
        - rule: "(has(self.git) ? 1 : 0) + (has(self.s3) ? 1 : 0) + (has(self.http) ? 1 : 0) == 1"
          message: "exactly one of git, s3, or http must be specified"
```

This uses the ternary operator to count how many fields are set and enforces that exactly one is present.

## String Pattern Matching and Manipulation

CEL provides string functions for advanced validation.

```yaml
properties:
  spec:
    type: object
    properties:
      name:
        type: string
      email:
        type: string
      environment:
        type: string
        enum:
        - dev
        - staging
        - prod
      dnsName:
        type: string
    x-kubernetes-validations:
    - rule: "self.email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$')"
      message: "email must be a valid email address"
    - rule: "self.dnsName.matches('^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$')"
      message: "dnsName must be a valid DNS name"
    - rule: "self.environment == 'prod' ? self.name.startsWith('prod-') : true"
      message: "production resources must have names starting with 'prod-'"
    - rule: "!self.name.contains('test') || self.environment == 'dev'"
      message: "resources with 'test' in the name can only be deployed to dev environment"
```

String methods like `matches()`, `startsWith()`, `endsWith()`, and `contains()` enable rich text validation.

## Array and List Validation

Validate array contents and relationships between array elements.

```yaml
properties:
  spec:
    type: object
    properties:
      ports:
        type: array
        items:
          type: object
          properties:
            name:
              type: string
            port:
              type: integer
            protocol:
              type: string
              enum:
              - TCP
              - UDP
        x-kubernetes-validations:
        - rule: "self.all(p, p.port >= 1 && p.port <= 65535)"
          message: "all port numbers must be between 1 and 65535"
        - rule: "self.all(i, self.filter(p, p.name == self[i].name).size() == 1)"
          message: "port names must be unique"
        - rule: "self.exists(p, p.protocol == 'TCP')"
          message: "at least one port must use TCP protocol"
        - rule: "self.size() <= 20"
          message: "maximum of 20 ports allowed"
```

The `all()` function checks that a condition holds for every element. The `exists()` function checks that at least one element matches. The `filter()` function creates a subset based on a condition.

## Numeric Calculations and Constraints

Perform arithmetic and validate calculated values.

```yaml
properties:
  spec:
    type: object
    properties:
      cpu:
        type: string
      memory:
        type: string
      storage:
        type: string
      resourceQuota:
        type: object
        properties:
          cpuLimit:
            type: integer
          memoryLimitMb:
            type: integer
          storageLimitGb:
            type: integer
    x-kubernetes-validations:
    - rule: "int(self.cpu.replace('m', '')) <= self.resourceQuota.cpuLimit"
      message: "CPU request exceeds quota limit"
    - rule: |
        int(self.memory.replace('Mi', '').replace('Gi', '')) *
        (self.memory.contains('Gi') ? 1024 : 1) <=
        self.resourceQuota.memoryLimitMb
      message: "Memory request exceeds quota limit"
```

CEL supports arithmetic operators and type conversions for numeric validation.

## Cross-Field Validation with Nested Objects

Validate relationships between deeply nested fields.

```yaml
properties:
  spec:
    type: object
    properties:
      database:
        type: object
        properties:
          type:
            type: string
            enum:
            - postgres
            - mysql
          connection:
            type: object
            properties:
              host:
                type: string
              port:
                type: integer
              ssl:
                type: boolean
              credentials:
                type: object
                properties:
                  username:
                    type: string
                  passwordSecret:
                    type: string
        x-kubernetes-validations:
        - rule: "self.connection.ssl || self.type == 'mysql'"
          message: "SSL must be enabled for PostgreSQL connections"
        - rule: "self.connection.port == (self.type == 'postgres' ? 5432 : 3306) || self.connection.port > 10000"
          message: "non-standard ports must be above 10000"
        - rule: "has(self.connection.credentials.passwordSecret)"
          message: "credentials.passwordSecret is required"
```

You can traverse the entire object graph to validate complex relationships.

## Transition Rules for Update Validation

CEL can validate not just the current state but also transitions between states.

```yaml
properties:
  spec:
    type: object
    properties:
      version:
        type: string
      replicas:
        type: integer
      immutableField:
        type: string
    x-kubernetes-validations:
    - rule: "!has(oldSelf) || self.immutableField == oldSelf.immutableField"
      message: "immutableField cannot be changed after creation"
    - rule: "!has(oldSelf) || self.version >= oldSelf.version"
      message: "version can only be increased"
    - rule: "!has(oldSelf) || abs(self.replicas - oldSelf.replicas) <= 5"
      message: "replicas can only change by a maximum of 5 at a time"
```

The `oldSelf` keyword refers to the previous version of the object. This enables validation of how fields change over time.

## Validating Based on Metadata

You can access metadata fields in validation rules.

```yaml
x-kubernetes-validations:
- rule: "self.namespace != 'kube-system' || self.metadata.labels.exists(k, k == 'critical')"
  message: "resources in kube-system must have a 'critical' label"
- rule: "!self.metadata.name.startsWith('temp-') || has(self.metadata.annotations['expires-at'])"
  message: "temporary resources must have an expires-at annotation"
```

This allows validation based on resource name, namespace, labels, and annotations.

## Performance Considerations

CEL validation has cost limits to prevent expensive operations. Complex rules with nested iterations can hit these limits.

```yaml
# Good - simple and fast
- rule: "self.items.size() <= 100"
  message: "maximum 100 items allowed"

# Bad - nested iteration can be expensive
- rule: "self.items.all(i, self.items.all(j, i.id != j.id || i == j))"
  message: "all items must have unique IDs"

# Better - use a map for uniqueness checking
- rule: "self.items.map(i, i.id).unique().size() == self.items.size()"
  message: "all items must have unique IDs"
```

Keep validation rules focused and avoid unnecessary complexity.

## Testing CEL Validation

Test your validation rules with both valid and invalid resources.

```bash
# Create a CRD with CEL validation
kubectl apply -f deployment-crd.yaml

# Test valid resource
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Deployment
metadata:
  name: valid-deployment
spec:
  minReplicas: 2
  maxReplicas: 10
  targetReplicas: 5
EOF

# Test invalid resource (targetReplicas too high)
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Deployment
metadata:
  name: invalid-deployment
spec:
  minReplicas: 2
  maxReplicas: 10
  targetReplicas: 15
EOF
```

The second command should fail with your custom error message.

## Common CEL Functions

Here are the most useful CEL functions for CRD validation.

```yaml
# String functions
- rule: "self.name.matches('^[a-z]+$')"
- rule: "self.url.startsWith('https://')"
- rule: "self.email.contains('@')"
- rule: "self.tag.endsWith('-stable')"

# Numeric functions
- rule: "int(self.percentage) >= 0 && int(self.percentage) <= 100"
- rule: "double(self.ratio) >= 0.0 && double(self.ratio) <= 1.0"

# Collection functions
- rule: "self.items.size() > 0"
- rule: "self.tags.all(t, t.matches('^[a-z]+$'))"
- rule: "self.ports.exists(p, p.name == 'http')"
- rule: "self.names.filter(n, n.startsWith('prod-')).size() > 0"

# Existence checks
- rule: "has(self.config)"
- rule: "has(self.metadata.labels['app'])"

# Type checks
- rule: "type(self.value) == int"
- rule: "type(self.config) == map"
```

## Conclusion

CEL validation transforms CRDs from simple schema validators into intelligent gatekeepers that enforce complex business rules. The validation happens at admission time, before controllers run, providing immediate feedback to users.

Start with basic cross-field validation to ensure related fields are set together. Add transition rules to protect critical fields from modification. Use string functions to validate formats beyond what regex can express. Test your validation rules thoroughly with both valid and invalid inputs.

CEL gives you the power to encode domain knowledge directly into your CRD definition, reducing the validation burden on your controllers and catching configuration errors before they cause runtime problems.
