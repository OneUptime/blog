# How to Set Up API Aggregation Layer for Custom API Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, API Aggregation

Description: Learn how to configure the Kubernetes API aggregation layer to integrate custom API servers and extend the Kubernetes API surface with custom resources and endpoints.

---

Custom Resource Definitions work great for most extension scenarios. But sometimes you need capabilities that CRDs can't provide. Maybe you need custom authentication, complex versioning strategies, or integration with external systems. That's when you build a custom API server.

The API aggregation layer lets you integrate custom API servers seamlessly into Kubernetes. Your custom APIs appear alongside built-in resources. Users access them through the same kubectl commands and API clients. This guide walks you through setting up API aggregation.

## Understanding API Aggregation

The API aggregation layer acts as a proxy. When a request comes in for a custom API group, the Kubernetes API server forwards it to your custom API server. The response flows back through the aggregation layer to the client.

This architecture gives you full control over API implementation while maintaining a unified API surface. Users don't need to know which APIs are built-in and which are custom. Everything works through the standard Kubernetes API endpoint.

## Prerequisites

You need a running Kubernetes cluster with API aggregation enabled. Most clusters have this enabled by default since Kubernetes 1.7.

Check if aggregation is enabled.

```bash
kubectl api-versions | grep apiregistration
```

You should see `apiregistration.k8s.io/v1`. If not, you need to enable aggregation in your API server configuration.

## Creating a Custom API Server

Let's build a simple custom API server that serves a custom resource type. We'll use the apiserver-builder framework to scaffold the project.

First, install apiserver-builder.

```bash
go install sigs.k8s.io/apiserver-builder-alpha/cmd/apiserver-boot@latest
```

Create a new API server project.

```bash
mkdir custom-api-server
cd custom-api-server
apiserver-boot init repo --domain example.com
```

Create a new resource type.

```bash
apiserver-boot create group version resource --group metrics --version v1 --kind MetricSnapshot
```

This scaffolds the basic structure. Edit the resource definition in `pkg/apis/metrics/v1/metricsnapshot_types.go`.

```go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +genclient
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// MetricSnapshot represents a snapshot of metrics at a point in time
type MetricSnapshot struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   MetricSnapshotSpec   `json:"spec,omitempty"`
    Status MetricSnapshotStatus `json:"status,omitempty"`
}

type MetricSnapshotSpec struct {
    Source    string   `json:"source"`
    Metrics   []string `json:"metrics"`
    Interval  string   `json:"interval"`
}

type MetricSnapshotStatus struct {
    LastCollectionTime metav1.Time              `json:"lastCollectionTime,omitempty"`
    Data               map[string]float64       `json:"data,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// MetricSnapshotList contains a list of MetricSnapshot
type MetricSnapshotList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []MetricSnapshot `json:"items"`
}
```

Build the API server.

```bash
apiserver-boot build executables
```

This generates the API server binary and associated files.

## Building and Deploying the API Server

Create a Docker image for your API server.

```bash
# Create Dockerfile
cat > Dockerfile <<EOF
FROM golang:1.21 as builder
WORKDIR /workspace
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o apiserver ./cmd/apiserver

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /workspace/apiserver .
ENTRYPOINT ["./apiserver"]
EOF

# Build and push image
docker build -t registry.example.com/custom-apiserver:v1.0.0 .
docker push registry.example.com/custom-apiserver:v1.0.0
```

Deploy the API server to your Kubernetes cluster.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: custom-apiserver

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: custom-apiserver
  namespace: custom-apiserver

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-apiserver
rules:
- apiGroups:
  - ""
  resources:
  - namespaces
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - admissionregistration.k8s.io
  resources:
  - mutatingwebhookconfigurations
  - validatingwebhookconfigurations
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - authorization.k8s.io
  resources:
  - subjectaccessreviews
  verbs:
  - create

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: custom-apiserver
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: custom-apiserver
subjects:
- kind: ServiceAccount
  name: custom-apiserver
  namespace: custom-apiserver

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-apiserver
  namespace: custom-apiserver
spec:
  replicas: 2
  selector:
    matchLabels:
      app: custom-apiserver
  template:
    metadata:
      labels:
        app: custom-apiserver
    spec:
      serviceAccountName: custom-apiserver
      containers:
      - name: apiserver
        image: registry.example.com/custom-apiserver:v1.0.0
        args:
        - --etcd-servers=http://etcd:2379
        - --secure-port=6443
        - --cert-dir=/var/run/apiserver
        - --v=4
        ports:
        - containerPort: 6443
          name: secure
        volumeMounts:
        - name: certs
          mountPath: /var/run/apiserver
          readOnly: true
      volumes:
      - name: certs
        secret:
          secretName: custom-apiserver-certs

---
apiVersion: v1
kind: Service
metadata:
  name: custom-apiserver
  namespace: custom-apiserver
spec:
  ports:
  - port: 443
    targetPort: 6443
  selector:
    app: custom-apiserver
```

