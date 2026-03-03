# How to Forward Talos Linux Logs to Datadog

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Datadog, Logging, Observability, Kubernetes

Description: Learn how to forward Talos Linux system and Kubernetes logs to Datadog for centralized monitoring and analysis.

---

Talos Linux is a minimal, immutable operating system designed specifically for running Kubernetes. Because it strips away everything that is not needed for container orchestration, traditional logging approaches do not work here. You cannot SSH into a Talos node and tail log files the way you would on a conventional Linux distribution. Instead, you need to configure log forwarding through Talos machine configuration or deploy log collectors as Kubernetes workloads.

Datadog is one of the most popular observability platforms, and getting your Talos Linux logs into it gives you powerful search, alerting, and correlation capabilities. This guide walks through the complete process of setting up log forwarding from Talos Linux to Datadog.

## Understanding Talos Linux Logging Architecture

Talos Linux generates logs at two levels. The first is the machine level, where Talos system services like `machined`, `apid`, `trustd`, and `etcd` produce structured logs. The second is the Kubernetes level, where your pods and control plane components generate their own logs.

Machine-level logs are accessible through the `talosctl` command line tool. Kubernetes-level logs follow the standard container logging model and can be collected by any log agent running as a DaemonSet.

For Datadog integration, you will want to capture both levels. Machine logs give you visibility into the operating system itself, while Kubernetes logs cover your workloads and the control plane.

## Configuring Machine Log Forwarding

Talos Linux supports sending machine logs to external endpoints through the `machine.logging` configuration. You can configure this in your machine config patch file.

Create a patch file for your Talos nodes:

```yaml
# datadog-logging-patch.yaml
# Configure Talos machine-level log forwarding
machine:
  logging:
    destinations:
      - endpoint: "tcp://your-log-forwarder:5140"
        format: json_lines
```

Talos does not send logs directly to the Datadog API. Instead, you send them to an intermediary like a Fluentd, Vector, or Datadog Agent instance that can receive syslog or JSON lines and forward them to Datadog.

Apply this patch to your nodes:

```bash
# Apply the logging patch to a control plane node
talosctl apply-config --nodes 192.168.1.10 --patch @datadog-logging-patch.yaml

# Apply to all worker nodes
talosctl apply-config --nodes 192.168.1.20,192.168.1.21 --patch @datadog-logging-patch.yaml
```

## Deploying the Datadog Agent on Talos Linux

The Datadog Agent runs as a DaemonSet in your Kubernetes cluster. It collects container logs, metrics, and traces from every node. On Talos Linux, the setup is largely the same as any other Kubernetes distribution, but you need to account for the different filesystem layout.

First, create a namespace and secret for your Datadog API key:

```bash
# Create a dedicated namespace for Datadog
kubectl create namespace datadog

# Store your API key as a Kubernetes secret
kubectl create secret generic datadog-api-key \
  --from-literal=api-key=YOUR_DATADOG_API_KEY \
  --namespace datadog
```

Next, install the Datadog Agent using Helm:

```bash
# Add the Datadog Helm repository
helm repo add datadog https://helm.datadoghq.com
helm repo update

# Install the Datadog Agent with Talos-compatible settings
helm install datadog-agent datadog/datadog \
  --namespace datadog \
  --set datadog.apiKeyExistingSecret=datadog-api-key \
  --set datadog.logs.enabled=true \
  --set datadog.logs.containerCollectAll=true \
  --set agents.tolerations[0].operator=Exists \
  --set agents.tolerations[0].effect=NoSchedule
```

The `containerCollectAll` setting tells the agent to collect logs from every container on the node without requiring individual pod annotations. The tolerations ensure the agent runs on control plane nodes as well.

## Customizing the Datadog Agent Values

For a production setup, you should use a values file that gives you more control over the configuration:

```yaml
# datadog-values.yaml
# Helm values for Datadog Agent on Talos Linux
datadog:
  apiKeyExistingSecret: datadog-api-key
  logs:
    enabled: true
    containerCollectAll: true
  apm:
    portEnabled: true
  processAgent:
    enabled: true
    processCollection: true
  kubelet:
    # Talos uses a non-standard kubelet path
    host:
      valueFrom:
        fieldRef:
          fieldPath: status.hostIP
  criSocketPath: /run/containerd/containerd.sock

agents:
  tolerations:
    - operator: Exists
      effect: NoSchedule
  volumes:
    - name: containerdsocket
      hostPath:
        path: /run/containerd/containerd.sock
    - name: containerlog
      hostPath:
        path: /var/log/pods
  volumeMounts:
    - name: containerdsocket
      mountPath: /run/containerd/containerd.sock
      readOnly: true
    - name: containerlog
      mountPath: /var/log/pods
      readOnly: true
```

