# How to Set Up Kubernetes Audit Sink for Real-Time Audit Event Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Audit, Compliance

Description: Learn how to configure Kubernetes audit sinks to stream audit events in real-time to external systems for security monitoring, compliance tracking, and threat detection.

---

Kubernetes audit logging captures all requests made to the API server, but writing audit logs to files has limitations. Audit sinks enable real-time streaming of audit events to external systems like SIEM tools, security monitoring platforms, or custom applications. This allows immediate detection of suspicious activity and compliance violations.

## Understanding Audit Sinks vs Audit Logs

Traditional audit logging writes events to log files on disk. The API server processes audit events, formats them according to policy, and writes them to files. You must then ship these files to analysis systems using log collectors.

Audit sinks send events directly to webhooks as they occur. The API server makes HTTP POST requests to configured endpoints with audit event batches. This eliminates the need for file-based log collection and provides near-instant event delivery.

## Configuring Dynamic Audit Sinks

Kubernetes supports dynamic audit configuration through AuditSink resources. Enable the dynamic auditing feature:

```bash
# Edit API server manifest
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

Add the feature gate and audit configuration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    # Enable dynamic auditing
    - --feature-gates=DynamicAuditing=true
    # Configure audit policy
    - --audit-policy-file=/etc/kubernetes/audit/policy.yaml
    # Other flags...
    volumeMounts:
    - name: audit-policy
      mountPath: /etc/kubernetes/audit
      readOnly: true
  volumes:
  - name: audit-policy
    hostPath:
      path: /etc/kubernetes/audit
      type: DirectoryOrCreate
```

Create an audit policy:

```bash
sudo mkdir -p /etc/kubernetes/audit
sudo nano /etc/kubernetes/audit/policy.yaml
```

Define what events to capture:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log Secret access at Metadata level
  - level: Metadata
    resources:
    - group: ""
      resources: ["secrets"]

  # Log pod changes at Request level
  - level: Request
    resources:
    - group: ""
      resources: ["pods"]
    verbs: ["create", "update", "patch", "delete"]

  # Log authentication failures
  - level: RequestResponse
    userGroups: ["system:unauthenticated"]

  # Don't log read-only requests
  - level: None
    verbs: ["get", "list", "watch"]

  # Log everything else at Metadata level
  - level: Metadata
```

## Creating an Audit Sink Webhook Receiver

Deploy a webhook service to receive audit events. Here's a simple receiver using Go:

```go
// audit-receiver.go
package main

import (
    "encoding/json"
    "io"
    "log"
    "net/http"
    "time"

    auditv1 "k8s.io/apiserver/pkg/apis/audit/v1"
)

type AuditEventHandler struct{}

func (h *AuditEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    body, err := io.ReadAll(r.Body)
    if err != nil {
        log.Printf("Error reading body: %v", err)
        http.Error(w, "Error reading request", http.StatusBadRequest)
        return
    }
    defer r.Body.Close()

    var eventList auditv1.EventList
    if err := json.Unmarshal(body, &eventList); err != nil {
        log.Printf("Error unmarshaling audit events: %v", err)
        http.Error(w, "Invalid audit event format", http.StatusBadRequest)
        return
    }

    // Process each audit event
    for _, event := range eventList.Items {
        processAuditEvent(&event)
    }

    w.WriteHeader(http.StatusOK)
}

func processAuditEvent(event *auditv1.Event) {
    log.Printf("Audit Event: %s %s %s by %s at %v",
        event.Verb,
        event.ObjectRef.Resource,
        event.ObjectRef.Name,
        event.User.Username,
        event.RequestReceivedTimestamp.Time)

    // Here you would send to SIEM, database, etc.
    // For example, send to Elasticsearch, Splunk, or custom analytics
}

