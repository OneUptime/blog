# How to Create CRDs with Structural Schema Validation in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, Schema Validation

Description: Learn how to create Custom Resource Definitions with structural schema validation in Kubernetes to ensure data integrity and type safety for your custom resources.

---

Custom Resource Definitions (CRDs) are the foundation for extending Kubernetes functionality. But creating a CRD without proper schema validation is like building a house without blueprints. You might get something standing, but it probably won't hold up under pressure.

Structural schema validation ensures that your custom resources maintain data integrity and follow predictable patterns. This guide walks you through creating CRDs with robust validation schemas that catch errors before they cause problems in your cluster.

## Understanding Structural Schemas

Kubernetes introduced structural schemas as a requirement for CRDs in version 1.16. A structural schema is an OpenAPI v3 schema that follows specific rules to ensure the API server can efficiently process and validate your custom resources.

The key requirement is that every field in your schema must have a defined type. No wildcards, no loose definitions. This strictness pays dividends when you're debugging issues at 2 AM.

## Creating a Basic CRD with Schema Validation

Let's start with a practical example. We'll create a CRD for managing application deployments with validation rules that prevent common configuration mistakes.

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
    singular: application
    shortNames:
    - app
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
            required:
            - replicas
            - image
            properties:
              replicas:
                type: integer
                minimum: 1
                maximum: 100
                description: Number of pod replicas
              image:
                type: string
                pattern: '^[a-z0-9]+([\.\-][a-z0-9]+)*(/[a-z0-9]+([\.\-][a-z0-9]+)*)*:[a-z0-9]+([\.\-][a-z0-9]+)*$'
                description: Container image in registry/name:tag format
              resources:
                type: object
                properties:
                  memory:
                    type: string
                    pattern: '^[0-9]+[MG]i$'
                  cpu:
                    type: string
                    pattern: '^[0-9]+m?$'
              env:
                type: array
                items:
                  type: object
                  required:
                  - name
                  - value
                  properties:
                    name:
                      type: string
                      pattern: '^[A-Z_][A-Z0-9_]*$'
                    value:
                      type: string
          status:
            type: object
            properties:
              phase:
                type: string
                enum:
                - Pending
                - Running
                - Failed
              readyReplicas:
                type: integer
                minimum: 0
```

This schema enforces several validation rules. The replicas field must be between 1 and 100. The image field must match a specific pattern for container images. Environment variable names must follow shell variable naming conventions.

## Adding Complex Validation Rules

Regex patterns are powerful for string validation. Here's how to validate different common fields.

```yaml
properties:
  email:
    type: string
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
  url:
    type: string
    pattern: '^https?://[^\s]+$'
  semver:
    type: string
    pattern: '^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$'
  cronSchedule:
    type: string
    pattern: '^(\*|([0-9]|[1-5][0-9])|\*/[0-9]+) (\*|([0-9]|1[0-9]|2[0-3])|\*/[0-9]+) (\*|([1-9]|[12][0-9]|3[01])|\*/[0-9]+) (\*|([1-9]|1[0-2])|\*/[0-9]+) (\*|[0-6]|\*/[0-9]+)$'
```

These patterns validate email addresses, URLs, semantic versions, and cron schedules. Catching format errors at the CRD level prevents invalid data from entering your system.

## Working with Nested Objects and Arrays

Real-world applications often need nested data structures. Here's how to validate them properly.

```yaml
properties:
  database:
    type: object
    required:
    - type
    - connection
    properties:
      type:
        type: string
        enum:
        - postgres
        - mysql
        - mongodb
      connection:
        type: object
        required:
        - host
        - port
        properties:
          host:
            type: string
          port:
            type: integer
            minimum: 1
            maximum: 65535
          database:
            type: string
          credentials:
            type: object
            properties:
              username:
                type: string
              passwordSecret:
                type: string
      poolSettings:
        type: object
        properties:
          minConnections:
            type: integer
            minimum: 1
            default: 2
          maxConnections:
            type: integer
            minimum: 1
            default: 10
