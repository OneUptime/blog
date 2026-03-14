# How to Tune Calico on Kind for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, Kind

Description: Learn how to tune Calico settings on Kind to mirror production-grade networking performance and security configurations.

---

## Introduction

While Kind is a development and testing tool, tuning Calico on Kind to match production settings is a valuable practice. It ensures that performance characteristics, security policies, and operational parameters you test locally translate accurately to production environments. Without proper tuning, you may encounter discrepancies between local test results and production behavior.

Calico exposes numerous tunable parameters through FelixConfiguration, BGPConfiguration, and IPPool resources. Key areas include MTU settings, iptables refresh intervals, connection tracking, logging verbosity, and health check intervals. Getting these right in Kind helps validate your production Calico configuration before rollout.

This guide covers the most impactful Calico tuning settings for production-like deployments, applied to a Kind cluster. You will configure Felix parameters, adjust MTU for IPIP overhead, and enable health reporting.

## Prerequisites

- Kind cluster with Calico installed
- calicoctl installed and configured
- kubectl access to the Kind cluster

## Step 1: Set the Correct MTU

For IPIP encapsulation, the effective MTU is reduced by 20 bytes. Configure Calico to use the correct MTU to avoid fragmentation:

```bash
kubectl patch configmap calico-config -n kube-system \
  --patch '{"data":{"veth_mtu":"1440"}}'
kubectl rollout restart daemonset calico-node -n kube-system
```

## Step 2: Tune Felix for Performance

Apply production-grade Felix settings:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  iptablesRefreshInterval: 60s
  ipv6Support: false
  logSeverityScreen: Warning
  healthEnabled: true
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
  reportingInterval: 30s
  routeRefreshInterval: 90s
EOF
```

## Step 3: Enable Prometheus Metrics

Expose Calico Felix metrics for scraping:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: calico-felix-metrics
  namespace: kube-system
spec:
  selector:
    k8s-app: calico-node
  ports:
  - name: metrics
    port: 9091
    targetPort: 9091
EOF
```

## Step 4: Configure WireGuard Encryption (Optional)

For production security, enable WireGuard encryption between nodes:

```bash
calicoctl patch felixconfiguration default --patch '{"spec":{"wireguardEnabled":true}}'
```

Note: WireGuard requires Linux kernel 5.6+ and may not be available in all Kind node images.

## Step 5: Set Resource Limits on Calico Pods

```bash
kubectl patch daemonset calico-node -n kube-system --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/resources","value":{"requests":{"cpu":"150m","memory":"128Mi"},"limits":{"cpu":"300m","memory":"512Mi"}}}]'
```

## Step 6: Verify Tuning Changes

```bash
calicoctl get felixconfiguration default -o yaml
kubectl get pods -n kube-system -l k8s-app=calico-node
```

## Conclusion

You have applied production-grade tuning to Calico on Kind, covering MTU optimization, Felix performance parameters, Prometheus metrics, and resource limits. These settings bring your Kind environment into alignment with production deployments, enabling reliable pre-production validation of Calico configurations.