Apply this configuration:

```bash
# Install or upgrade with the custom values file
helm upgrade --install datadog-agent datadog/datadog \
  --namespace datadog \
  -f datadog-values.yaml
```

## Setting Up a Log Forwarder for Machine Logs

Since Talos machine logs cannot be sent directly to Datadog, you need an intermediary. Vector is a lightweight, high-performance log forwarder that works well for this purpose.

Deploy Vector as a Kubernetes deployment that listens for Talos machine logs:

```yaml
# vector-talos-forwarder.yaml
# Vector deployment to receive Talos machine logs and forward to Datadog
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vector-talos-forwarder
  namespace: datadog
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vector-talos-forwarder
  template:
    metadata:
      labels:
        app: vector-talos-forwarder
    spec:
      containers:
        - name: vector
          image: timberio/vector:0.34.1-distroless-libc
          ports:
            - containerPort: 5140
              protocol: TCP
          volumeMounts:
            - name: config
              mountPath: /etc/vector
          env:
            - name: DD_API_KEY
              valueFrom:
                secretKeyRef:
                  name: datadog-api-key
                  key: api-key
      volumes:
        - name: config
          configMap:
            name: vector-config
---
apiVersion: v1
kind: Service
metadata:
  name: vector-talos-forwarder
  namespace: datadog
spec:
  type: ClusterIP
  ports:
    - port: 5140
      targetPort: 5140
      protocol: TCP
  selector:
    app: vector-talos-forwarder
```

Create the Vector configuration as a ConfigMap:

```yaml
# vector-config.yaml
# Vector configuration for processing Talos machine logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-config
  namespace: datadog
data:
  vector.toml: |
    [sources.talos_logs]
    type = "socket"
    address = "0.0.0.0:5140"
    mode = "tcp"
    decoding.codec = "json"

    [transforms.enrich]
    type = "remap"
    inputs = ["talos_logs"]
    source = '''
    .service = "talos-machine"
    .ddsource = "talos"
    .ddtags = "env:production,platform:talos"
    '''

    [sinks.datadog]
    type = "datadog_logs"
    inputs = ["enrich"]
    default_api_key = "${DD_API_KEY}"
    site = "datadoghq.com"
    compression = "gzip"
```

Apply both resources:

```bash
# Deploy the Vector forwarder and its configuration
kubectl apply -f vector-config.yaml
kubectl apply -f vector-talos-forwarder.yaml
```

Then update your Talos machine config to point to the Vector service. You will need to use the service's ClusterIP or the NodePort if your Talos nodes are not part of the cluster network.

## Verifying the Setup

After deploying everything, verify that logs are flowing:

```bash
# Check that the Datadog Agent pods are running
kubectl get pods -n datadog

# Check Datadog Agent logs for any errors
kubectl logs -n datadog -l app.kubernetes.io/name=datadog -c agent --tail=50

# Verify Vector is receiving connections
kubectl logs -n datadog -l app=vector-talos-forwarder --tail=50
```

In the Datadog web interface, navigate to the Log Explorer. You should see logs appearing from two sources: container logs collected by the Datadog Agent and machine-level logs forwarded through Vector.

## Adding Log Pipelines in Datadog

Once logs are flowing, set up processing pipelines in Datadog to parse and enrich them. Go to Logs > Configuration > Pipelines and create a new pipeline filtered by `source:talos`.

Add processors for extracting the service name, severity level, and any structured fields from the Talos JSON log format. This makes it much easier to search and create monitors based on specific Talos system events.

## Troubleshooting Common Issues

If logs are not appearing in Datadog, check these common problems. First, verify that the Datadog API key is correct and the secret is mounted properly. Second, confirm that the Talos logging destination endpoint is reachable from the node - remember that Talos machine logs are sent from the host network, not from within Kubernetes. Third, check that the containerd socket path is correct in the Datadog Agent configuration, as Talos uses `/run/containerd/containerd.sock` rather than the Docker socket.

Getting Talos Linux logs into Datadog takes a bit more setup than a traditional Linux distribution, but the result is full observability across both the operating system layer and your Kubernetes workloads. The combination of the Datadog Agent for container logs and Vector for machine logs gives you complete coverage without compromising the security model that makes Talos appealing in the first place.
