# How to Configure Cilium Hubble Relay for Cross-Node Network Flow Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, Hubble, Networking, Kubernetes, Observability

Description: Configure Cilium Hubble Relay to aggregate network flows across multiple nodes for cluster-wide visibility, enabling centralized monitoring and analysis of distributed network traffic.

---

Hubble runs on each node in your Kubernetes cluster, collecting network flow data locally. Without Hubble Relay, you can only observe flows from individual nodes, making cluster-wide analysis difficult. Hubble Relay aggregates flows from all nodes into a single stream, providing complete network visibility.

This guide shows you how to configure Hubble Relay for multi-node flow aggregation, set up high availability, optimize performance, and integrate with monitoring systems for comprehensive network observability.

## Understanding Hubble Relay Architecture

Hubble Relay acts as a centralized aggregation point:

- Hubble agents run on each node collecting local flows
- Hubble Relay connects to all agents via gRPC
- Clients connect to Relay for cluster-wide flow data
- Relay handles load balancing and failover

This architecture scales from small clusters to large multi-region deployments.

## Installing Hubble Relay

Install Cilium with Hubble Relay enabled:

```bash
helm install cilium cilium/cilium --version 1.14.5 \
  --namespace kube-system \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.relay.replicas=3 \
  --set hubble.relay.resources.requests.cpu=100m \
  --set hubble.relay.resources.requests.memory=128Mi \
  --set hubble.relay.resources.limits.cpu=1000m \
  --set hubble.relay.resources.limits.memory=1Gi \
  --set hubble.relay.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution[0].labelSelector.matchLabels.k8s-app=hubble-relay \
  --set hubble.relay.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution[0].topologyKey=kubernetes.io/hostname
```

Verify Relay installation:

```bash
# Check Relay pods
kubectl get pods -n kube-system -l k8s-app=hubble-relay

# Check Relay service
kubectl get svc -n kube-system hubble-relay

# View Relay logs
kubectl logs -n kube-system -l k8s-app=hubble-relay --tail=50
```

## Configuring Relay Connection Settings

Create a custom Relay configuration:

```yaml
# hubble-relay-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hubble-relay-config
  namespace: kube-system
data:
  config.yaml: |
    peer-service: "hubble-peer.kube-system.svc.cluster.local:443"
    listen-address: ":4245"
    dial-timeout: 30s
    retry-timeout: 30s
    sort-buffer-len-max: 10000
    sort-buffer-drain-timeout: 30s
    tls-hubble-server-ca-files: /var/lib/hubble-relay/tls/ca.crt
    tls-hubble-client-cert-file: /var/lib/hubble-relay/tls/client.crt
    tls-hubble-client-key-file: /var/lib/hubble-relay/tls/client.key
    disable-server-tls: false
    pprof: true
    pprof-address: "localhost:6060"
```

Apply the configuration:

```bash
kubectl apply -f hubble-relay-config.yaml

# Restart Relay to apply changes
kubectl rollout restart deployment/hubble-relay -n kube-system
```

## Setting Up TLS for Secure Communication

Generate certificates for Relay:

```bash
# Create certificate signing request
cat > hubble-relay-csr.json <<EOF
{
  "CN": "hubble-relay",
  "hosts": [
    "hubble-relay",
    "hubble-relay.kube-system",
    "hubble-relay.kube-system.svc",
    "hubble-relay.kube-system.svc.cluster.local"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  }
}
EOF

# Generate certificate
cfssl gencert \
  -ca=ca.pem \
  -ca-key=ca-key.pem \
  -config=ca-config.json \
  -profile=kubernetes \
  hubble-relay-csr.json | cfssljson -bare hubble-relay

# Create Kubernetes secret
kubectl create secret tls hubble-relay-tls \
  --cert=hubble-relay.pem \
  --key=hubble-relay-key.pem \
  -n kube-system
```

Or use cert-manager:

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: hubble-relay
  namespace: kube-system
spec:
  secretName: hubble-relay-tls
  duration: 8760h # 1 year
  renewBefore: 720h # 30 days
  commonName: hubble-relay
  dnsNames:
  - hubble-relay
  - hubble-relay.kube-system
  - hubble-relay.kube-system.svc
  - hubble-relay.kube-system.svc.cluster.local
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
```

## Connecting Hubble CLI to Relay

Configure the Hubble CLI to use Relay:

```bash
# Port forward to Relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Connect Hubble CLI
hubble observe --server localhost:4245

# Or set environment variable
export HUBBLE_SERVER=localhost:4245
hubble observe
```

For production, expose Relay via load balancer:

```yaml
# hubble-relay-lb.yaml
apiVersion: v1
kind: Service
metadata:
  name: hubble-relay-external
  namespace: kube-system
spec:
  type: LoadBalancer
  selector:
    k8s-app: hubble-relay
  ports:
  - port: 4245
    targetPort: 4245
    protocol: TCP
```

## Optimizing Relay Performance

Configure buffering and sorting:

```yaml
# relay-optimization.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hubble-relay
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: hubble-relay
        args:
        - serve
        - --config=/etc/hubble-relay/config.yaml
        - --sort-buffer-len-max=50000
        - --sort-buffer-drain-timeout=10s
        env:
        - name: GOMEMLIMIT
          value: "900MiB"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 1Gi
