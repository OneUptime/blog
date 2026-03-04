# How to Handle CRD Version Upgrades with Conversion Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, Webhooks

Description: Master Custom Resource Definition version upgrades using conversion webhooks to migrate between API versions seamlessly while maintaining backward compatibility in Kubernetes.

---

Custom Resource Definitions evolve over time, requiring version changes to add features, fix design issues, or remove deprecated fields. Conversion webhooks enable smooth transitions between CRD versions by automatically converting resources between different API versions, ensuring backward compatibility during upgrades.

## Understanding CRD Versioning

CRDs can have multiple versions defined simultaneously, with one marked as the storage version. When you upgrade a CRD to a new version, existing resources remain stored in the old version until converted. Conversion webhooks handle this translation transparently.

Without conversion webhooks, you would need to manually migrate all existing custom resources to the new version, risking downtime and data loss. Conversion webhooks automate this process, converting between versions on-the-fly as resources are accessed.

## Planning Your CRD Version Migration

Before implementing conversion webhooks, plan your version migration strategy. Determine which fields are being added, removed, or renamed. Decide whether to use automatic or manual conversion strategies. Consider whether you need bidirectional conversion or only forward migration.

A typical migration path involves defining both old and new versions in the CRD, implementing conversion webhook logic, deploying the webhook service, updating the CRD to reference the webhook, testing conversions thoroughly, and finally deprecating old versions.

## Defining Multi-Version CRDs

Start by defining your CRD with multiple versions. Here's an example migrating from v1alpha1 to v1beta1:

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
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    storage: false
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
              image:
                type: string
              port:
                type: integer
  - name: v1beta1
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
              containers:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    image:
                      type: string
                    ports:
                      type: array
                      items:
                        type: object
                        properties:
                          containerPort:
                            type: integer
                          protocol:
                            type: string
  conversion:
    strategy: Webhook
    webhook:
      clientConfig:
        service:
          namespace: default
          name: application-conversion-webhook
          path: /convert
        caBundle: LS0tLS1CRUdJTi... # Base64 encoded CA certificate
      conversionReviewVersions:
      - v1
      - v1beta1
