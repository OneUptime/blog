# How to Implement Custom Resource Printer Columns and AdditionalPrinterColumns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, kubectl

Description: Learn how to configure additionalPrinterColumns in your CRDs to display custom fields in kubectl output, making your custom resources easier to inspect and manage.

---

When you list Kubernetes resources with kubectl, you see helpful columns like STATUS, AGE, and resource-specific information. By default, Custom Resources only show NAME and AGE. You can configure which fields appear in kubectl output by defining additionalPrinterColumns in your CRD specification.

Printer columns transform the kubectl experience for your custom resources, showing relevant status information, configuration details, and metadata at a glance. This makes it much easier for users to understand resource state without examining the full YAML.

## Basic Printer Column Configuration

Add printer columns to your CRD spec:

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
            properties:
              version:
                type: string
              replicas:
                type: integer
              environment:
                type: string
          status:
            type: object
            properties:
              phase:
                type: string
              ready:
                type: boolean
              availableReplicas:
                type: integer
    additionalPrinterColumns:
    - name: Version
      type: string
      description: Application version
      jsonPath: .spec.version
    - name: Replicas
      type: integer
      description: Desired replica count
      jsonPath: .spec.replicas
    - name: Available
      type: integer
      description: Available replicas
      jsonPath: .status.availableReplicas
    - name: Phase
      type: string
      description: Current phase
      jsonPath: .status.phase
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
```

Now kubectl displays these columns:

```bash
kubectl get applications

NAME      VERSION   REPLICAS   AVAILABLE   PHASE     AGE
webapp    2.1.0     3          3           Running   5d
api       1.5.2     5          4           Running   12h
worker    3.0.0     2          0           Pending   2m
```

## JSONPath Expressions

The jsonPath field uses JSONPath syntax to extract values from your resource. Common patterns include:

```yaml
# Access spec fields
jsonPath: .spec.version

# Access nested fields
jsonPath: .spec.database.host

# Access status conditions
jsonPath: .status.conditions[?(@.type=="Ready")].status

# Access array elements
jsonPath: .spec.containers[0].image

# Multiple values from array
jsonPath: .spec.ports[*].containerPort

# Conditional access with default
jsonPath: .spec.enabled
```

For arrays, kubectl joins multiple values with commas.

## Column Types and Formatting

Specify the data type for proper formatting:

```yaml
additionalPrinterColumns:
# String columns
- name: Environment
  type: string
  jsonPath: .spec.environment

# Integer columns (formatted as numbers)
- name: Count
  type: integer
  jsonPath: .spec.count

# Number columns (supports decimals)
- name: CPU
  type: number
  jsonPath: .spec.resources.cpu

# Boolean columns (displays true/false)
- name: Enabled
  type: boolean
  jsonPath: .spec.enabled

# Date columns (displays as age, like "5d" or "2h")
- name: Age
  type: date
  jsonPath: .metadata.creationTimestamp

# Last Updated (another date example)
- name: Updated
  type: date
  jsonPath: .status.lastUpdateTime
```

## Column Priority

Control which columns appear by default versus with wide output:

```yaml
additionalPrinterColumns:
# Always visible
- name: Version
  type: string
  jsonPath: .spec.version
  priority: 0  # Default priority

# Only visible with kubectl get -o wide
- name: Image
  type: string
  jsonPath: .spec.image
  priority: 1

# Also only in wide output
- name: Node
  type: string
  jsonPath: .status.nodeName
  priority: 1
```

Users see priority 0 columns by default and priority 1+ columns only with the -o wide flag:

```bash
# Shows only priority 0 columns
kubectl get applications

# Shows all columns
kubectl get applications -o wide
```

## Displaying Status Conditions

Show condition status in a column:

```yaml
additionalPrinterColumns:
- name: Ready
  type: string
  description: Ready condition status
  jsonPath: .status.conditions[?(@.type=="Ready")].status

- name: Reason
  type: string
  description: Reason for current state
  jsonPath: .status.conditions[?(@.type=="Ready")].reason
  priority: 1
