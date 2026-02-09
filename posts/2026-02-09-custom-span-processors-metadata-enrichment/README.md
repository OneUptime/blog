# How to Build Custom Span Processors for Kubernetes Metadata Enrichment in Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTelemetry, Distributed Tracing, Observability, Metadata

Description: Learn how to build custom OpenTelemetry span processors that automatically enrich traces with Kubernetes metadata including deployment information, resource quotas, and cluster context for better observability.

---

Default OpenTelemetry instrumentation captures application-level information but often misses valuable Kubernetes context. Custom span processors solve this by automatically enriching every span with cluster metadata, deployment details, and runtime information before traces are exported to backends.

Span processors sit in the OpenTelemetry pipeline between span creation and export. They can modify spans, add attributes, filter spans, or perform any custom logic. For Kubernetes environments, processors can query the Kubernetes API, read pod annotations, or extract metadata from environment variables to enrich traces with operational context.

## Understanding Span Processors

OpenTelemetry provides two built-in span processors. The SimpleSpanProcessor exports spans immediately as they complete. The BatchSpanProcessor collects spans and exports them in batches. Custom processors implement the same interface, allowing you to insert custom logic into the trace pipeline.

Span processors receive callbacks when spans start and end. The OnStart callback lets you modify spans when they begin. The OnEnd callback processes completed spans before export. Custom processors can add attributes, create span events, or even drop spans based on criteria.

## Building a Kubernetes Metadata Processor

Create a custom processor that enriches spans with Kubernetes metadata:

```go
// kubernetes_processor.go
package processor

import (
    "context"
    "os"
    "sync"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/sdk/trace"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

// KubernetesMetadataProcessor enriches spans with Kubernetes metadata
type KubernetesMetadataProcessor struct {
    client        *kubernetes.Clientset
    namespace     string
    podName       string
    nodeName      string
    metadata      *CachedMetadata
    metadataMutex sync.RWMutex
}

type CachedMetadata struct {
    DeploymentName  string
    ReplicaSetName  string
    Labels          map[string]string
    Annotations     map[string]string
    OwnerReferences []string
    NodeLabels      map[string]string
    ResourceLimits  ResourceLimits
}

type ResourceLimits struct {
    CPURequest    string
    CPULimit      string
    MemoryRequest string
    MemoryLimit   string
}

func NewKubernetesMetadataProcessor() (*KubernetesMetadataProcessor, error) {
    // Create in-cluster config
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    client, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    processor := &KubernetesMetadataProcessor{
        client:    client,
        namespace: os.Getenv("K8S_NAMESPACE"),
        podName:   os.Getenv("K8S_POD_NAME"),
        nodeName:  os.Getenv("K8S_NODE_NAME"),
    }

    // Load metadata on initialization
    if err := processor.refreshMetadata(); err != nil {
        return nil, err
    }

    return processor, nil
}

func (p *KubernetesMetadataProcessor) refreshMetadata() error {
    ctx := context.Background()

    // Get pod details
    pod, err := p.client.CoreV1().Pods(p.namespace).Get(ctx, p.podName, metav1.GetOptions{})
    if err != nil {
        return err
    }

    // Get node details
    node, err := p.client.CoreV1().Nodes().Get(ctx, p.nodeName, metav1.GetOptions{})
    if err != nil {
        return err
    }

    metadata := &CachedMetadata{
        Labels:      pod.Labels,
        Annotations: pod.Annotations,
        NodeLabels:  node.Labels,
    }

    // Extract deployment and replicaset from owner references
    for _, owner := range pod.OwnerReferences {
        metadata.OwnerReferences = append(metadata.OwnerReferences, owner.Name)
        if owner.Kind == "ReplicaSet" {
            metadata.ReplicaSetName = owner.Name
            // Try to get deployment name from replicaset
            rs, err := p.client.AppsV1().ReplicaSets(p.namespace).Get(ctx, owner.Name, metav1.GetOptions{})
            if err == nil {
                for _, rsOwner := range rs.OwnerReferences {
                    if rsOwner.Kind == "Deployment" {
                        metadata.DeploymentName = rsOwner.Name
                        break
                    }
                }
            }
        }
    }

    // Extract resource limits
    for _, container := range pod.Spec.Containers {
        if limits := container.Resources.Limits; limits != nil {
            if cpu := limits.Cpu(); cpu != nil {
                metadata.ResourceLimits.CPULimit = cpu.String()
            }
            if mem := limits.Memory(); mem != nil {
                metadata.ResourceLimits.MemoryLimit = mem.String()
            }
        }
        if requests := container.Resources.Requests; requests != nil {
            if cpu := requests.Cpu(); cpu != nil {
                metadata.ResourceLimits.CPURequest = cpu.String()
            }
            if mem := requests.Memory(); mem != nil {
                metadata.ResourceLimits.MemoryRequest = mem.String()
            }
        }
        break // Only process first container
    }

    p.metadataMutex.Lock()
    p.metadata = metadata
    p.metadataMutex.Unlock()

    return nil
}

func (p *KubernetesMetadataProcessor) OnStart(parent context.Context, s trace.ReadWriteSpan) {
    // Add metadata when span starts
    p.metadataMutex.RLock()
    defer p.metadataMutex.RUnlock()

    if p.metadata == nil {
        return
    }

    attrs := []attribute.KeyValue{
        attribute.String("k8s.namespace", p.namespace),
        attribute.String("k8s.pod.name", p.podName),
        attribute.String("k8s.node.name", p.nodeName),
    }

    if p.metadata.DeploymentName != "" {
        attrs = append(attrs, attribute.String("k8s.deployment.name", p.metadata.DeploymentName))
    }

    if p.metadata.ReplicaSetName != "" {
        attrs = append(attrs, attribute.String("k8s.replicaset.name", p.metadata.ReplicaSetName))
    }

    // Add important labels
    for key, value := range p.metadata.Labels {
        if key == "app" || key == "version" || key == "environment" {
            attrs = append(attrs, attribute.String("k8s.label."+key, value))
        }
    }

    // Add resource limits
    if p.metadata.ResourceLimits.CPULimit != "" {
        attrs = append(attrs,
            attribute.String("k8s.container.cpu.limit", p.metadata.ResourceLimits.CPULimit),
            attribute.String("k8s.container.cpu.request", p.metadata.ResourceLimits.CPURequest),
            attribute.String("k8s.container.memory.limit", p.metadata.ResourceLimits.MemoryLimit),
            attribute.String("k8s.container.memory.request", p.metadata.ResourceLimits.MemoryRequest),
        )
    }

    // Add node labels
    if zone, ok := p.metadata.NodeLabels["topology.kubernetes.io/zone"]; ok {
        attrs = append(attrs, attribute.String("k8s.node.zone", zone))
    }

    if instanceType, ok := p.metadata.NodeLabels["node.kubernetes.io/instance-type"]; ok {
        attrs = append(attrs, attribute.String("k8s.node.instance_type", instanceType))
    }

    s.SetAttributes(attrs...)
}

func (p *KubernetesMetadataProcessor) OnEnd(s trace.ReadOnlySpan) {
    // No-op for OnEnd
}

func (p *KubernetesMetadataProcessor) Shutdown(ctx context.Context) error {
    return nil
}

func (p *KubernetesMetadataProcessor) ForceFlush(ctx context.Context) error {
    return nil
}
```

