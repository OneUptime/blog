# How to Write CEL Expressions for Complex Field Validation in Admission Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CEL, Validation, Admission Control, Policy Engineering

Description: Master Common Expression Language (CEL) for writing complex validation logic in Kubernetes admission policies, including nested field checks, cross-field validation, and advanced type operations.

---

Common Expression Language (CEL) provides powerful capabilities for validating complex Kubernetes resources. Beyond simple field presence checks, CEL enables conditional logic, cross-field validation, type conversions, and collection operations. This guide teaches you advanced CEL techniques for implementing sophisticated admission policies that handle real-world validation requirements.

## Understanding CEL Data Types

CEL supports basic types including strings, integers, doubles, booleans, and null. It also handles complex types like maps, lists, and timestamps. Understanding type conversions and checks is essential for robust validation:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: type-demonstrations
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE"]
        resources: ["configmaps"]
  validations:
    # String operations
    - expression: |
        has(object.data) &&
        'name' in object.data &&
        object.data['name'].size() >= 3 &&
        object.data['name'].size() <= 63
      message: "Name must be between 3 and 63 characters"

    # Type checking and conversion
    - expression: |
        !has(object.data) ||
        !('port' in object.data) ||
        object.data['port'].matches('^[0-9]+$') &&
        int(object.data['port']) > 0 &&
        int(object.data['port']) <= 65535
      message: "Port must be between 1 and 65535"

    # Boolean validation
    - expression: |
        !has(object.data) ||
        !('enabled' in object.data) ||
        object.data['enabled'] in ['true', 'false']
      message: "enabled must be 'true' or 'false'"
```

The `int()` function converts strings to integers for numeric comparisons. The `size()` method returns string length or collection size.

## Validating Nested Fields

Access nested structures using dot notation and validate complex hierarchies:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: nested-field-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    # Check nested security context
    - expression: |
        object.spec.containers.all(c,
          has(c.securityContext) &&
          has(c.securityContext.capabilities) &&
          has(c.securityContext.capabilities.drop) &&
          'ALL' in c.securityContext.capabilities.drop
        )
      message: "All containers must drop ALL capabilities"

    # Validate nested resource structure
    - expression: |
        object.spec.containers.all(c,
          has(c.resources) &&
          has(c.resources.limits) &&
          has(c.resources.requests) &&
          'memory' in c.resources.limits &&
          'memory' in c.resources.requests &&
          isQuantity(c.resources.limits['memory']) &&
          isQuantity(c.resources.requests['memory']) &&
          quantity(c.resources.limits['memory']).compareTo(
            quantity(c.resources.requests['memory'])
          ) >= 0
        )
      message: "Memory limits must be greater than or equal to requests"
```

The Kubernetes `quantity()` function parses resource quantities for numeric comparison. This validates that limits exceed requests.

## Cross-Field Validation

Validate relationships between different fields in a resource:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: cross-field-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    # Ensure replica count matches strategy
    - expression: |
        !has(object.spec.strategy) ||
        object.spec.strategy.type != 'Recreate' ||
        object.spec.replicas == 1
      message: "Recreate strategy requires exactly 1 replica"

    # Validate matching labels and selectors
    - expression: |
        !has(object.spec.selector.matchLabels) ||
        object.spec.selector.matchLabels.all(k, v,
          has(object.spec.template.metadata.labels) &&
          k in object.spec.template.metadata.labels &&
          object.spec.template.metadata.labels[k] == v
        )
      message: "Deployment selector must be a subset of pod labels"

    # Check PDB alignment
    - expression: |
        object.spec.replicas < 2 ||
        has(object.metadata.annotations) &&
        'pdb.required' in object.metadata.annotations &&
        object.metadata.annotations['pdb.required'] == 'true'
      message: "Deployments with 2+ replicas must have PDB annotation"
