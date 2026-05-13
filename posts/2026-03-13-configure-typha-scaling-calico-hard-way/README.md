# Configuring Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, CNI, Networking, Configuration, Scaling

Description: Configure every meaningful Typha setting - replica counts, connection limits, timeouts, and Prometheus metrics - when running Calico in manifest mode.

---

## Introduction

Deploying Typha is only the beginning. To run it well in production you need to understand and tune the configuration knobs that control how many Felix connections each Typha pod accepts, when it disconnects slow clients, and how it exposes operational data. Because you are running Calico "the hard way" - without the operator - every configuration decision is yours to make explicitly.

This post covers the environment variables that configure Typha itself and the `FelixConfiguration` fields that affect how Felix interacts with it.

---

## Prerequisites

- Typha deployed per the setup post in this series
- `calicoctl` v3.x configured against your cluster
- Familiarity with Kubernetes `ConfigMap` and `Deployment` environment variables

---

## Step 1: Understand Typha Configuration Sources

In manifest mode, Typha is commonly configured through environment variables passed to the container. Typha can also read a configuration file, but environment variables take precedence over values from the file. The key environment variable categories are:

- `TYPHA_` prefix: Typha-specific settings
- Logging, TLS, Prometheus metrics, connection management, and datastore access

---

## Step 2: Configure Connection Limits

Each Typha pod can serve many Felix clients. In Calico v3.27, `TYPHA_MAXCONNECTIONSUPPERLIMIT` sets the per-Typha ceiling, and `TYPHA_MAXCONNECTIONSLOWERLIMIT` sets the minimum target used by Kubernetes connection rebalancing. Setting an explicit range helps prevent a single Typha pod from being overwhelmed while still allowing Typha to rebalance clients across replicas.

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
      hostNetwork: true
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
            # Enable Typha to watch its Service endpoints and rebalance clients
            # across the available Typha replicas.
            - name: TYPHA_CONNECTIONREBALANCINGMODE
              value: "kubernetes"
            # Minimum target connection count used by Kubernetes rebalancing.
            - name: TYPHA_MAXCONNECTIONSLOWERLIMIT
              value: "100"
            # Maximum number of client connections this Typha pod will serve.
            - name: TYPHA_MAXCONNECTIONSUPPERLIMIT
              value: "500"
            # Typha disconnects a client that falls this many seconds behind
            # the latest cached datastore state. Increase if Felix clients are slow
            # to consume large update streams.
            - name: TYPHA_SERVERMAXFALLBEHINDSECS
              value: "90"

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
  # Felix looks up this Service's Endpoints and connects to one of them
  typhaK8sServiceName: calico-typha

  # Namespace where the Typha Service lives
  # This field is not always present in older Calico versions; default is kube-system
  # typhaK8sNamespace: kube-system

  # Read timeout for the Typha connection
  # If Typha sends no data for this long, Felix exits and restarts
  typhaReadTimeout: 30s

  # Write timeout when Felix writes data to Typha
  typhaWriteTimeout: 10s
```

```bash
calicoctl apply -f felixconfiguration-full.yaml
```

---

## Step 4: Configure the Typha Service for Topology-Aware Routing

On large multi-zone clusters, you may want Felix agents to prefer a Typha pod in the same zone. This can be done with Kubernetes topology-aware routing hints on the Service, when the Service has enough ready endpoints in each zone for Kubernetes to allocate hints:

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
    # Ask Kubernetes to prefer same-zone routing when it can allocate hints
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

- Set `TYPHA_MAXCONNECTIONSUPPERLIMIT` high enough for a Typha replica to absorb extra clients during a rollout or failure, and keep `TYPHA_MAXCONNECTIONSLOWERLIMIT` as a floor for Kubernetes connection rebalancing.
- Never disable the health endpoint (`TYPHA_HEALTHENABLED`); liveness probes depend on it.
- Use `TYPHA_LOGSEVERITYSCREEN=warning` in very high-throughput environments to reduce log volume, but revert to `info` when debugging.
- Keep `typhaReadTimeout` comfortably larger than Typha's normal ping interval so Felix does not restart during brief delays, and keep `typhaWriteTimeout` large enough for normal Felix-to-Typha writes.
- Always set `TYPHA_PROMETHEUSMETRICSENABLED=true` from day one - retroactively adding metrics after an incident is costly.

---

## Conclusion

You now have full control over every Typha configuration knob: connection limits, timeouts, health checks, and Prometheus metrics. Combined with the setup and scaling posts in this series, you have a complete picture of how to operate Typha without the Calico Operator.

---

*Correlate Typha metric alerts with broader cluster health using [OneUptime](https://oneuptime.com).*
