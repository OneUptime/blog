# How to Implement CRD Conversion Webhooks for Multi-Version Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, Webhooks

Description: Learn how to implement conversion webhooks for Custom Resource Definitions to support multiple API versions and seamless schema migrations in Kubernetes.

---

APIs evolve. Fields get renamed, structures get refactored, and new features get added. In Kubernetes, Custom Resource Definitions need to support multiple versions simultaneously while maintaining backward compatibility. Conversion webhooks make this possible.

Without conversion webhooks, you're stuck with a single API version forever or you force users to migrate all their resources at once. Neither option is realistic for production systems. This guide shows you how to implement conversion webhooks that let you evolve your CRD gracefully.

## Understanding CRD Versioning

Kubernetes CRDs can serve multiple versions of the same resource. You mark one version as the storage version where resources are persisted in etcd. Other versions exist as views that convert to and from the storage version.

The conversion webhook sits between these versions. When someone requests a resource in v2 but it's stored in v1, the webhook converts it. When someone creates a v1 resource but v2 is the storage version, the webhook converts before storage.

## Setting Up the Conversion Webhook

First, configure your CRD to use a conversion webhook.

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
  # Conversion strategy
  conversion:
    strategy: Webhook
    webhook:
      conversionReviewVersions:
      - v1
      - v1beta1
      clientConfig:
        service:
          namespace: default
          name: app-conversion-webhook
          path: /convert
          port: 443
        caBundle: LS0tLS1CRUdJTi... # base64 encoded CA cert
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
              containerImage:
                type: string
              configuration:
                type: object
                x-kubernetes-preserve-unknown-fields: true
  - name: v2
    served: true
    storage: false
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              scaling:
                type: object
                properties:
                  replicas:
                    type: integer
              image:
                type: string
              config:
                type: object
                x-kubernetes-preserve-unknown-fields: true
