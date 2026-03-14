# Configuring Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, CNI, Networking, Configuration, Scaling

Description: Configure every meaningful Typha setting — replica counts, connection limits, timeouts, and Prometheus metrics — when running Calico in manifest mode. This post covers the full set of environment variables and FelixConfiguration fields that control Typha behavior.

---

## Introduction

Deploying Typha is only the beginning. To run it well in production you need to understand and tune the configuration knobs that control how many Felix connections each Typha pod accepts, when it disconnects slow clients, and how it exposes operational data. Because you are running Calico "the hard way" — without the operator — every configuration decision is yours to make explicitly.

This post covers the environment variables that configure Typha itself and the `FelixConfiguration` fields that affect how Felix interacts with it.

---

## Prerequisites

- Typha deployed per the setup post in this series
- `calicoctl` v3.x configured against your cluster
- Familiarity with Kubernetes `ConfigMap` and `Deployment` environment variables

---

## Step 1: Understand Typha Configuration Sources

Typha is configured entirely through environment variables passed to the container. There is no separate configuration file. The key environment variable categories are:

- `TYPHA_` prefix: Typha-specific settings
- Logging, TLS, Prometheus metrics, connection management, and datastore access

---

## Step 2: Configure Connection Limits

Each Typha pod can serve many Felix clients. The default limit is 0 (unlimited), but setting an explicit cap prevents a single Typha pod from being overwhelmed.

```yaml
# typha-deployment-configured.yaml
# Typha Deployment with explicit connection and performance configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
spec:
  replicas: 3
  selector:
    matchLabels:
      k8s-app: calico-typha
  template:
    metadata:
      labels:
        k8s-app: calico-typha
    spec:
      serviceAccountName: calico-typha
      containers:
        - name: calico-typha
          image: calico/typha:v3.27.0
          ports:
            - containerPort: 5473
              name: calico-typha
              protocol: TCP
            # Health check port
            - containerPort: 9098
              name: typha-health
              protocol: TCP
            # Prometheus metrics port
            - containerPort: 9093
              name: typha-metrics
              protocol: TCP
          env:
            # --- Logging ---
            # Write logs to stdout only; no file on disk
            - name: TYPHA_LOGFILEPATH
              value: "none"
            # Log level: debug, info, warning, error (use info in production)
            - name: TYPHA_LOGSEVERITYSCREEN
              value: "info"

            # --- Connection management ---
            # Maximum number of Felix clients this Typha pod will serve
            # Set to roughly (total nodes / number of Typha replicas) * 1.2
            - name: TYPHA_MAXCONNECTIONSLOWERLIMIT
              value: "100"
            # Typha disconnects a Felix client that falls this many seconds behind
            # in reading updates. Increase if Felix clients are on slow nodes.
            - name: TYPHA_CLIENTTIMEOUT
              value: "90s"

            # --- Prometheus metrics ---
            # Enable Prometheus endpoint so you can monitor connection counts
            - name: TYPHA_PROMETHEUSMETRICSENABLED
              value: "true"
            # Port on which Prometheus metrics are served
            - name: TYPHA_PROMETHEUSMETRICSPORT
              value: "9093"

            # --- Health checks ---
            # Port for liveness and readiness HTTP endpoints
            - name: TYPHA_HEALTHPORT
              value: "9098"
            # Enable the health endpoint (required for liveness/readiness probes)
            - name: TYPHA_HEALTHENABLED
              value: "true"

            # --- Datastore ---
            # Typha connects to Kubernetes using in-cluster config automatically
            # Set this only if you need to override the datastore type
            - name: TYPHA_DATASTORETYPE
              value: "kubernetes"
```

```bash
kubectl apply -f typha-deployment-configured.yaml
```

---

## Step 3: Configure Felix to Connect to Typha

The `FelixConfiguration` CRD controls how Felix locates and interacts with Typha:

```yaml
# felixconfiguration-full.yaml
# Full FelixConfiguration with all Typha-related fields documented
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Name of the Kubernetes Service that fronts Typha
  # Felix will watch this Service's endpoints and connect to any healthy one
  typhaK8sServiceName: calico-typha

  # Namespace where the Typha Service lives
  # This field is not always present in older Calico versions; default is kube-system
  # typhaK8sNamespace: kube-system

  # How long Felix waits for a Typha connection before retrying
  # Increase this on very large clusters where DNS resolution may be slow
  typhaReadTimeout: 30s

  # How frequently Felix sends keepalive messages to Typha
  # Lower values detect connection failures faster but increase overhead
  typhaWriteTimeout: 10s
```

```bash
calicoctl apply -f felixconfiguration-full.yaml
```

---

## Step 4: Configure the Typha Service for Topology-Aware Routing

On large clusters, you may want Felix agents to prefer a Typha pod on a nearby node. This is done with topology-aware hints on the Service:

```yaml
# typha-service-topology.yaml
# Typha Service with topology hints for preferring local zone endpoints
apiVersion: v1
kind: Service
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
  annotations:
    # Enable topology-aware routing so Felix prefers Typha in the same zone
    service.kubernetes.io/topology-mode: "Auto"
spec:
  selector:
    k8s-app: calico-typha
  ports:
    - name: calico-typha
      port: 5473
      protocol: TCP
      targetPort: calico-typha
```

```bash
kubectl apply -f typha-service-topology.yaml
```

---

## Step 5: Validate the Configuration

Check that all settings were applied correctly:

```bash
# Confirm environment variables are present in the running Typha pod
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl exec -n kube-system $TYPHA_POD -- env | grep TYPHA_

# Check Felix configuration via calicoctl
calicoctl get felixconfiguration default -o yaml
```

---

## Best Practices

- Set `TYPHA_MAXCONNECTIONSLOWERLIMIT` to roughly `(total_nodes / typha_replicas) * 1.2` to give each pod some headroom.
- Never disable the health endpoint (`TYPHA_HEALTHENABLED`); liveness probes depend on it.
- Use `TYPHA_LOGSEVERITYSCREEN=warning` in very high-throughput environments to reduce log volume, but revert to `info` when debugging.
- Set `typhaReadTimeout` and `typhaWriteTimeout` in `FelixConfiguration` to values larger than your normal network latency plus one standard deviation.
- Always set `TYPHA_PROMETHEUSMETRICSENABLED=true` from day one — retroactively adding metrics after an incident is costly.

---

## Conclusion

You now have full control over every Typha configuration knob: connection limits, timeouts, health checks, and Prometheus metrics. Combined with the setup and scaling posts in this series, you have a complete picture of how to operate Typha without the Calico Operator.

---

*Correlate Typha metric alerts with broader cluster health using [OneUptime](https://oneuptime.com).*
