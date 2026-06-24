# How to Set Up Kubernetes Audit Sink for Real-Time Audit Event Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Audit, Compliance

Description: Learn how to configure Kubernetes audit sinks to stream audit events in real-time to external systems for security monitoring, compliance tracking, and threat detection.

---

Kubernetes audit logging captures all requests made to the API server, but writing audit logs to files has limitations. The audit webhook backend enables real-time streaming of audit events to external systems like SIEM tools, security monitoring platforms, or custom applications. This allows immediate detection of suspicious activity and compliance violations.

## Understanding Audit Webhooks vs Audit Logs

Traditional audit logging writes events to log files on disk. The API server processes audit events, formats them according to policy, and writes them to files. You must then ship these files to analysis systems using log collectors.

Audit webhooks send events directly to a webhook endpoint as they occur. The API server makes HTTP POST requests to the configured endpoint with audit event batches. This eliminates the need for file-based log collection and provides near-instant event delivery.

## Configuring the Audit Webhook Backend

Kubernetes no longer supports dynamic audit configuration through `AuditSink` resources. Configure the supported audit webhook backend on the API server instead:

```bash
# Edit API server manifest

sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

Add the audit policy, webhook kubeconfig, and batching configuration:

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
    # Configure audit policy
    - --audit-policy-file=/etc/kubernetes/audit/policy.yaml
    # Configure audit webhook backend
    - --audit-webhook-config-file=/etc/kubernetes/audit/webhook-kubeconfig.yaml
    - --audit-webhook-mode=batch
    - --audit-webhook-batch-throttle-qps=10
    - --audit-webhook-batch-throttle-burst=15
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

  # Don't log other read-only requests
  - level: None
    verbs: ["get", "list", "watch"]

  # Log everything else at Metadata level
  - level: Metadata
```

## Creating an Audit Webhook Receiver

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
    resource := ""
    name := ""
    if event.ObjectRef != nil {
        resource = event.ObjectRef.Resource
        name = event.ObjectRef.Name
    }

    log.Printf("Audit Event: %s %s %s by %s at %v",
        event.Verb,
        resource,
        name,
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

    log.Println("Audit webhook receiver listening on :8443")
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
# Generate a CA key and certificate
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 \
  -out ca.crt \
  -subj "/CN=audit-webhook-ca"

# Generate server private key
openssl genrsa -out tls.key 2048

# Generate certificate signing request with DNS SANs
openssl req -new -key tls.key -out tls.csr \
  -subj "/CN=audit-receiver.kube-system.svc" \
  -addext "subjectAltName=DNS:audit-receiver.kube-system.svc,DNS:audit-receiver.kube-system.svc.cluster.local"

# Sign the server certificate with the CA
openssl x509 -req -days 365 -in tls.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out tls.crt \
  -copy_extensions copy

# Create Kubernetes secret
kubectl create secret tls audit-receiver-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n kube-system
```

## Defining the Audit Webhook Kubeconfig

Create a kubeconfig that tells the API server where to send audit events:

```yaml
apiVersion: v1
kind: Config
clusters:
- name: audit-webhook
  cluster:
    server: https://audit-receiver.kube-system.svc/audit
    certificate-authority: /etc/kubernetes/audit/ca.crt
users:
- name: audit-webhook
  user: {}
contexts:
- name: audit-webhook
  context:
    cluster: audit-webhook
    user: audit-webhook
current-context: audit-webhook
```

Copy the CA certificate and create the kubeconfig on every API server node. If the API server cannot resolve cluster DNS names, use another HTTPS URL that is reachable from the API server host network.

```bash
sudo cp ca.crt /etc/kubernetes/audit/ca.crt
sudo nano /etc/kubernetes/audit/webhook-kubeconfig.yaml
```

The API server loads this file from `--audit-webhook-config-file`. If you run the API server as a static pod, saving the manifest change restarts the pod automatically.

```bash
# Verify API server metrics include audit events
kubectl get --raw /metrics | grep apiserver_audit
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
    "github.com/elastic/go-elasticsearch/v8/esapi"
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

    req := esapi.IndexRequest{
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

Create targeted audit policy rules for different use cases:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Security-focused events for authentication and authorization
  - level: RequestResponse
    userGroups: ["system:unauthenticated"]
    stages:
    - ResponseComplete
    omitStages:
    - RequestReceived

  # Compliance-focused events for resource changes
  - level: Request
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["pods", "services", "configmaps", "secrets"]
    - group: "apps"
      resources: ["deployments", "daemonsets", "statefulsets"]
    stages:
    - ResponseComplete

  # Log everything else at Metadata level
  - level: Metadata
```

## Integrating with Falco for Runtime Security

Stream audit events to Falco for runtime security monitoring:

```yaml
apiVersion: v1
kind: Config
clusters:
- name: falco-audit
  cluster:
    server: http://falco-k8saudit-webhook.security.svc:9765/k8s-audit
users:
- name: falco-audit
  user: {}
contexts:
- name: falco-audit
  context:
    cluster: falco-audit
    user: falco-audit
current-context: falco-audit
```

Deploy Falco to receive events:

```bash
# Add Falco Helm repository
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

# Install Falco with the k8saudit plugin values
helm install falco falcosecurity/falco \
  --namespace security \
  --create-namespace \
  --values https://raw.githubusercontent.com/falcosecurity/charts/master/charts/falco/values-k8saudit.yaml
```

## Monitoring Audit Webhook Performance

Track audit webhook health and performance:

```bash
# View API server metrics for audit events
kubectl get --raw /metrics | grep audit

# Check webhook receiver logs
kubectl logs -n kube-system -l app=audit-receiver -f

# Monitor event processing rate
kubectl top pods -n kube-system -l app=audit-receiver
```

Create alerts for audit webhook failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: audit-webhook-alerts
  namespace: monitoring
spec:
  groups:
  - name: audit-webhook
    rules:
    - alert: AuditWebhookFailure
      expr: |
        rate(apiserver_audit_error_total[5m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Audit webhook is failing"
        description: "Audit events are being dropped during export"

    - alert: AuditEventsNotExported
      expr: |
        absent(apiserver_audit_event_total)
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Audit event metric is missing"
```

## Implementing Event Buffering

Handle bursts and prevent event loss with buffering:

```go
// buffered-sink.go
package main

import (
    "log"
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

## Troubleshooting Audit Webhooks

Debug common audit webhook issues:

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

# Test audit webhook manually from inside the cluster
kubectl run audit-test --rm -it --image=curlimages/curl -- \
  curl -k -X POST https://audit-receiver.kube-system.svc/audit \
    -H "Content-Type: application/json" \
    -d '{"apiVersion":"audit.k8s.io/v1","kind":"EventList","items":[]}'
```

Audit webhooks provide real-time visibility into Kubernetes API activity. Route events through a receiver or collector when you need to fan out to multiple destinations, implement proper error handling and buffering, and monitor webhook health to ensure reliable audit event delivery.