```

If your status follows the standard conditions pattern:

```yaml
status:
  conditions:
  - type: Ready
    status: "True"
    reason: AllComponentsHealthy
    lastTransitionTime: "2026-02-09T10:00:00Z"
```

## Example: Database CRD with Rich Columns

Here's a comprehensive example for a database custom resource:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.db.example.com
spec:
  group: db.example.com
  names:
    kind: Database
    plural: databases
    singular: database
    shortNames: [db]
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              engine:
                type: string
                enum: [postgres, mysql, mongodb]
              version:
                type: string
              storage:
                type: string
              backupEnabled:
                type: boolean
          status:
            type: object
            properties:
              phase:
                type: string
              endpoint:
                type: string
              ready:
                type: boolean
              lastBackup:
                type: string
                format: date-time
    additionalPrinterColumns:
    - name: Engine
      type: string
      description: Database engine type
      jsonPath: .spec.engine
    - name: Version
      type: string
      description: Database version
      jsonPath: .spec.version
    - name: Status
      type: string
      description: Current phase
      jsonPath: .status.phase
    - name: Ready
      type: boolean
      description: Database ready status
      jsonPath: .status.ready
    - name: Endpoint
      type: string
      description: Connection endpoint
      jsonPath: .status.endpoint
      priority: 1
    - name: Storage
      type: string
      description: Storage size
      jsonPath: .spec.storage
      priority: 1
    - name: Backup
      type: date
      description: Last backup time
      jsonPath: .status.lastBackup
      priority: 1
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
```

Output looks like this:

```bash
kubectl get databases

NAME          ENGINE     VERSION   STATUS    READY   AGE
production    postgres   14.2      Running   true    30d
staging       mysql      8.0       Running   true    15d
analytics     mongodb    5.0       Pending   false   5m

kubectl get databases -o wide

NAME        ENGINE    VERSION  STATUS   READY  ENDPOINT                    STORAGE  BACKUP  AGE
production  postgres  14.2     Running  true   prod-db.cluster.local:5432  100Gi    2h      30d
staging     mysql     8.0      Running  true   stage-db.cluster.local:3306 50Gi     1h      15d
analytics   mongodb   5.0      Pending  false  -                           200Gi    -       5m
```

## Using Kubebuilder Markers

If you use Kubebuilder to generate CRDs, add printer column markers to your Go types:

```go
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Version",type=string,JSONPath=`.spec.version`
// +kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Ready",type=boolean,JSONPath=`.status.ready`
// +kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

type ApplicationSpec struct {
    Version  string `json:"version"`
    Replicas int32  `json:"replicas"`
}

type ApplicationStatus struct {
    Phase string `json:"phase,omitempty"`
    Ready bool   `json:"ready,omitempty"`
}
```

Run `make manifests` to generate the CRD with printer columns.

## Column Name Best Practices

Keep column names short and uppercase. Long names get truncated and make output hard to read:

```yaml
# Good
- name: Status
  type: string
  jsonPath: .status.phase

# Bad (too long)
- name: CurrentOperationalStatus
  type: string
  jsonPath: .status.phase
```

Use standard column names when possible:
- AGE for creation time
- STATUS or PHASE for current state
- READY for readiness
- NAME is automatic, don't add it

## Handling Missing Values

If a JSONPath doesn't match (field doesn't exist or is null), kubectl shows `<none>`. You can't customize this behavior directly, but structure your status to avoid it:

```go
// In your controller, always populate important status fields
status := &ApplicationStatus{
    Phase: "Pending",  // Default value
    Ready: false,      // Default value
}
```

## Testing Printer Columns

After updating your CRD, test the output:

```bash
# Apply updated CRD
kubectl apply -f crd.yaml

# Create a test resource
kubectl apply -f sample-resource.yaml

# Check default output
kubectl get applications

# Check wide output
kubectl get applications -o wide

# Verify specific resource
kubectl get application myapp
```

If columns don't appear correctly, check that:
- The JSONPath matches your schema
- The field exists in your resource
- The type matches the actual data type
- The CRD update was applied successfully

Printer columns make your custom resources feel like first-class Kubernetes citizens, providing the same convenient tabular output that users expect from built-in resources.
