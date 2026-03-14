# Optimizing Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, CNI, Networking, Performance, Optimization

Description: Tune Typha for maximum throughput and minimum latency in large Kubernetes clusters by optimizing connection distribution, garbage collection, and Felix reconnection behavior when running Calico in manifest mode.

---

## Introduction

Typha reduces API server load, but a poorly tuned Typha deployment can itself become a bottleneck. When hundreds of Felix agents reconnect simultaneously after a Typha restart, a connection storm can overwhelm the newly restarted pod before it finishes loading its cache from the API server. When one Typha pod carries significantly more load than another, Felix agents on that pod see higher update latency.

This post focuses on performance optimization: balancing Felix connections across Typha replicas, tuning Felix reconnection jitter, configuring Typha's internal queue depths, and sizing memory correctly.

---

## Prerequisites

- Typha deployed with 2+ replicas
- Prometheus metrics enabled on Typha (`TYPHA_PROMETHEUSMETRICSENABLED=true`)
- Familiarity with the Typha configuration environment variables from the configure post

---

## Step 1: Balance Felix Connections Across Typha Replicas

Kubernetes round-robin DNS ensures new Felix connections are distributed across Typha pod IPs, but over time imbalances develop as pods restart at different times. The primary tool for rebalancing is controlling when Felix reconnects.

The `FelixConfiguration` field `typhaReadTimeout` determines how long Felix waits for a Typha message before considering the connection stale:

```yaml
# felixconfig-optimized.yaml
# FelixConfiguration with tuned Typha timeouts for better connection distribution
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  typhaK8sServiceName: calico-typha

  # Felix will reconnect if no messages arrive within this window
  # Shorter values detect dead connections faster but cause more reconnects
  # on slow networks. 30s is a reasonable default for most clusters.
  typhaReadTimeout: 30s

  # How often Felix sends keepalives to Typha to keep the connection alive
  # Must be less than typhaReadTimeout on the Typha side
  typhaWriteTimeout: 10s
```

```bash
calicoctl apply -f felixconfig-optimized.yaml
```

---

## Step 2: Add Reconnection Jitter to Prevent Connection Storms

When all Felix agents reconnect simultaneously (e.g., after a rolling Typha restart), they can overwhelm the new Typha pod. Felix introduces randomized jitter during reconnects by default, but you can reinforce this behavior at the Typha level by setting `TYPHA_MAXCONNECTIONSLOWERLIMIT`.

When a Typha pod reaches its connection limit, Felix clients receive a redirect response and connect to a different Typha pod instead, naturally spreading load:

```yaml
# typha-deployment-optimized.yaml
# Typha Deployment with connection cap and queue tuning
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
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  k8s-app: calico-typha
              topologyKey: kubernetes.io/hostname
      containers:
        - name: calico-typha
          image: calico/typha:v3.27.0
          ports:
            - containerPort: 5473
              name: calico-typha
          env:
            - name: TYPHA_LOGFILEPATH
              value: "none"
            - name: TYPHA_LOGSEVERITYSCREEN
              value: "info"

            # Cap connections per pod to enforce natural load balancing
            # When a pod hits this limit, Felix clients redirect to another pod
            # Formula: total_nodes / replicas * 1.2 (20% headroom)
            - name: TYPHA_MAXCONNECTIONSLOWERLIMIT
              value: "100"

            # Disconnect Felix clients that fall behind reading updates
            # Prevents slow clients from holding memory indefinitely
            - name: TYPHA_CLIENTTIMEOUT
              value: "90s"

            # Internal snapshot buffer depth per connected client
            # Increase if you have many large policy objects (>1000 policies)
            - name: TYPHA_SNAPSHOTCACHESIZES
              value: "100"

            - name: TYPHA_PROMETHEUSMETRICSENABLED
              value: "true"
            - name: TYPHA_PROMETHEUSMETRICSPORT
              value: "9093"
            - name: TYPHA_HEALTHENABLED
              value: "true"
          resources:
            requests:
              cpu: 500m
              memory: 256Mi
            limits:
              # Allow CPU bursting during connection storms
              cpu: 2000m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9098
              host: localhost
            initialDelaySeconds: 30
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /readiness
              port: 9098
              host: localhost
            periodSeconds: 10
```

```bash
kubectl apply -f typha-deployment-optimized.yaml
```

---

## Step 3: Monitor Connection Distribution

Use Typha's Prometheus metrics to verify connections are balanced:

```bash
# Port-forward to a specific Typha pod's metrics endpoint
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl port-forward -n kube-system $TYPHA_POD 9093:9093 &

# Query the number of connected Felix clients
curl -s http://localhost:9093/metrics | grep typha_connections_accepted
curl -s http://localhost:9093/metrics | grep typha_connections_active
```

A healthy distribution shows roughly equal `typha_connections_active` values across all Typha pods.

---

## Step 4: Size Memory for Your Policy Count

Typha holds an in-memory cache of all watched resources. The cache size grows with the number of `NetworkPolicy`, `GlobalNetworkPolicy`, `IPPool`, and node objects. For clusters with large policy counts, increase the memory limit accordingly:

```bash
# Estimate the number of Calico resources to help size the cache
calicoctl get networkpolicy --all-namespaces | wc -l
calicoctl get globalnetworkpolicy | wc -l
calicoctl get ippool | wc -l
kubectl get nodes | wc -l

# Patch memory limits based on the result
# Rule of thumb: 128Mi base + 1Mi per 100 policies + 0.5Mi per node
kubectl set resources deployment calico-typha \
  --namespace kube-system \
  --requests=cpu=500m,memory=256Mi \
  --limits=cpu=2000m,memory=1Gi
```

---

## Best Practices

- Always set `TYPHA_MAXCONNECTIONSLOWERLIMIT` to avoid hot spots when one Typha pod handles a disproportionate share of Felix agents.
- Set CPU limits higher than CPU requests to allow Typha to burst during reconnection storms without being throttled.
- Monitor the Prometheus metric `typha_connections_active` across all pods; imbalances greater than 20% warrant investigation.
- Use `topologySpreadConstraints` to ensure Typha replicas are zone-distributed, so a zone failure does not collapse all Typha capacity simultaneously.
- Regularly review Typha's memory usage trend — a steady increase over days indicates a cache leak or unbounded policy growth.

---

## Conclusion

Optimization is an ongoing process, but the fundamentals are consistent: cap connections per pod to force balanced distribution, tune timeouts to detect dead connections quickly, and size memory to your actual resource count. With these settings in place, Typha reliably handles load regardless of cluster activity patterns.

---

*Track Typha performance metrics alongside your full Kubernetes infrastructure with [OneUptime](https://oneuptime.com).*
