# How to Create Kubernetes Custom Resource Definitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, CRD, Extensions, Operators

Description: Define Kubernetes Custom Resource Definitions (CRDs) with schema validation, versioning, and conversion webhooks for extending the Kubernetes API.

---

Custom Resource Definitions (CRDs) let you extend the Kubernetes API with your own resource types. Instead of storing application configuration in ConfigMaps or external databases, you can create first-class Kubernetes objects that behave like built-in resources such as Pods or Deployments.

This guide walks through creating production-ready CRDs with schema validation, multiple versions, status subresources, and conversion webhooks.

## Prerequisites

Before starting, make sure you have:

- A Kubernetes cluster running version 1.16 or later
- kubectl configured to communicate with your cluster
- Basic familiarity with Kubernetes resources and YAML

Check your cluster version:

```bash
kubectl version --short
```

## Understanding CRD Structure

A CRD consists of several key components:

| Component | Purpose |
|-----------|---------|
| Group | API group for your resource (e.g., `example.com`) |
| Version | API version (e.g., `v1`, `v1beta1`) |
| Kind | Resource type name (e.g., `Database`) |
| Scope | Whether resources are namespaced or cluster-wide |
| Schema | OpenAPI v3 schema for validation |

## Creating Your First CRD

Let's create a CRD for managing databases. This example defines a `Database` resource that tracks database instances in your cluster.

The following YAML creates a basic CRD with essential fields:

```yaml
# database-crd.yaml
# This CRD defines a Database resource for managing database instances
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  # Name must be: <plural>.<group>
  name: databases.example.com
spec:
  # Group name for the API
  group: example.com
  names:
    # Plural name used in URLs: /apis/example.com/v1/databases
    plural: databases
    # Singular name used in CLI output and display
    singular: database
    # Kind is the CamelCase singular type used in manifests
    kind: Database
    # ShortNames allow shorter strings to match your resource in kubectl
    shortNames:
      - db
      - dbs
  # Namespaced resources exist within a namespace
  # Use "Cluster" for cluster-wide resources
  scope: Namespaced
  versions:
    - name: v1
      # Served indicates this version is available via the API
      served: true
      # Storage indicates this version is used for persistence
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
                version:
                  type: string
                replicas:
                  type: integer
```

Apply the CRD to your cluster:

```bash
kubectl apply -f database-crd.yaml
```

Verify the CRD was created:

```bash
kubectl get crd databases.example.com
```

## Creating Custom Resources

Once the CRD exists, you can create instances of your custom resource.

This manifest creates a PostgreSQL database instance:

```yaml
# my-database.yaml
# A Database custom resource instance
apiVersion: example.com/v1
kind: Database
metadata:
  name: production-db
  namespace: default
spec:
  engine: postgresql
  version: "15.2"
  replicas: 3
```

Apply and verify:

```bash
# Create the database resource
kubectl apply -f my-database.yaml

# List all databases using the full name
kubectl get databases

# Use the short name
kubectl get db

# Get detailed information
kubectl describe database production-db
```

## OpenAPI Schema Validation

Schema validation prevents invalid resources from being created. Kubernetes rejects resources that don't match the schema before they reach your controller.

### Required Fields and Constraints

The following schema enforces required fields, value constraints, and patterns:

```yaml
# database-crd-validated.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
      - db
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          # Require spec to be present
          required:
            - spec
          properties:
            spec:
              type: object
              # Required fields within spec
              required:
                - engine
                - version
              properties:
                engine:
                  type: string
                  description: "Database engine type"
                  # Limit to specific values
                  enum:
                    - postgresql
                    - mysql
                    - mongodb
                    - redis
                version:
                  type: string
                  description: "Database version"
                  # Pattern validation using regex
                  pattern: "^[0-9]+\\.[0-9]+(\\.[0-9]+)?$"
                replicas:
                  type: integer
                  description: "Number of replicas"
                  # Minimum and maximum constraints
                  minimum: 1
                  maximum: 10
                  # Default value when not specified
                  default: 1
                storage:
                  type: object
                  description: "Storage configuration"
                  properties:
                    size:
                      type: string
                      # Pattern for Kubernetes quantity format
                      pattern: "^[0-9]+(Gi|Ti|Mi)$"
                    storageClass:
                      type: string
                      minLength: 1
                      maxLength: 63
                resources:
                  type: object
                  description: "Resource requests and limits"
                  properties:
                    requests:
                      type: object
                      properties:
                        cpu:
                          type: string
                        memory:
                          type: string
                    limits:
                      type: object
                      properties:
                        cpu:
                          type: string
                        memory:
                          type: string
                backup:
                  type: object
                  description: "Backup configuration"
                  properties:
                    enabled:
                      type: boolean
                      default: false
                    schedule:
                      type: string
                      description: "Cron schedule for backups"
                    retentionDays:
                      type: integer
                      minimum: 1
                      maximum: 365
                      default: 7
```