```

Notice the conversion strategy is set to Webhook, pointing to a service that will handle conversion requests.

## Implementing the Conversion Webhook

Create a webhook service that converts between CRD versions. Here's a Go implementation:

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"

    apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
)

// V1Alpha1Application represents the old version
type V1Alpha1Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec              V1Alpha1Spec `json:"spec"`
}

type V1Alpha1Spec struct {
    Replicas int32  `json:"replicas"`
    Image    string `json:"image"`
    Port     int32  `json:"port"`
}

// V1Beta1Application represents the new version
type V1Beta1Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec              V1Beta1Spec `json:"spec"`
}

type V1Beta1Spec struct {
    Replicas   int32       `json:"replicas"`
    Containers []Container `json:"containers"`
}

type Container struct {
    Name  string `json:"name"`
    Image string `json:"image"`
    Ports []Port `json:"ports"`
}

type Port struct {
    ContainerPort int32  `json:"containerPort"`
    Protocol      string `json:"protocol"`
}

func convertV1Alpha1ToV1Beta1(src *V1Alpha1Application) (*V1Beta1Application, error) {
    dst := &V1Beta1Application{
        TypeMeta:   src.TypeMeta,
        ObjectMeta: src.ObjectMeta,
        Spec: V1Beta1Spec{
            Replicas: src.Spec.Replicas,
            Containers: []Container{
                {
                    Name:  "main",
                    Image: src.Spec.Image,
                    Ports: []Port{
                        {
                            ContainerPort: src.Spec.Port,
                            Protocol:      "TCP",
                        },
                    },
                },
            },
        },
    }
    return dst, nil
}

func convertV1Beta1ToV1Alpha1(src *V1Beta1Application) (*V1Alpha1Application, error) {
    // Extract first container info for backward compatibility
    if len(src.Spec.Containers) == 0 {
        return nil, fmt.Errorf("no containers defined in v1beta1 spec")
    }

    container := src.Spec.Containers[0]
    port := int32(8080) // default port
    if len(container.Ports) > 0 {
        port = container.Ports[0].ContainerPort
    }

    dst := &V1Alpha1Application{
        TypeMeta:   src.TypeMeta,
        ObjectMeta: src.ObjectMeta,
        Spec: V1Alpha1Spec{
            Replicas: src.Spec.Replicas,
            Image:    container.Image,
            Port:     port,
        },
    }
    return dst, nil
}

func convertHandler(w http.ResponseWriter, r *http.Request) {
    // Read conversion review request
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    var conversionReview apiextensionsv1.ConversionReview
    if err := json.Unmarshal(body, &conversionReview); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Process conversion request
    convertedObjects := []runtime.RawExtension{}
    for _, obj := range conversionReview.Request.Objects {
        var converted runtime.RawExtension

        // Determine source and target versions
        src := conversionReview.Request.Objects[0]
        desiredVersion := conversionReview.Request.DesiredAPIVersion

        var srcObj map[string]interface{}
        if err := json.Unmarshal(src.Raw, &srcObj); err != nil {
            sendError(w, conversionReview.Request.UID, err)
            return
        }

        currentVersion := srcObj["apiVersion"].(string)

        // Perform conversion based on versions
        if currentVersion == "example.com/v1alpha1" && desiredVersion == "example.com/v1beta1" {
            var v1alpha1Obj V1Alpha1Application
            if err := json.Unmarshal(obj.Raw, &v1alpha1Obj); err != nil {
                sendError(w, conversionReview.Request.UID, err)
                return
            }

            v1beta1Obj, err := convertV1Alpha1ToV1Beta1(&v1alpha1Obj)
            if err != nil {
                sendError(w, conversionReview.Request.UID, err)
                return
            }

            v1beta1Obj.APIVersion = desiredVersion
            convertedBytes, err := json.Marshal(v1beta1Obj)
            if err != nil {
                sendError(w, conversionReview.Request.UID, err)
                return
            }
            converted = runtime.RawExtension{Raw: convertedBytes}

        } else if currentVersion == "example.com/v1beta1" && desiredVersion == "example.com/v1alpha1" {
            var v1beta1Obj V1Beta1Application
            if err := json.Unmarshal(obj.Raw, &v1beta1Obj); err != nil {
                sendError(w, conversionReview.Request.UID, err)
                return
            }

            v1alpha1Obj, err := convertV1Beta1ToV1Alpha1(&v1beta1Obj)
            if err != nil {
                sendError(w, conversionReview.Request.UID, err)
                return
            }

            v1alpha1Obj.APIVersion = desiredVersion
            convertedBytes, err := json.Marshal(v1alpha1Obj)
            if err != nil {
                sendError(w, conversionReview.Request.UID, err)
                return
            }
            converted = runtime.RawExtension{Raw: convertedBytes}

        } else {
            // No conversion needed
            converted = obj
        }

        convertedObjects = append(convertedObjects, converted)
    }

    // Send success response
    conversionReview.Response = &apiextensionsv1.ConversionResponse{
        UID:              conversionReview.Request.UID,
        ConvertedObjects: convertedObjects,
        Result: metav1.Status{
            Status: "Success",
        },
    }

    responseBytes, err := json.Marshal(conversionReview)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(responseBytes)
}

func sendError(w http.ResponseWriter, uid string, err error) {
    response := apiextensionsv1.ConversionReview{
        Response: &apiextensionsv1.ConversionResponse{
            UID: uid,
            Result: metav1.Status{
                Status:  "Failure",
                Message: err.Error(),
            },
        },
    }
    responseBytes, _ := json.Marshal(response)
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write(responseBytes)
}

func main() {
    http.HandleFunc("/convert", convertHandler)
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    fmt.Println("Conversion webhook server starting on :8443")
    if err := http.ListenAndServeTLS(":8443", "/certs/tls.crt", "/certs/tls.key", nil); err != nil {
        panic(err)
    }
}
```

## Deploying the Conversion Webhook

Package your webhook as a Kubernetes deployment with proper TLS configuration:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: application-conversion-webhook
  namespace: default
spec:
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: conversion-webhook
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: application-conversion-webhook
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
        image: myorg/application-conversion-webhook:v1.0.0
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: certs
          mountPath: /certs
          readOnly: true
        livenessProbe:
          httpGet:
            path: /health
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 10
          periodSeconds: 10
        resources:
          limits:
            cpu: 200m
            memory: 256Mi
          requests:
            cpu: 100m
            memory: 128Mi
      volumes:
      - name: certs
        secret:
          secretName: conversion-webhook-certs
```

Generate TLS certificates for the webhook:

```bash
#!/bin/bash
# generate-webhook-certs.sh

SERVICE_NAME="application-conversion-webhook"
NAMESPACE="default"
SECRET_NAME="conversion-webhook-certs"