```

The map `all()` macro checks that every selector key and value also exists in the pod template labels.

## Using Optional Chaining

Handle optional fields gracefully without complex has() checks:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: optional-chaining
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    # Optional chaining with default values
    - expression: |
        object.spec.containers.all(c,
          c.?securityContext.?runAsUser.orValue(0) != 0
        )
      message: "Containers must not run as UID 0"

    # Check optional annotation
    - expression: |
        object.metadata.?annotations[?'cost-center'].orValue('') != '' ||
        object.metadata.?labels[?'environment'].orValue('') == 'dev'
      message: "Non-dev pods must have cost-center annotation"
```

The `?` operator provides safe navigation through potentially null fields. The `orValue()` method supplies defaults when fields don't exist.

## List Operations and Filtering

Use collection functions to validate lists and arrays:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: list-operations
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    # Check no containers use specific ports
    - expression: |
        !object.spec.containers.exists(c,
          has(c.ports) &&
          c.ports.exists(p, p.containerPort in [22, 23, 3389])
        )
      message: "Containers cannot expose SSH, Telnet, or RDP ports"

    # Validate all volume types
    - expression: |
        !has(object.spec.volumes) ||
        object.spec.volumes.all(v,
          has(v.configMap) || has(v.secret) || has(v.emptyDir) ||
          has(v.persistentVolumeClaim)
        )
      message: "Only ConfigMap, Secret, EmptyDir, and PVC volumes allowed"

    # Check unique container names
    - expression: |
        object.spec.containers.all(c,
          object.spec.containers.filter(other, other.name == c.name).size() == 1
        )
      message: "Container names must be unique"
```

The `exists()` function checks if any element matches a condition. The `map()` function transforms collections, and `filter()` creates subsets matching a condition.

## String Pattern Matching

Validate string formats using CEL string functions:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: string-pattern-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["services"]
  validations:
    # Validate DNS-compliant names
    - expression: |
        object.metadata.name.matches('^[a-z0-9]([-a-z0-9]*[a-z0-9])?$')
      message: "Service name must be a valid DNS label"

    # Check annotation URL format
    - expression: |
        !has(object.metadata.annotations) ||
        !('documentation' in object.metadata.annotations) ||
        object.metadata.annotations['documentation'].startsWith('https://')
      message: "Documentation URL must use HTTPS"

    # Validate label values
    - expression: |
        !has(object.metadata.labels) ||
        object.metadata.labels.all(key, value,
          (value == '' ||
           value.matches('^[a-zA-Z0-9]([a-zA-Z0-9-_.]*[a-zA-Z0-9])?$')) &&
          value.size() <= 63
        )
      message: "Label values must match Kubernetes format and be <= 63 chars"
```

The `matches()` function performs regex matching. Use it for validating formats like DNS names, URLs, and semantic versions.

## Quantity Comparisons

Compare Kubernetes resource quantities across different units:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: quantity-comparison
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    # Compare memory in different units
    - expression: |
        object.spec.containers.all(c,
          !has(c.resources) ||
          !has(c.resources.limits) ||
          !('memory' in c.resources.limits) ||
          isQuantity(c.resources.limits['memory']) &&
          quantity(c.resources.limits['memory']).compareTo(quantity('4Gi')) <= 0
        )
      message: "Memory limit must not exceed 4Gi"

    # Validate CPU millicore format
    - expression: |
        object.spec.containers.all(c,
          !has(c.resources) ||
          !has(c.resources.requests) ||
          !('cpu' in c.resources.requests) ||
          isQuantity(c.resources.requests['cpu'])
        )
      message: "CPU must be a valid Kubernetes quantity like '100m' or '1'"
```

Handle unit conversions carefully when comparing quantities. This example uses Kubernetes quantity parsing for consistent comparisons.

## Conditional Validation Based on Context

Apply different rules based on resource context:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: context-based-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    # Stricter rules for production
    - expression: |
        !has(object.metadata.labels) ||
        !('environment' in object.metadata.labels) ||
        object.metadata.labels['environment'] != 'production' ||
        (
          object.spec.replicas >= 2 &&
          has(object.spec.template.spec.affinity) &&
          has(object.spec.template.spec.affinity.podAntiAffinity) &&
          object.spec.template.metadata.labels.all(k, v, k != 'version')
        )
      message: "Production deployments need >=2 replicas and anti-affinity"

    # Different image policies per environment
    - expression: |
        (
          has(object.metadata.labels) &&
          'environment' in object.metadata.labels &&
          object.metadata.labels['environment'] == 'dev'
        ) ||
        object.spec.template.spec.containers.all(c,
          !c.image.contains(':latest')
        )
      message: "Non-dev environments cannot use :latest tag"
```