### Testing Validation

Try creating an invalid resource to see validation in action:

```yaml
# invalid-database.yaml
# This will fail validation
apiVersion: example.com/v1
kind: Database
metadata:
  name: invalid-db
spec:
  engine: oracle  # Not in enum list
  version: "latest"  # Doesn't match pattern
  replicas: 100  # Exceeds maximum
```

```bash
kubectl apply -f invalid-database.yaml
# Error: spec.engine: Unsupported value: "oracle"
# Error: spec.version: Invalid value: "latest": does not match pattern
# Error: spec.replicas: Invalid value: 100: must be less than or equal to 10
```

### Nested Object Validation

For complex nested structures, use `additionalProperties` to validate dynamic keys:

```yaml
# Labels and annotations validation example
labels:
  type: object
  additionalProperties:
    type: string
    maxLength: 63
  # Limit the number of labels
  maxProperties: 10
```

## Additional Printer Columns

Printer columns customize what kubectl displays when listing resources. Without custom columns, you only see NAME and AGE.

Add columns to show important fields at a glance:

```yaml
# database-crd-columns.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
      - db
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
                engine:
                  type: string
                version:
                  type: string
                replicas:
                  type: integer
            status:
              type: object
              properties:
                phase:
                  type: string
                readyReplicas:
                  type: integer
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
      # Custom columns for kubectl output
      additionalPrinterColumns:
        # JSONPath extracts values from the resource
        - name: Engine
          type: string
          jsonPath: .spec.engine
          description: Database engine type
        - name: Version
          type: string
          jsonPath: .spec.version
          description: Database version
        - name: Replicas
          type: integer
          jsonPath: .spec.replicas
          description: Desired number of replicas
        - name: Ready
          type: integer
          jsonPath: .status.readyReplicas
          description: Number of ready replicas
        - name: Phase
          type: string
          jsonPath: .status.phase
          description: Current phase
        # Priority determines column visibility
        # Priority 0 columns always show
        # Higher priority columns show with -o wide
        - name: Storage
          type: string
          jsonPath: .spec.storage.size
          priority: 1
        - name: Age
          type: date
          jsonPath: .metadata.creationTimestamp
```

Now kubectl shows useful information:

```bash
kubectl get databases
# NAME            ENGINE      VERSION   REPLICAS   READY   PHASE
# production-db   postgresql  15.2      3          3       Running

kubectl get databases -o wide
# Shows additional columns including Storage
```

## Status Subresource

The status subresource separates spec (desired state) from status (observed state). This has several benefits:

| Feature | Without Status Subresource | With Status Subresource |
|---------|---------------------------|------------------------|
| User can modify status | Yes | No |
| Controller can update status independently | No | Yes |
| Optimistic concurrency | Single resourceVersion | Separate for spec and status |
| RBAC control | Single permission | Separate permissions |

Enable the status subresource in your CRD:

```yaml
# database-crd-status.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
      - db
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      # Enable status subresource
      subresources:
        status: {}
        # Optional: enable scale subresource for HPA integration
        scale:
          # JSONPath to the replicas field in spec
          specReplicasPath: .spec.replicas
          # JSONPath to the replicas field in status
          statusReplicasPath: .status.readyReplicas
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - engine
              properties:
                engine:
                  type: string
                  enum:
                    - postgresql
                    - mysql
                    - mongodb
                version:
                  type: string
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 10
                  default: 1
            # Status is managed by the controller
            status:
              type: object
              properties:
                phase:
                  type: string
                  enum:
                    - Pending
                    - Creating
                    - Running
                    - Failed
                    - Terminating
                readyReplicas:
                  type: integer
                message:
                  type: string
                lastBackup:
                  type: string
                  format: date-time
                conditions:
                  type: array
                  items:
                    type: object
                    required:
                      - type
                      - status
                    properties:
                      type:
                        type: string
                      status:
                        type: string
                        enum:
                          - "True"
                          - "False"
                          - "Unknown"
                      reason:
                        type: string
                      message:
                        type: string
                      lastTransitionTime:
                        type: string
                        format: date-time
```

Controllers update status using the status subresource endpoint:

```bash
# Update status (typically done by a controller)
kubectl patch database production-db --type=merge --subresource=status \
  -p '{"status":{"phase":"Running","readyReplicas":3}}'
```

With the scale subresource enabled, you can use kubectl scale:

```bash
kubectl scale database production-db --replicas=5
```

## CRD Versioning

As your CRD evolves, you need to support multiple versions. Kubernetes lets you serve multiple versions simultaneously while storing data in a single version.

### Multiple Version Example

This CRD supports both v1 and v2:

```yaml
# database-crd-versioned.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
      - db
  scope: Namespaced
  # Define multiple versions
  versions:
    # v1 is the original version
    - name: v1
      served: true
      # Only one version can be storage version
      storage: false
      deprecated: true
      deprecationWarning: "example.com/v1 Database is deprecated; use example.com/v2"
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                engine:
                  type: string
                version:
                  type: string
                replicas:
                  type: integer
            status:
              type: object
              properties:
                phase:
                  type: string
                readyReplicas:
                  type: integer
      subresources:
        status: {}
      additionalPrinterColumns:
        - name: Engine
          type: string
          jsonPath: .spec.engine
        - name: Replicas
          type: integer
          jsonPath: .spec.replicas
        - name: Age
          type: date
          jsonPath: .metadata.creationTimestamp
    # v2 is the new version with additional fields
    - name: v2
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - engine
                - version
              properties:
                engine:
                  type: string
                  enum:
                    - postgresql
                    - mysql
                    - mongodb
                version:
                  type: string
                # v2 uses a nested replicas configuration
                replication:
                  type: object
                  properties:
                    replicas:
                      type: integer
                      minimum: 1
                      maximum: 10
                    readReplicas:
                      type: integer
                      minimum: 0
                      maximum: 5
                # New field in v2
                highAvailability:
                  type: object
                  properties:
                    enabled:
                      type: boolean
                      default: false
                    multiZone:
                      type: boolean
                      default: false
            status:
              type: object
              properties:
                phase:
                  type: string
                readyReplicas:
                  type: integer
                conditions:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                      status:
                        type: string
      subresources:
        status: {}
      additionalPrinterColumns:
        - name: Engine
          type: string
          jsonPath: .spec.engine
        - name: Replicas
          type: integer
          jsonPath: .spec.replication.replicas
        - name: HA
          type: boolean
          jsonPath: .spec.highAvailability.enabled
        - name: Phase
          type: string
          jsonPath: .status.phase
        - name: Age
          type: date
          jsonPath: .metadata.creationTimestamp
```

### Version Compatibility Table

| Version | Status | Storage | Notes |
|---------|--------|---------|-------|
| v1 | Deprecated | No | Original schema, flat replicas field |
| v2 | Current | Yes | Nested replication config, HA support |

## Conversion Webhooks

When serving multiple versions with different schemas, a conversion webhook translates between versions. The webhook runs when a client requests a version different from the storage version.

### Webhook Configuration

Add the conversion webhook configuration to your CRD:

```yaml
# database-crd-conversion.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
      - db
  scope: Namespaced
  # Conversion webhook configuration
  conversion:
    strategy: Webhook
    webhook:
      conversionReviewVersions:
        - v1
      clientConfig:
        # Service reference for in-cluster webhook
        service:
          namespace: database-system
          name: database-webhook
          path: /convert
          port: 443
        # CA bundle for verifying the webhook's certificate
        # Base64 encoded CA certificate
        caBundle: LS0tLS1CRUdJTi...
  versions:
    - name: v1
      served: true
      storage: false
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                engine:
                  type: string
                version:
                  type: string
                replicas:
                  type: integer
            status:
              type: object
              properties:
                phase:
                  type: string
      subresources:
        status: {}
    - name: v2
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
                version:
                  type: string
                replication:
                  type: object
                  properties:
                    replicas:
                      type: integer
                    readReplicas:
                      type: integer
                highAvailability:
                  type: object
                  properties:
                    enabled:
                      type: boolean
            status:
              type: object
              properties:
                phase:
                  type: string
      subresources:
        status: {}
```

### Webhook Implementation

Here's a Go implementation of the conversion webhook:

```go
// main.go
// Conversion webhook server for Database CRD
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// DatabaseV1Spec represents the v1 spec
type DatabaseV1Spec struct {
    Engine   string `json:"engine"`
    Version  string `json:"version"`
    Replicas int    `json:"replicas,omitempty"`
}

// DatabaseV2Spec represents the v2 spec
type DatabaseV2Spec struct {
    Engine           string            `json:"engine"`
    Version          string            `json:"version"`
    Replication      ReplicationConfig `json:"replication,omitempty"`
    HighAvailability HAConfig          `json:"highAvailability,omitempty"`
}

type ReplicationConfig struct {
    Replicas     int `json:"replicas,omitempty"`
    ReadReplicas int `json:"readReplicas,omitempty"`
}

type HAConfig struct {
    Enabled   bool `json:"enabled,omitempty"`
    MultiZone bool `json:"multiZone,omitempty"`
}

func handleConvert(w http.ResponseWriter, r *http.Request) {
    // Read the request body
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "failed to read body", http.StatusBadRequest)
        return
    }

    // Parse the ConversionReview request
    var review apiextensionsv1.ConversionReview
    if err := json.Unmarshal(body, &review); err != nil {
        http.Error(w, "failed to unmarshal request", http.StatusBadRequest)
        return
    }

    // Process each object in the request
    convertedObjects := make([]unstructured.Unstructured, len(review.Request.Objects))
    for i, obj := range review.Request.Objects {
        converted, err := convertObject(obj.Raw, review.Request.DesiredAPIVersion)
        if err != nil {
            // Return failure response
            review.Response = &apiextensionsv1.ConversionResponse{
                UID: review.Request.UID,
                Result: metav1.Status{
                    Status:  "Failure",
                    Message: err.Error(),
                },
            }
            writeResponse(w, review)
            return
        }
        convertedObjects[i] = *converted
    }

    // Build success response
    rawObjects := make([]runtime.RawExtension, len(convertedObjects))
    for i, obj := range convertedObjects {
        raw, _ := json.Marshal(obj.Object)
        rawObjects[i] = runtime.RawExtension{Raw: raw}
    }

    review.Response = &apiextensionsv1.ConversionResponse{
        UID:              review.Request.UID,
        ConvertedObjects: rawObjects,
        Result: metav1.Status{
            Status: "Success",
        },
    }
    writeResponse(w, review)
}

func convertObject(raw []byte, targetVersion string) (*unstructured.Unstructured, error) {
    var obj unstructured.Unstructured
    if err := json.Unmarshal(raw, &obj.Object); err != nil {
        return nil, err
    }

    sourceVersion := obj.GetAPIVersion()

    // Handle v1 to v2 conversion
    if sourceVersion == "example.com/v1" && targetVersion == "example.com/v2" {
        spec, _, _ := unstructured.NestedMap(obj.Object, "spec")

        // Get v1 replicas field
        replicas, _, _ := unstructured.NestedInt64(spec, "replicas")

        // Create v2 replication structure
        replication := map[string]interface{}{
            "replicas":     replicas,
            "readReplicas": 0,
        }

        // Remove old replicas field
        delete(spec, "replicas")

        // Add new replication structure
        spec["replication"] = replication

        // Add default highAvailability
        spec["highAvailability"] = map[string]interface{}{
            "enabled":   false,
            "multiZone": false,
        }

        unstructured.SetNestedMap(obj.Object, spec, "spec")
        obj.SetAPIVersion(targetVersion)
    }

    // Handle v2 to v1 conversion
    if sourceVersion == "example.com/v2" && targetVersion == "example.com/v1" {
        spec, _, _ := unstructured.NestedMap(obj.Object, "spec")

        // Get replicas from replication structure
        replicas, _, _ := unstructured.NestedInt64(spec, "replication", "replicas")

        // Remove v2 specific fields
        delete(spec, "replication")
        delete(spec, "highAvailability")

        // Add flat replicas field
        spec["replicas"] = replicas

        unstructured.SetNestedMap(obj.Object, spec, "spec")
        obj.SetAPIVersion(targetVersion)
    }

    return &obj, nil
}

func writeResponse(w http.ResponseWriter, review apiextensionsv1.ConversionReview) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(review)
}

func main() {
    http.HandleFunc("/convert", handleConvert)
    http.ListenAndServeTLS(":443", "/certs/tls.crt", "/certs/tls.key", nil)
}
```

