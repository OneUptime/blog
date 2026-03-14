# How to Configure Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Configuration, Hard Way

Description: A guide to configuring Typha's connection limits, logging, Prometheus metrics, and Felix-side connection parameters for a manually installed Calico cluster.

---

## Introduction

After deploying Typha, configuring it correctly for the cluster's scale and operational requirements ensures reliable performance. Typha's configuration spans two sides: the Typha process itself (connection limits, TLS, logging, metrics) and the Felix configuration that controls how Felix discovers and connects to Typha. Both must be tuned together.

## Typha Environment Variables

Typha is configured via environment variables in its Deployment spec. Key parameters:

| Variable | Description | Default |
|----------|-------------|---------|
| `TYPHA_MAXCONNECTIONSLOWERLIMIT` | Minimum connections before Typha stops accepting | 1 |
| `TYPHA_MAXCONNECTIONSUPPERLIMIT` | Maximum concurrent Felix connections | 0 (unlimited) |
| `TYPHA_PROMETHEUSMETRICSENABLED` | Enable Prometheus metrics | false |
| `TYPHA_PROMETHEUSMETRICSPORT` | Prometheus metrics port | 9093 |
| `TYPHA_LOGSEVERITYSCREEN` | Log level | Info |
| `TYPHA_CONNECTIONREBALANCINGMODE` | How to rebalance Felix connections | "auto" |

## Step 1: Set Connection Limits

For a 500-node cluster with 2 Typha replicas, each replica should handle ~250 Felix connections.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_MAXCONNECTIONSUPPERLIMIT=300
```

## Step 2: Configure Prometheus Metrics

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_PROMETHEUSMETRICSENABLED=true \
  TYPHA_PROMETHEUSMETRICSPORT=9093
```

Expose the metrics via a ServiceMonitor if using Prometheus Operator.

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-typha
  namespace: calico-system
spec:
  selector:
    matchLabels:
      k8s-app: calico-typha
  endpoints:
  - port: metrics
    interval: 30s
EOF
```

## Step 3: Configure Log Level

For production, set Typha to Warning or Error level to reduce log volume.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_LOGSEVERITYSCREEN=Warning
```

For debugging connectivity issues, temporarily set to Debug.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_LOGSEVERITYSCREEN=Debug
```

## Step 4: Configure Felix-Side Typha Connection

Felix discovers Typha through the Kubernetes service. Configure the service name and namespace.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "typhak8sServiceName": "calico-typha",
    "typhak8sNamespace": "calico-system"
  }}'
```

Felix also supports a static Typha address for non-Kubernetes environments.

```bash
# In /etc/calico/felix.cfg on each node
TyphaAddr = <typha-node-ip>:5473
```

## Step 5: Configure Felix Reconnect Behavior

Felix will reconnect to Typha if the connection drops. Tune the reconnect interval.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"typhaReadTimeout": "30s"}}'
```

## Step 6: Verify Configuration Is Applied

```bash
# Check Typha env vars
kubectl get deployment calico-typha -n calico-system -o jsonpath='{.spec.template.spec.containers[0].env}' | python3 -m json.tool

# Check Felix configuration
calicoctl get felixconfiguration default -o yaml | grep -i typha
```

## Step 7: Test Configuration with a Policy Update

Apply a policy and check Typha propagated it to Felix.

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: typha-config-test
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

kubectl logs -n calico-system deployment/calico-typha | grep "Sent update" | tail -5
kubectl delete networkpolicy typha-config-test
```

## Conclusion

Configuring Typha for a hard way installation involves tuning connection limits to match the expected Felix count, enabling Prometheus metrics for observability, setting appropriate log levels for production, and ensuring Felix's Typha discovery configuration matches the Service name and namespace. These configurations are the operational baseline that allows Typha to serve reliably as the fan-out layer in large Calico clusters.