This implements environment-specific policies, enforcing strict requirements in production while allowing flexibility in development.

## Validating Map Structures

Check map contents and key-value relationships:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: map-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["configmaps"]
  validations:
    # Ensure required keys exist
    - expression: |
        has(object.data) &&
        ['database.host', 'database.port', 'database.name'].all(key,
          key in object.data
        )
      message: "ConfigMap must contain database connection keys"

    # Validate no sensitive data patterns
    - expression: |
        !has(object.data) ||
        !object.data.exists(key, value,
          key.lowerAscii().contains('password') ||
          key.lowerAscii().contains('secret') ||
          value.contains('BEGIN PRIVATE KEY')
        )
      message: "ConfigMaps cannot contain passwords or private keys"
```

The `exists()` function with two parameters checks key-value pairs in maps.

## Time-Based Validation

Validate timestamps and durations:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: time-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["batch"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["cronjobs"]
  validations:
    # Validate cron schedule format
    - expression: |
        object.spec.schedule.matches(
          '^@(annually|yearly|monthly|weekly|daily|midnight|hourly)$'
        ) ||
        object.spec.schedule.matches(
          '^([0-9A-Za-z*,/\\-?]+\\s+){4}[0-9A-Za-z*,/\\-?]+$'
        )
      message: "Invalid cron schedule format"

    # Check reasonable activeDeadlineSeconds
    - expression: |
        !has(object.spec.jobTemplate.spec.activeDeadlineSeconds) ||
        object.spec.jobTemplate.spec.activeDeadlineSeconds <= 3600
      message: "Job deadline must not exceed 1 hour"
```

Use regex patterns to validate cron expressions and time formats.

## Aggregation and Counting

Perform calculations across collections:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: aggregation-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    # Limit total CPU across all containers
    - expression: |
        object.spec.containers.map(c,
          !has(c.resources) || !has(c.resources.requests) ||
          !('cpu' in c.resources.requests) ? 0 :
          !isQuantity(c.resources.requests['cpu']) ? 2001 :
          quantity(c.resources.requests['cpu']).asApproximateFloat() * 1000
        ).sum() <= 2000
      message: "Total pod CPU requests cannot exceed 2000m"

    # Count specific volume types
    - expression: |
        !has(object.spec.volumes) ||
        object.spec.volumes.filter(v, has(v.hostPath)).size() == 0
      message: "HostPath volumes are not allowed"
```

The `sum()` function aggregates numeric values. The `filter()` function creates subsets matching conditions.

## Error Handling and Defaults

Handle missing or malformed data gracefully:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: safe-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    # Safe navigation with defaults
    - expression: |
        object.spec.containers.all(c,
          quantity(c.?resources.?limits[?'cpu'].orValue('1000m')).compareTo(
            quantity('2000m')
          ) <= 0
        )
      message: "Container CPU limit exceeds 2000m"

    # Handle missing annotations safely
    - expression: |
        object.metadata.?annotations[?'max-pods'].orValue('10').matches('^\\d+$') &&
        int(object.metadata.?annotations[?'max-pods'].orValue('10')) <= 100
      message: "max-pods annotation must be a number <= 100"
```

Combine optional chaining, defaults, and type checking for robust validation that handles edge cases.

## Conclusion

Advanced CEL expressions enable sophisticated validation logic for complex Kubernetes resources. Use optional chaining to handle missing fields, leverage collection functions like all(), exists(), and filter() for list validation, and apply string functions for pattern matching. Perform cross-field validation to check relationships between fields, and use conditional logic to implement environment-specific rules. Handle type conversions carefully when comparing quantities, and provide clear error messages that guide users toward compliant configurations.

Master these CEL patterns to build robust admission policies that catch configuration errors early while providing excellent developer experience through precise, actionable feedback.