## Implementing a Cost Attribution Processor

Create a processor that adds cost-related metadata for chargeback:

```go
// cost_attribution_processor.go
package processor

import (
    "context"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/sdk/trace"
)

type CostAttributionProcessor struct {
    costCenter string
    team       string
    project    string
}

func NewCostAttributionProcessor(annotations map[string]string) *CostAttributionProcessor {
    return &CostAttributionProcessor{
        costCenter: annotations["cost-center"],
        team:       annotations["team"],
        project:    annotations["project"],
    }
}

func (p *CostAttributionProcessor) OnStart(parent context.Context, s trace.ReadWriteSpan) {
    attrs := []attribute.KeyValue{}

    if p.costCenter != "" {
        attrs = append(attrs, attribute.String("cost.center", p.costCenter))
    }

    if p.team != "" {
        attrs = append(attrs, attribute.String("team.name", p.team))
    }

    if p.project != "" {
        attrs = append(attrs, attribute.String("project.name", p.project))
    }

    s.SetAttributes(attrs...)
}

func (p *CostAttributionProcessor) OnEnd(s trace.ReadOnlySpan) {}

func (p *CostAttributionProcessor) Shutdown(ctx context.Context) error {
    return nil
}

func (p *CostAttributionProcessor) ForceFlush(ctx context.Context) error {
    return nil
}
```

## Registering Custom Processors

Configure the tracer provider with custom processors:

```go
// main.go
package main

import (
    "context"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() (*trace.TracerProvider, error) {
    ctx := context.Background()

    // Create OTLP exporter
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    // Create Kubernetes metadata processor
    k8sProcessor, err := processor.NewKubernetesMetadataProcessor()
    if err != nil {
        log.Printf("Failed to create Kubernetes processor: %v", err)
    }

    // Create cost attribution processor
    costProcessor := processor.NewCostAttributionProcessor(map[string]string{
        "cost-center": "engineering",
        "team":        "payments",
        "project":     "checkout",
    })

    // Create tracer provider with custom processors
    tp := trace.NewTracerProvider(
        trace.WithSpanProcessor(k8sProcessor),
        trace.WithSpanProcessor(costProcessor),
        trace.WithBatcher(exporter),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}

func main() {
    tp, err := initTracer()
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(context.Background())

    // Application code
    log.Println("Application started with enriched tracing")
}
```

## Deploying with RBAC Permissions

Configure RBAC for the Kubernetes API access:

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: traced-app
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["replicasets", "deployments"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: traced-app-pod-reader
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: pod-reader
subjects:
- kind: ServiceAccount
  name: traced-app
  namespace: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
  annotations:
    cost-center: "engineering"
    team: "payments"
    project: "checkout"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        version: v1.0.0
    spec:
      serviceAccountName: traced-app
      containers:
      - name: payment-service
        image: payment-service:v1.0.0
        env:
        - name: K8S_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: K8S_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
```

Custom span processors transform generic traces into rich, context-aware records. By automatically enriching spans with Kubernetes metadata, you create traces that provide operational insights and accelerate debugging in complex distributed systems.