```

## Implementing High Availability

Deploy multiple Relay replicas:

```yaml
# ha-relay.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hubble-relay
  namespace: kube-system
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      k8s-app: hubble-relay
  template:
    metadata:
      labels:
        k8s-app: hubble-relay
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: hubble-relay
            topologyKey: kubernetes.io/hostname
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  k8s-app: cilium
              topologyKey: kubernetes.io/hostname
      containers:
      - name: hubble-relay
        image: quay.io/cilium/hubble-relay:v1.14.5
        livenessProbe:
          tcpSocket:
            port: 4245
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          tcpSocket:
            port: 4245
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Aggregating Flows from Multiple Clusters

Set up multi-cluster flow aggregation:

```yaml
# multi-cluster-relay.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hubble-relay-config
  namespace: kube-system
data:
  config.yaml: |
    clusters:
    - name: cluster-us-west
      peer-service: "hubble-peer.kube-system.svc.cluster-us-west.local:443"
      ca-cert: /var/lib/relay/ca-us-west.crt

    - name: cluster-eu-central
      peer-service: "hubble-peer.kube-system.svc.cluster-eu-central.local:443"
      ca-cert: /var/lib/relay/ca-eu-central.crt

    listen-address: ":4245"
    dial-timeout: 30s
```

## Building a Flow Aggregation Service

Create a custom aggregation service:

```go
// flow-aggregator.go
package main

import (
    "context"
    "fmt"
    "log"

    "google.golang.org/grpc"
    observer "github.com/cilium/cilium/api/v1/observer"
)

type FlowAggregator struct {
    relayAddress string
    flows        chan *observer.Flow
}

func NewFlowAggregator(relayAddress string) *FlowAggregator {
    return &FlowAggregator{
        relayAddress: relayAddress,
        flows:        make(chan *observer.Flow, 10000),
    }
}

func (fa *FlowAggregator) Connect() error {
    conn, err := grpc.Dial(fa.relayAddress, grpc.WithInsecure())
    if err != nil {
        return fmt.Errorf("failed to connect: %w", err)
    }

    client := observer.NewObserverClient(conn)

    // Subscribe to flows
    req := &observer.GetFlowsRequest{
        Follow: true,
    }

    stream, err := client.GetFlows(context.Background(), req)
    if err != nil {
        return fmt.Errorf("failed to get flows: %w", err)
    }

    go fa.receiveFlows(stream)

    return nil
}

func (fa *FlowAggregator) receiveFlows(stream observer.Observer_GetFlowsClient) {
    for {
        resp, err := stream.Recv()
        if err != nil {
            log.Printf("Error receiving flow: %v", err)
            return
        }

        fa.flows <- resp.GetFlow()
    }
}

func (fa *FlowAggregator) ProcessFlows() {
    for flow := range fa.flows {
        // Process flow
        fmt.Printf("Flow: %s -> %s:%d [%s]\n",
            flow.GetSource().GetPodName(),
            flow.GetDestination().GetPodName(),
            flow.GetDestination().GetPort(),
            flow.GetVerdict().String(),
        )
    }
}

func main() {
    aggregator := NewFlowAggregator("localhost:4245")

    if err := aggregator.Connect(); err != nil {
        log.Fatal(err)
    }

    aggregator.ProcessFlows()
}
```

## Exporting Flows to External Systems

Export to Elasticsearch:

```go
// export-elasticsearch.go
package main

import (
    "context"
    "encoding/json"

    "github.com/elastic/go-elasticsearch/v8"
    observer "github.com/cilium/cilium/api/v1/observer"
)

type FlowExporter struct {
    esClient *elasticsearch.Client
}

func (fe *FlowExporter) ExportFlow(flow *observer.Flow) error {
    flowData := map[string]interface{}{
        "timestamp":   flow.GetTime(),
        "source":      flow.GetSource().GetPodName(),
        "destination": flow.GetDestination().GetPodName(),
        "port":        flow.GetDestination().GetPort(),
        "protocol":    flow.GetL4().GetProtocol(),
        "verdict":     flow.GetVerdict().String(),
    }

    data, err := json.Marshal(flowData)
    if err != nil {
        return err
    }

    _, err = fe.esClient.Index(
        "hubble-flows",
        bytes.NewReader(data),
        fe.esClient.Index.WithContext(context.Background()),
    )

    return err
}
```

## Monitoring Relay Health

Create health check endpoints:

```bash
# Check Relay connectivity
curl http://localhost:6060/debug/pprof/

# View Relay metrics
curl http://localhost:9965/metrics | grep hubble_relay

# Check connected peers
hubble status --server localhost:4245
```

Set up Prometheus metrics:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hubble-relay
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: hubble-relay
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## Troubleshooting Relay Issues

Common issues and solutions:

```bash
# Relay not connecting to agents
kubectl logs -n kube-system -l k8s-app=hubble-relay | grep "dial"

# High memory usage
kubectl top pods -n kube-system -l k8s-app=hubble-relay

# Certificate issues
kubectl exec -n kube-system deploy/hubble-relay -- \
  openssl s_client -connect hubble-peer.kube-system:443 -showcerts

# Flow drops
hubble observe --server localhost:4245 | grep -c "DROPPED"

# Slow queries
kubectl logs -n kube-system -l k8s-app=hubble-relay | grep "slow query"
```

Hubble Relay transforms node-local observability into cluster-wide network visibility. Configure it properly and you gain a centralized view of all network traffic across your entire Kubernetes infrastructure.