```

This nested structure validates database configurations. The schema ensures that connection details are complete and that pool settings fall within reasonable ranges.

## Using Default Values

Default values reduce configuration burden and ensure consistent behavior.

```yaml
properties:
  retryPolicy:
    type: object
    properties:
      attempts:
        type: integer
        minimum: 1
        maximum: 10
        default: 3
      backoff:
        type: string
        enum:
        - linear
        - exponential
        default: exponential
      initialDelay:
        type: string
        pattern: '^[0-9]+[smh]$'
        default: "1s"
```

When users create an Application resource without specifying retry settings, these defaults kick in. This reduces the amount of boilerplate users need to write while maintaining predictable behavior.

## Validating Arrays with Item Schemas

Arrays need careful validation to prevent malformed data.

```yaml
properties:
  volumes:
    type: array
    minItems: 1
    maxItems: 50
    items:
      type: object
      required:
      - name
      - mountPath
      properties:
        name:
          type: string
          pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$'
        mountPath:
          type: string
          pattern: '^/[a-z0-9/._-]*$'
        readOnly:
          type: boolean
          default: false
        volumeSource:
          type: object
          oneOf:
          - required: [configMap]
          - required: [secret]
          - required: [emptyDir]
          properties:
            configMap:
              type: string
            secret:
              type: string
            emptyDir:
              type: object
              properties:
                sizeLimit:
                  type: string
                  pattern: '^[0-9]+[MG]i$'
```

This array validation ensures volumes have unique names, valid mount paths, and properly configured sources. The oneOf constraint requires exactly one volume source type.

## Testing Your Schema Validation

Once you've created your CRD, test it thoroughly. Create a test resource that violates each validation rule.

```bash
# Apply the CRD
kubectl apply -f application-crd.yaml

# Test invalid replica count
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Application
metadata:
  name: test-app
spec:
  replicas: 200  # Exceeds maximum
  image: nginx:latest
EOF
```

You should see an error message indicating that replicas exceeds the maximum value. Test each validation rule to confirm it works as expected.

## Common Validation Patterns

Here are validation patterns I use frequently in production CRDs.

```yaml
# Duration validation (supports s, m, h)
duration:
  type: string
  pattern: '^[0-9]+[smh]$'

# Memory size validation (supports Mi, Gi)
memorySize:
  type: string
  pattern: '^[0-9]+[MG]i$'

# Kubernetes resource name
resourceName:
  type: string
  pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$'
  maxLength: 253

# Percentage (0-100)
percentage:
  type: integer
  minimum: 0
  maximum: 100

# Label selector
labelSelector:
  type: object
  properties:
    matchLabels:
      type: object
      additionalProperties:
        type: string
    matchExpressions:
      type: array
      items:
        type: object
        required:
        - key
        - operator
        properties:
          key:
            type: string
          operator:
            type: string
            enum:
            - In
            - NotIn
            - Exists
            - DoesNotExist
          values:
            type: array
            items:
              type: string
```

## Handling Schema Evolution

As your CRD evolves, you'll need to add new fields while maintaining backward compatibility. Use optional fields and defaults to introduce new functionality without breaking existing resources.

```yaml
properties:
  # New field added in v2
  autoscaling:
    type: object
    properties:
      enabled:
        type: boolean
        default: false
      minReplicas:
        type: integer
        minimum: 1
        default: 1
      maxReplicas:
        type: integer
        minimum: 1
        default: 10
      targetCPU:
        type: integer
        minimum: 1
        maximum: 100
        default: 80
```

By making the entire autoscaling object optional and providing sensible defaults, existing resources continue to work without modification.

## Conclusion

Structural schema validation transforms CRDs from loose data containers into robust, type-safe API resources. The validation happens before resources reach your controller code, reducing error handling complexity and improving system reliability.

Start with basic type validation and gradually add constraints as you understand your use cases better. Test your schemas thoroughly and document the validation rules in your CRD descriptions. Your future self (and your users) will thank you when configuration errors are caught immediately rather than causing runtime failures.