### Webhook Deployment

Deploy the conversion webhook as a Kubernetes service:

```yaml
# webhook-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: database-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-webhook
  namespace: database-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: database-webhook
  template:
    metadata:
      labels:
        app: database-webhook
    spec:
      containers:
        - name: webhook
          image: your-registry/database-webhook:v1.0.0
          ports:
            - containerPort: 443
          volumeMounts:
            - name: certs
              mountPath: /certs
              readOnly: true
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
      volumes:
        - name: certs
          secret:
            secretName: database-webhook-certs
---
apiVersion: v1
kind: Service
metadata:
  name: database-webhook
  namespace: database-system
spec:
  selector:
    app: database-webhook
  ports:
    - port: 443
      targetPort: 443
```

## CRD Categories

Categories let you group CRDs for easier discovery. When a user runs `kubectl get all`, only resources in the "all" category appear.

Add categories to your CRD:

```yaml
# database-crd-categories.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
spec:
  group: example.com
  names:
    plural: databases
    singular: database
    kind: Database
    shortNames:
      - db
    # Categories group resources for bulk operations
    categories:
      # "all" category shows up in kubectl get all
      - all
      # Custom categories for your organization
      - database
      - data
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
                engine:
                  type: string
                version:
                  type: string
                replicas:
                  type: integer
      subresources:
        status: {}
```

Now you can query multiple resource types:

```bash
# Get all resources in the "database" category
kubectl get database

# If you have multiple CRDs in the data category
kubectl get data

# Works with kubectl get all
kubectl get all
```

## Complete Production CRD Example

Here's a complete CRD combining all the features covered:

```yaml
# database-crd-complete.yaml
# Production-ready Database CRD with all features enabled
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
  annotations:
    # Documentation annotations
    api-approved.kubernetes.io: "https://github.com/example/database-operator"
spec:
  group: example.com
  names:
    plural: databases
    singular: database
    kind: Database
    listKind: DatabaseList
    shortNames:
      - db
      - dbs
    categories:
      - all
      - database
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      subresources:
        status: {}
        scale:
          specReplicasPath: .spec.replicas
          statusReplicasPath: .status.readyReplicas
      additionalPrinterColumns:
        - name: Engine
          type: string
          jsonPath: .spec.engine
        - name: Version
          type: string
          jsonPath: .spec.version
        - name: Replicas
          type: integer
          jsonPath: .spec.replicas
        - name: Ready
          type: integer
          jsonPath: .status.readyReplicas
        - name: Phase
          type: string
          jsonPath: .status.phase
        - name: Age
          type: date
          jsonPath: .metadata.creationTimestamp
      schema:
        openAPIV3Schema:
          type: object
          required:
            - spec
          properties:
            spec:
              type: object
              required:
                - engine
                - version
              properties:
                engine:
                  type: string
                  description: "Database engine to use"
                  enum:
                    - postgresql
                    - mysql
                    - mongodb
                    - redis
                version:
                  type: string
                  description: "Database version"
                  pattern: "^[0-9]+\\.[0-9]+(\\.[0-9]+)?$"
                replicas:
                  type: integer
                  description: "Number of database replicas"
                  minimum: 1
                  maximum: 10
                  default: 1
                storage:
                  type: object
                  description: "Persistent storage configuration"
                  required:
                    - size
                  properties:
                    size:
                      type: string
                      pattern: "^[0-9]+(Gi|Ti|Mi)$"
                    storageClass:
                      type: string
                resources:
                  type: object
                  description: "Compute resource requirements"
                  properties:
                    requests:
                      type: object
                      properties:
                        cpu:
                          type: string
                        memory:
                          type: string
                    limits:
                      type: object
                      properties:
                        cpu:
                          type: string
                        memory:
                          type: string
                backup:
                  type: object
                  description: "Backup configuration"
                  properties:
                    enabled:
                      type: boolean
                      default: false
                    schedule:
                      type: string
                      description: "Cron expression for backup schedule"
                    retentionDays:
                      type: integer
                      minimum: 1
                      maximum: 365
                      default: 7
                    destination:
                      type: object
                      properties:
                        bucket:
                          type: string
                        region:
                          type: string
                connection:
                  type: object
                  description: "Connection settings"
                  properties:
                    maxConnections:
                      type: integer
                      minimum: 10
                      maximum: 10000
                      default: 100
                    timeout:
                      type: string
                      default: "30s"
            status:
              type: object
              properties:
                phase:
                  type: string
                  enum:
                    - Pending
                    - Creating
                    - Running
                    - Updating
                    - Failed
                    - Terminating
                readyReplicas:
                  type: integer
                endpoint:
                  type: string
                message:
                  type: string
                lastBackup:
                  type: string
                  format: date-time
                observedGeneration:
                  type: integer
                conditions:
                  type: array
                  items:
                    type: object
                    required:
                      - type
                      - status
                      - lastTransitionTime
                    properties:
                      type:
                        type: string
                      status:
                        type: string
                        enum:
                          - "True"
                          - "False"
                          - "Unknown"
                      reason:
                        type: string
                      message:
                        type: string
                      lastTransitionTime:
                        type: string
                        format: date-time
```

## Best Practices

Follow these guidelines when creating CRDs:

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Group | Reverse domain | `example.com` |
| Kind | CamelCase singular | `Database` |
| Plural | lowercase | `databases` |
| Short names | 2-4 characters | `db` |

### Schema Design

1. Always require a spec field
2. Use enums for fields with known values
3. Set sensible defaults
4. Add descriptions to all fields
5. Use pattern validation for formatted strings
6. Keep the schema as strict as practical

### Versioning Strategy

1. Start with `v1alpha1` for experimental APIs
2. Graduate to `v1beta1` when the API stabilizes
3. Move to `v1` when you commit to backward compatibility
4. Deprecate old versions before removing them
5. Provide at least one release cycle for migration

### Status Management

1. Always use the status subresource
2. Include `observedGeneration` to track spec changes
3. Use conditions for detailed state information
4. Keep status updates lightweight

## Troubleshooting

Common issues and solutions:

### CRD Not Created

```bash
# Check for validation errors
kubectl apply -f crd.yaml --dry-run=server

# Check API server logs
kubectl logs -n kube-system -l component=kube-apiserver
```

### Schema Validation Errors

```bash
# Validate your YAML syntax
kubectl apply -f resource.yaml --dry-run=client -o yaml

# Get detailed error messages
kubectl apply -f resource.yaml -v=8
```

### Conversion Webhook Failures

```bash
# Check webhook logs
kubectl logs -n database-system -l app=database-webhook

# Verify certificate is valid
openssl x509 -in /certs/tls.crt -text -noout

# Test webhook connectivity
kubectl run curl --image=curlimages/curl --rm -it -- \
  curl -k https://database-webhook.database-system.svc/convert
```

## Conclusion

Custom Resource Definitions transform Kubernetes into an extensible platform for managing any kind of resource. Start with a simple CRD, add schema validation, then introduce versioning and webhooks as your API matures.

Key takeaways:

- Use OpenAPI schemas to validate resources at admission time
- Enable the status subresource to separate desired and observed state
- Plan for versioning from the start
- Add printer columns for better kubectl output
- Use categories to group related resources

The patterns shown here form the foundation for building Kubernetes operators that manage complex applications. With a well-designed CRD, your custom resources become indistinguishable from built-in Kubernetes resources.