```

Notice that v1 is the storage version and v2 is served but not stored. The webhook converts between these versions.

## Implementing the Webhook Server

The webhook server receives conversion requests and returns converted objects. Here's a complete implementation in Go.

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"

    "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
)

// ApplicationV1 represents the v1 schema
type ApplicationV1 struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec              ApplicationV1Spec `json:"spec"`
}

type ApplicationV1Spec struct {
    Replicas       int32                  `json:"replicas"`
    ContainerImage string                 `json:"containerImage"`
    Configuration  map[string]interface{} `json:"configuration,omitempty"`
}

// ApplicationV2 represents the v2 schema
type ApplicationV2 struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec              ApplicationV2Spec `json:"spec"`
}

type ApplicationV2Spec struct {
    Scaling ScalingConfig          `json:"scaling"`
    Image   string                 `json:"image"`
    Config  map[string]interface{} `json:"config,omitempty"`
}

type ScalingConfig struct {
    Replicas int32 `json:"replicas"`
}

// convertV1ToV2 converts v1 Application to v2
func convertV1ToV2(v1Obj *ApplicationV1) (*ApplicationV2, error) {
    v2Obj := &ApplicationV2{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "example.com/v2",
            Kind:       "Application",
        },
        ObjectMeta: v1Obj.ObjectMeta,
        Spec: ApplicationV2Spec{
            Scaling: ScalingConfig{
                Replicas: v1Obj.Spec.Replicas,
            },
            Image:  v1Obj.Spec.ContainerImage,
            Config: v1Obj.Spec.Configuration,
        },
    }
    return v2Obj, nil
}

// convertV2ToV1 converts v2 Application to v1
func convertV2ToV1(v2Obj *ApplicationV2) (*ApplicationV1, error) {
    v1Obj := &ApplicationV1{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "example.com/v1",
            Kind:       "Application",
        },
        ObjectMeta: v2Obj.ObjectMeta,
        Spec: ApplicationV1Spec{
            Replicas:       v2Obj.Spec.Scaling.Replicas,
            ContainerImage: v2Obj.Spec.Image,
            Configuration:  v2Obj.Spec.Config,
        },
    }
    return v1Obj, nil
}

// handleConvert processes conversion requests
func handleConvert(w http.ResponseWriter, r *http.Request) {
    // Read request body
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "failed to read request", http.StatusBadRequest)
        return
    }
    defer r.Body.Close()

    // Parse ConversionReview request
    var convertReview v1.ConversionReview
    if err := json.Unmarshal(body, &convertReview); err != nil {
        http.Error(w, "failed to parse request", http.StatusBadRequest)
        return
    }

    // Process conversion
    convertedObjects := []runtime.RawExtension{}

    for _, obj := range convertReview.Request.Objects {
        // Determine source and target versions
        src := obj.Object
        var converted interface{}
        var err error

        // Parse to determine current version
        var typeMeta metav1.TypeMeta
        json.Unmarshal(obj.Raw, &typeMeta)

        desiredVersion := convertReview.Request.DesiredAPIVersion

        if typeMeta.APIVersion == "example.com/v1" && desiredVersion == "example.com/v2" {
            var v1Obj ApplicationV1
            json.Unmarshal(obj.Raw, &v1Obj)
            converted, err = convertV1ToV2(&v1Obj)
        } else if typeMeta.APIVersion == "example.com/v2" && desiredVersion == "example.com/v1" {
            var v2Obj ApplicationV2
            json.Unmarshal(obj.Raw, &v2Obj)
            converted, err = convertV2ToV1(&v2Obj)
        } else {
            // No conversion needed
            converted = src
        }

        if err != nil {
            convertReview.Response = &v1.ConversionResponse{
                UID:    convertReview.Request.UID,
                Result: metav1.Status{
                    Status:  metav1.StatusFailure,
                    Message: err.Error(),
                },
            }
            respondJSON(w, convertReview)
            return
        }

        // Marshal converted object
        convertedJSON, _ := json.Marshal(converted)
        convertedObjects = append(convertedObjects, runtime.RawExtension{
            Raw: convertedJSON,
        })
    }

    // Build successful response
    convertReview.Response = &v1.ConversionResponse{
        UID:              convertReview.Request.UID,
        ConvertedObjects: convertedObjects,
        Result: metav1.Status{
            Status: metav1.StatusSuccess,
        },
    }

    respondJSON(w, convertReview)
}

func respondJSON(w http.ResponseWriter, obj interface{}) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(obj)
}

func main() {
    http.HandleFunc("/convert", handleConvert)

    // Start HTTPS server with TLS
    fmt.Println("Starting conversion webhook server on :8443")
    err := http.ListenAndServeTLS(":8443", "/certs/tls.crt", "/certs/tls.key", nil)
    if err != nil {
        panic(err)
    }
}
```

This webhook handles bidirectional conversion between v1 and v2. When converting v1 to v2, it restructures the replicas field into a scaling object and renames containerImage to image.

## Deploying the Webhook

Package the webhook as a container and deploy it with a Service.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-conversion-webhook
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: conversion-webhook
  template:
    metadata:
      labels:
        app: conversion-webhook
    spec:
      containers:
      - name: webhook
        image: registry.example.com/conversion-webhook:v1.0.0
        ports:
        - containerPort: 8443
          name: webhook
        volumeMounts:
        - name: certs
          mountPath: /certs
          readOnly: true
      volumes:
      - name: certs
        secret:
          secretName: webhook-certs
---
apiVersion: v1
kind: Service
metadata:
  name: app-conversion-webhook
  namespace: default
spec:
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: conversion-webhook
```

## Generating TLS Certificates

Conversion webhooks require TLS. Generate certificates with cert-manager or manually with openssl.

```bash
# Generate CA key and certificate
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -days 365 -out ca.crt -subj "/CN=conversion-webhook-ca"

# Generate server key and CSR
openssl genrsa -out tls.key 2048
openssl req -new -key tls.key -out tls.csr -subj "/CN=app-conversion-webhook.default.svc"

# Sign the certificate
openssl x509 -req -in tls.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out tls.crt -days 365