## Generating TLS Certificates

The API server needs TLS certificates for secure communication.

```bash
# Generate CA
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -days 365 -out ca.crt -subj "/CN=custom-apiserver-ca"

# Generate server certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=custom-apiserver.custom-apiserver.svc"

# Sign server certificate
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365

# Create Kubernetes secret
kubectl create secret generic custom-apiserver-certs \
  -n custom-apiserver \
  --from-file=tls.crt=server.crt \
  --from-file=tls.key=server.key
```

## Registering with API Aggregation

Create an APIService resource to register your custom API server.

```yaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1.metrics.example.com
spec:
  service:
    name: custom-apiserver
    namespace: custom-apiserver
    port: 443
  group: metrics.example.com
  version: v1
  insecureSkipTLSVerify: false
  caBundle: LS0tLS1CRUdJTi... # base64 encoded CA certificate
  groupPriorityMinimum: 1000
  versionPriority: 15
```

The caBundle must contain the base64-encoded CA certificate.

```bash
cat ca.crt | base64 | tr -d '\n'
```

Apply the APIService registration.

```bash
kubectl apply -f apiservice.yaml
```

## Verifying the Integration

Check that the API server is registered and available.

```bash
kubectl get apiservices | grep metrics
```

You should see your API service with status "True" in the AVAILABLE column.

List the API groups to confirm your custom group appears.

```bash
kubectl api-versions | grep metrics
```

You should see `metrics.example.com/v1`.

## Using the Custom API

Now you can interact with your custom API like any other Kubernetes resource.

```bash
# Create a MetricSnapshot
cat <<EOF | kubectl apply -f -
apiVersion: metrics.example.com/v1
kind: MetricSnapshot
metadata:
  name: app-metrics
  namespace: default
spec:
  source: prometheus
  metrics:
  - cpu_usage
  - memory_usage
  - request_count
  interval: 1m
EOF

# List MetricSnapshots
kubectl get metricsnapshots

# Get details
kubectl get metricsnapshot app-metrics -o yaml

# Delete
kubectl delete metricsnapshot app-metrics
```

All standard kubectl commands work with your custom resources.

## Implementing Custom Storage

By default, apiserver-builder uses etcd for storage. You can implement custom storage backends for integration with external systems.

```go
package storage

import (
    "context"

    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apiserver/pkg/registry/rest"

    metricsv1 "example.com/custom-apiserver/pkg/apis/metrics/v1"
)

type MetricSnapshotStorage struct {
    // Custom storage implementation
    externalDB *ExternalDatabase
}

func (s *MetricSnapshotStorage) Create(
    ctx context.Context,
    obj runtime.Object,
    createValidation rest.ValidateObjectFunc,
    options *metav1.CreateOptions,
) (runtime.Object, error) {
    snapshot := obj.(*metricsv1.MetricSnapshot)

    // Store in external database
    if err := s.externalDB.Store(snapshot); err != nil {
        return nil, err
    }

    return snapshot, nil
}

func (s *MetricSnapshotStorage) Get(
    ctx context.Context,
    name string,
    options *metav1.GetOptions,
) (runtime.Object, error) {
    // Retrieve from external database
    snapshot, err := s.externalDB.Retrieve(name)
    if err != nil {
        return nil, err
    }

    return snapshot, nil
}

// Implement other storage interface methods...
```

This lets you integrate with databases, caching systems, or external APIs as your backend storage.

## Monitoring and Debugging

Check the API server logs for issues.

```bash
kubectl logs -n custom-apiserver deployment/custom-apiserver
```

Monitor API service status.

```bash
kubectl get apiservice v1.metrics.example.com -o yaml
```

Look for conditions that indicate problems.

## Best Practices

Use high availability deployment with multiple replicas. API servers should be resilient to pod failures.

Implement proper authentication and authorization. Integrate with Kubernetes RBAC for consistent access control.

Version your APIs properly. Support multiple versions with conversion webhooks when making breaking changes.

Monitor performance and set appropriate resource limits. API servers can become bottlenecks if not properly sized.

Use dedicated etcd storage for your custom API server. Don't share etcd with the main Kubernetes API server.

## Conclusion

The API aggregation layer enables sophisticated Kubernetes extensions beyond what CRDs can provide. While CRDs are sufficient for most use cases, custom API servers give you complete control over API behavior, storage, and integration.

Set up aggregation when you need custom authentication, complex versioning, or integration with external data sources. Build your API server with proper tooling like apiserver-builder. Deploy with high availability and proper monitoring. Register through APIService resources to integrate seamlessly.

The complexity is higher than CRDs, but the flexibility can be essential for advanced platform engineering scenarios.