func main() {
    http.Handle("/audit", &AuditEventHandler{})

    server := &http.Server{
        Addr:         ":8443",
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    log.Println("Audit sink receiver listening on :8443")
    log.Fatal(server.ListenAndServeTLS("/certs/tls.crt", "/certs/tls.key"))
}
```

Deploy the receiver as a Kubernetes service:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: audit-receiver
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: audit-receiver
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: audit-receiver
  template:
    metadata:
      labels:
        app: audit-receiver
    spec:
      serviceAccountName: audit-receiver
      containers:
      - name: receiver
        image: audit-receiver:latest
        ports:
        - containerPort: 8443
          name: https
        volumeMounts:
        - name: tls
          mountPath: /certs
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: tls
        secret:
          secretName: audit-receiver-tls
---
apiVersion: v1
kind: Service
metadata:
  name: audit-receiver
  namespace: kube-system
spec:
  selector:
    app: audit-receiver
  ports:
  - port: 443
    targetPort: 8443
    protocol: TCP
    name: https
  type: ClusterIP
```

Generate TLS certificates for the webhook:

```bash
# Generate private key
openssl genrsa -out tls.key 2048

# Generate certificate signing request
openssl req -new -key tls.key -out tls.csr \
  -subj "/CN=audit-receiver.kube-system.svc"

# Generate self-signed certificate
openssl x509 -req -days 365 -in tls.csr \
  -signkey tls.key -out tls.crt

# Create Kubernetes secret
kubectl create secret tls audit-receiver-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n kube-system
```

## Defining the AuditSink Resource

Create an AuditSink to stream events to your webhook:

```yaml
apiVersion: auditregistration.k8s.io/v1alpha1
kind: AuditSink
metadata:
  name: security-monitoring
spec:
  policy:
    # Stream events at RequestResponse level for security analysis
    level: RequestResponse
    # Only send specific events
    stages:
    - ResponseComplete
  webhook:
    # Batch events to reduce overhead
    throttle:
      qps: 10
      burst: 15
    clientConfig:
      # Reference to the webhook service
      service:
        namespace: kube-system
        name: audit-receiver
        path: /audit
      # CA bundle for TLS verification
      caBundle: <base64-encoded-ca-cert>
```

Get the CA bundle:

```bash
# Get CA bundle from the secret
kubectl get secret audit-receiver-tls -n kube-system \
  -o jsonpath='{.data.tls\.crt}'
```

Apply the AuditSink:

```bash
kubectl apply -f audit-sink.yaml

# Verify it's created
kubectl get auditsinks
kubectl describe auditsink security-monitoring
```

## Streaming to Elasticsearch

Send audit events to Elasticsearch for indexing and analysis:

```go
// elasticsearch-sink.go
package main

import (
    "bytes"
    "context"
    "encoding/json"
    "log"
    "net/http"

    "github.com/elastic/go-elasticsearch/v8"
    auditv1 "k8s.io/apiserver/pkg/apis/audit/v1"
)

type ElasticsearchSink struct {
    client *elasticsearch.Client
    index  string
}

func NewElasticsearchSink(addresses []string, index string) (*ElasticsearchSink, error) {
    cfg := elasticsearch.Config{
        Addresses: addresses,
    }

    client, err := elasticsearch.NewClient(cfg)
    if err != nil {
        return nil, err
    }

    return &ElasticsearchSink{
        client: client,
        index:  index,
    }, nil
}

func (s *ElasticsearchSink) HandleAuditEvents(events *auditv1.EventList) error {
    for _, event := range events.Items {
        if err := s.indexEvent(&event); err != nil {
            log.Printf("Failed to index event: %v", err)
        }
    }
    return nil
}

func (s *ElasticsearchSink) indexEvent(event *auditv1.Event) error {
    data, err := json.Marshal(event)
    if err != nil {
        return err
    }

    req := elasticsearch.IndexRequest{
        Index: s.index,
        Body:  bytes.NewReader(data),
    }

    res, err := req.Do(context.Background(), s.client)
    if err != nil {
        return err
    }
    defer res.Body.Close()

    if res.IsError() {
        log.Printf("Error indexing document: %s", res.Status())
    }

    return nil
}

func main() {
    sink, err := NewElasticsearchSink(
        []string{"http://elasticsearch:9200"},
        "kubernetes-audit",
    )
    if err != nil {
        log.Fatal(err)
    }

    http.HandleFunc("/audit", func(w http.ResponseWriter, r *http.Request) {
        var eventList auditv1.EventList
        if err := json.NewDecoder(r.Body).Decode(&eventList); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        if err := sink.HandleAuditEvents(&eventList); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusOK)
    })

    log.Fatal(http.ListenAndServeTLS(":8443", "/certs/tls.crt", "/certs/tls.key", nil))
}
```

## Filtering Events with Policies

Create targeted audit sinks for different use cases:

```yaml
# Security-focused sink for authentication and authorization
apiVersion: auditregistration.k8s.io/v1alpha1
kind: AuditSink
metadata:
  name: security-events
spec:
  policy:
    level: RequestResponse
    stages:
    - ResponseComplete
    omitStages:
    - RequestReceived
  webhook:
    throttle:
      qps: 10
      burst: 15
    clientConfig:
      service:
        namespace: security
        name: security-analytics
        path: /audit/security
      caBundle: <ca-bundle>
---
# Compliance-focused sink for resource changes
apiVersion: auditregistration.k8s.io/v1alpha1
kind: AuditSink
metadata:
  name: compliance-events
spec:
  policy:
    level: Request
    stages:
    - ResponseComplete
  webhook:
    throttle:
      qps: 20
      burst: 30
    clientConfig:
      service:
        namespace: compliance
        name: compliance-tracker
        path: /audit/compliance
      caBundle: <ca-bundle>
```

## Integrating with Falco for Runtime Security

Stream audit events to Falco for runtime security monitoring:

```yaml
apiVersion: auditregistration.k8s.io/v1alpha1
kind: AuditSink
metadata:
  name: falco-audit
spec:
  policy:
    level: RequestResponse
    stages:
    - ResponseComplete
  webhook:
    throttle:
      qps: 50
      burst: 100
    clientConfig:
      url: https://falco.security.svc:8765/k8s-audit
      caBundle: <falco-ca-bundle>
```

Deploy Falco to receive events:

```bash
# Add Falco Helm repository
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

# Install Falco with audit webhook enabled
helm install falco falcosecurity/falco \
  --namespace security \
  --create-namespace \
  --set webserver.enabled=true \
  --set webserver.k8sAuditEndpoint=/k8s-audit
```

## Monitoring Audit Sink Performance

Track audit sink health and performance:

```bash
# Check audit sink status
kubectl get auditsinks -o wide

# View API server metrics for audit events
kubectl get --raw /metrics | grep audit

# Check webhook receiver logs
kubectl logs -n kube-system -l app=audit-receiver -f

# Monitor event processing rate
kubectl top pods -n kube-system -l app=audit-receiver
```

Create alerts for audit sink failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: audit-sink-alerts
  namespace: monitoring
spec:
  groups:
  - name: audit-sinks
    rules:
    - alert: AuditSinkWebhookFailure
      expr: |
        rate(apiserver_audit_error_total{plugin="webhook"}[5m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Audit sink webhook is failing"
        description: "Audit events are not being delivered to sink"

    - alert: AuditSinkHighLatency
      expr: |
        histogram_quantile(0.99,
          rate(apiserver_audit_event_total[5m])
        ) > 1.0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Audit sink latency is high"
```

## Implementing Event Buffering

Handle bursts and prevent event loss with buffering:

```go
// buffered-sink.go
package main

import (
    "sync"
    "time"

    auditv1 "k8s.io/apiserver/pkg/apis/audit/v1"
)

type BufferedSink struct {
    buffer   chan *auditv1.Event
    sender   EventSender
    wg       sync.WaitGroup
    stopChan chan struct{}
}

type EventSender interface {
    Send(events []*auditv1.Event) error
}

func NewBufferedSink(bufferSize int, sender EventSender) *BufferedSink {
    s := &BufferedSink{
        buffer:   make(chan *auditv1.Event, bufferSize),
        sender:   sender,
        stopChan: make(chan struct{}),
    }

    // Start background worker to batch and send events
    s.wg.Add(1)
    go s.worker()

    return s
}

func (s *BufferedSink) AddEvent(event *auditv1.Event) {
    select {
    case s.buffer <- event:
    default:
        // Buffer full, log warning
        log.Printf("Warning: audit event buffer full, dropping event")
    }
}

func (s *BufferedSink) worker() {
    defer s.wg.Done()

    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    var batch []*auditv1.Event

    for {
        select {
        case event := <-s.buffer:
            batch = append(batch, event)

            // Send when batch reaches size limit
            if len(batch) >= 100 {
                s.sendBatch(batch)
                batch = nil
            }

        case <-ticker.C:
            // Send any pending events
            if len(batch) > 0 {
                s.sendBatch(batch)
                batch = nil
            }

        case <-s.stopChan:
            // Final flush
            if len(batch) > 0 {
                s.sendBatch(batch)
            }
            return
        }
    }
}

func (s *BufferedSink) sendBatch(events []*auditv1.Event) {
    if err := s.sender.Send(events); err != nil {
        log.Printf("Failed to send event batch: %v", err)
    }
}

func (s *BufferedSink) Stop() {
    close(s.stopChan)
    s.wg.Wait()
}
```

## Troubleshooting Audit Sinks

Debug common audit sink issues:

```bash
# Check API server logs for webhook errors
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep -i "audit\|webhook"

# Verify webhook endpoint is reachable
kubectl run test --rm -it --image=curlimages/curl -- \
  curl -k https://audit-receiver.kube-system.svc/audit

# Check TLS certificate validity
kubectl get secret audit-receiver-tls -n kube-system \
  -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | \
  openssl x509 -text -noout

# Test audit sink manually
curl -k -X POST https://audit-receiver.kube-system.svc/audit \
  -H "Content-Type: application/json" \
  -d '{"apiVersion":"audit.k8s.io/v1","kind":"EventList","items":[]}'
```

Audit sinks provide real-time visibility into Kubernetes API activity. Configure multiple sinks for different purposes, implement proper error handling and buffering, and monitor sink health to ensure reliable audit event delivery.