# Create Kubernetes secret
kubectl create secret tls webhook-certs \
  --cert=tls.crt \
  --key=tls.key \
  -n default

# Get CA bundle for CRD
cat ca.crt | base64 | tr -d '\n'
```

Use the base64-encoded CA certificate in your CRD's caBundle field.

## Handling Complex Conversions

Some conversions require more than simple field mapping. Here's how to handle data transformations.

```go
// Converting from a flat structure to nested
func convertV1ToV2Complex(v1Obj *ApplicationV1) (*ApplicationV2, error) {
    v2Obj := &ApplicationV2{
        TypeMeta:   metav1.TypeMeta{APIVersion: "example.com/v2", Kind: "Application"},
        ObjectMeta: v1Obj.ObjectMeta,
    }

    // Split combined field into separate fields
    if v1Obj.Spec.ContainerImage != "" {
        parts := strings.SplitN(v1Obj.Spec.ContainerImage, ":", 2)
        v2Obj.Spec.Image = parts[0]
        if len(parts) > 1 {
            if v2Obj.Spec.Config == nil {
                v2Obj.Spec.Config = make(map[string]interface{})
            }
            v2Obj.Spec.Config["tag"] = parts[1]
        }
    }

    // Migrate old configuration format to new
    if v1Obj.Spec.Configuration != nil {
        v2Obj.Spec.Config = migrateConfig(v1Obj.Spec.Configuration)
    }

    return v2Obj, nil
}

func migrateConfig(oldConfig map[string]interface{}) map[string]interface{} {
    newConfig := make(map[string]interface{})

    // Rename keys
    if val, ok := oldConfig["timeout"]; ok {
        newConfig["requestTimeout"] = val
    }

    // Convert types
    if val, ok := oldConfig["retries"].(float64); ok {
        newConfig["maxRetries"] = int(val)
    }

    // Copy other fields
    for k, v := range oldConfig {
        if k != "timeout" && k != "retries" {
            newConfig[k] = v
        }
    }

    return newConfig
}
```

This handles renaming, restructuring, and type conversions during the migration.

## Testing Conversions

Test your webhook with resources in different versions.

```bash
# Create a v1 resource
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v1
kind: Application
metadata:
  name: test-app
spec:
  replicas: 3
  containerImage: nginx:latest
  configuration:
    timeout: 30
EOF

# Retrieve it as v2
kubectl get application test-app -o yaml --output-version=example.com/v2

# Create a v2 resource
cat <<EOF | kubectl apply -f -
apiVersion: example.com/v2
kind: Application
metadata:
  name: test-app-v2
spec:
  scaling:
    replicas: 5
  image: redis
  config:
    maxMemory: 256Mi
EOF

# Retrieve it as v1
kubectl get application test-app-v2 -o yaml --output-version=example.com/v1
```

Verify that fields convert correctly in both directions.

## Monitoring and Debugging

Add logging to track conversions and catch issues.

```go
func handleConvert(w http.ResponseWriter, r *http.Request) {
    log.Printf("Received conversion request from %s", r.RemoteAddr)

    // ... existing code ...

    log.Printf("Converting %d objects from %s to %s",
        len(convertReview.Request.Objects),
        convertReview.Request.Objects[0].Object.GetObjectKind().GroupVersionKind().Version,
        convertReview.Request.DesiredAPIVersion)

    // ... existing code ...

    log.Printf("Conversion successful, returning %d objects", len(convertedObjects))
}
```

Monitor webhook logs to identify conversion failures and performance issues.

## Conclusion

Conversion webhooks enable sophisticated API versioning for Custom Resource Definitions. They let you evolve your API schema while maintaining backward compatibility with existing resources.

Start by designing your v2 schema with clear improvements over v1. Implement bidirectional conversion functions that handle all field mappings. Test thoroughly with resources created in both versions. Deploy your webhook with high availability and monitor for conversion errors.

The upfront investment in conversion webhooks pays off by giving you flexibility to improve your API over time without breaking existing users.
