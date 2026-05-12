# Optimizing Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, CNI, Networking, Performance, Optimization

Description: Tune Typha for maximum throughput and minimum latency in large Kubernetes clusters by optimizing connection distribution, garbage collection, and Felix reconnection behavior when running Calico in...

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

  # Felix will exit and restart if Typha sends no data for this window.
  # Shorter values detect dead connections faster but cause more reconnects
  # on slow networks. 30s is the Felix default and reasonable for most clusters.
  typhaReadTimeout: 30s

  # Write timeout when Felix sends data (including keepalive acks) to Typha.
  # Should be lower than typhaReadTimeout so slow writes surface quickly.
  typhaWriteTimeout: 10s
```

```bash
calicoctl apply -f felixconfig-optimized.yaml
```

---

## Step 2: Add Reconnection Jitter to Prevent Connection Storms

When all Felix agents reconnect simultaneously (e.g., after a rolling Typha restart), they can overwhelm the new Typha pod. Felix introduces randomized jitter during reconnects by default, but you can reinforce this behavior at the Typha level by setting `TYPHA_MAXCONNECTIONSLOWERLIMIT`.

When a Typha pod's active connection count exceeds the lower limit, Typha gracefully drops a small number of connections each `ConnectionDropIntervalSecs` (1s by default); the dropped Felix clients then reconnect, usually to a less-loaded pod via the service DNS, naturally spreading load. Above the upper limit, new connections are rejected outright.

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

            # Lower bound at which Typha starts gracefully dropping excess
            # connections so clients redistribute across pods.
            # Formula: total_nodes / replicas * 1.2 (20% headroom)
            - name: TYPHA_MAXCONNECTIONSLOWERLIMIT
              value: "100"

            # Disconnect Felix clients that fall behind reading updates by
            # more than this many seconds. Prevents slow clients from holding
            # memory indefinitely. Default is 300 seconds.
            - name: TYPHA_SERVERMAXFALLBEHINDSECS
              value: "90"

            # Max number of KV pairs Typha sends to a client per batch when
            # streaming the initial snapshot. Default is 100; raise for
            # clusters with many large policy objects (>1000 policies).
            - name: TYPHA_SNAPSHOTCACHEMAXBATCHSIZE
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
- Regularly review Typha's memory usage trend - a steady increase over days indicates a cache leak or unbounded policy growth.

---

## Conclusion

Optimization is an ongoing process, but the fundamentals are consistent: cap connections per pod to force balanced distribution, tune timeouts to detect dead connections quickly, and size memory to your actual resource count. With these settings in place, Typha reliably handles load regardless of cluster activity patterns.

---

*Track Typha performance metrics alongside your full Kubernetes infrastructure with [OneUptime](https://oneuptime.com).*