# Generate CA key and certificate
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -days 365 -out ca.crt -subj "/CN=conversion-ca"

# Generate webhook key and CSR
openssl genrsa -out webhook.key 2048
openssl req -new -key webhook.key -out webhook.csr \
  -subj "/CN=${SERVICE_NAME}.${NAMESPACE}.svc"

# Create config for SAN
cat > webhook.ext << EOF
subjectAltName = DNS:${SERVICE_NAME}.${NAMESPACE}.svc,DNS:${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local
EOF

# Sign webhook certificate
openssl x509 -req -in webhook.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out webhook.crt -days 365 -extfile webhook.ext

# Create Kubernetes secret
kubectl create secret tls $SECRET_NAME \
  --cert=webhook.crt \
  --key=webhook.key \
  -n $NAMESPACE

# Get CA bundle for CRD
CA_BUNDLE=$(cat ca.crt | base64 | tr -d '\n')
echo "CA Bundle for CRD: $CA_BUNDLE"
```

## Testing Conversion Webhooks

Verify that conversions work correctly before upgrading production CRDs:

```bash
#!/bin/bash
# test-crd-conversion.sh

# Create a resource using v1alpha1
cat > test-v1alpha1.yaml << 'EOF'
apiVersion: example.com/v1alpha1
kind: Application
metadata:
  name: test-app
spec:
  replicas: 3
  image: nginx:1.21
  port: 8080
EOF

kubectl apply -f test-v1alpha1.yaml

# Retrieve as v1beta1 to test conversion
kubectl get application test-app -o yaml | grep "apiVersion: example.com/v1beta1"

if [ $? -eq 0 ]; then
  echo "Conversion test PASSED: v1alpha1 to v1beta1"
else
  echo "Conversion test FAILED"
  exit 1
fi

# Verify converted fields
kubectl get application test-app -o jsonpath='{.spec.containers[0].image}'
kubectl get application test-app -o jsonpath='{.spec.containers[0].ports[0].containerPort}'

# Create a resource using v1beta1
cat > test-v1beta1.yaml << 'EOF'
apiVersion: example.com/v1beta1
kind: Application
metadata:
  name: test-app-v2
spec:
  replicas: 2
  containers:
  - name: web
    image: httpd:2.4
    ports:
    - containerPort: 80
      protocol: TCP
EOF

kubectl apply -f test-v1beta1.yaml

# Retrieve as v1alpha1 to test backward conversion
kubectl get application test-app-v2 -o yaml --v=v1alpha1

echo "Conversion tests complete"
```

## Migrating Existing Resources

After deploying conversion webhooks, migrate existing resources to the new storage version:

```bash
#!/bin/bash
# migrate-crd-storage-version.sh

CRD_NAME="applications.example.com"
OLD_VERSION="v1alpha1"
NEW_VERSION="v1beta1"

echo "Migrating $CRD_NAME from $OLD_VERSION to $NEW_VERSION..."

# Get all resources
RESOURCES=$(kubectl get applications -A -o json)

# Re-apply each resource to trigger conversion
echo "$RESOURCES" | jq -r '.items[] |
  "\(.metadata.namespace) \(.metadata.name)"' | while read ns name; do

  echo "Migrating $ns/$name..."
  kubectl get application $name -n $ns -o json | \
    jq --arg newVersion "example.com/$NEW_VERSION" '.apiVersion = $newVersion' | \
    kubectl apply -f -
done

# Update CRD to make new version the storage version
kubectl patch crd $CRD_NAME --type=json -p='[
  {"op": "replace", "path": "/spec/versions/0/storage", "value": false},
  {"op": "replace", "path": "/spec/versions/1/storage", "value": true}
]'

echo "Migration complete"
```

## Monitoring Conversion Webhook Performance

Track conversion webhook metrics to ensure good performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: 'conversion-webhook'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - default
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: conversion-webhook
```

Add metrics to your webhook code:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    conversionDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "crd_conversion_duration_seconds",
            Help: "Duration of CRD conversions",
        },
        []string{"from_version", "to_version", "result"},
    )
)

func init() {
    prometheus.MustRegister(conversionDuration)
}

// In main function
http.Handle("/metrics", promhttp.Handler())
```

Handling CRD version upgrades with conversion webhooks provides a smooth path for evolving your custom resources without breaking existing deployments. By implementing robust conversion logic, thorough testing, and proper monitoring, you can confidently upgrade CRDs while maintaining backward compatibility and system stability.
