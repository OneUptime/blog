# How to Configure Cilium Hubble Observability on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cilium, Hubble, Observability, Network Monitoring

Description: Learn how to enable and configure Cilium Hubble on Talos Linux for deep network observability and flow visibility in your cluster.

---

When something goes wrong with network connectivity in Kubernetes, you often find yourself guessing. Is the pod reachable? Is the network policy blocking traffic? Which DNS queries are failing? Hubble, Cilium's built-in observability layer, answers these questions by providing deep visibility into network flows, DNS queries, and policy decisions at the eBPF level. On Talos Linux with Cilium installed, enabling Hubble gives you powerful debugging and monitoring capabilities without deploying additional networking tools.

## What Hubble Provides

Hubble sits on top of Cilium's eBPF data plane and captures network events as they happen in the kernel. It provides:

- **Flow visibility** - See every connection between pods, services, and external endpoints
- **DNS monitoring** - Track every DNS query and response, including failures
- **Network policy verdicts** - See which policies allowed or denied traffic
- **HTTP/gRPC monitoring** - Layer 7 visibility for HTTP and gRPC traffic
- **Service dependency maps** - Visual maps of how services communicate

All of this data is available through the Hubble CLI, the Hubble UI, and Prometheus metrics.

## Prerequisites

This guide assumes you already have:

- A Talos Linux cluster running
- Cilium installed as the CNI (see the Cilium installation guide for Talos)
- Helm and kubectl configured

## Enabling Hubble

If you installed Cilium without Hubble, enable it by upgrading your Helm release:

```bash
# Enable Hubble with Relay and UI
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}"
```

If you are installing Cilium fresh with Hubble from the start:

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set k8sServiceHost=localhost \
  --set k8sServicePort=7445 \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}"
```

Wait for the Hubble components to deploy:

```bash
# Check that Hubble Relay and UI are running
kubectl get pods -n kube-system -l app.kubernetes.io/part-of=cilium

# You should see:
# hubble-relay-xxxxx
# hubble-ui-xxxxx
# Plus the existing cilium agent and operator pods
```

## Installing the Hubble CLI

The Hubble CLI lets you query network flows directly from your terminal:

```bash
# Install on macOS
brew install hubble

# Or download directly
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin/

# Port-forward Hubble Relay to access it locally
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Test the connection
hubble status
```

## Observing Network Flows

Once Hubble is running, you can observe live traffic:

```bash
# Watch all flows in real time
hubble observe

# Filter by namespace
hubble observe --namespace production

# Filter by pod
hubble observe --pod production/web-frontend

# Filter by destination
hubble observe --to-pod production/api-server

# Filter by verdict (dropped traffic)
hubble observe --verdict DROPPED

# Filter by specific port
hubble observe --port 443

# Filter by protocol
hubble observe --protocol TCP

# Combine filters
hubble observe --namespace production --verdict DROPPED --port 5432
```

Each flow entry shows the source, destination, verdict (forwarded or dropped), and the reason (which network policy matched).

## Monitoring DNS Queries

DNS issues are one of the most common networking problems in Kubernetes. Hubble makes them visible:

```bash
# Watch all DNS queries
hubble observe --protocol dns

# Filter DNS queries from a specific pod
hubble observe --pod default/my-app --protocol dns

# Look for DNS failures
hubble observe --protocol dns --verdict DROPPED

# Filter by DNS query name
hubble observe --protocol dns -o json | grep "api.example.com"
```

This is invaluable for debugging issues like DNS resolution failures, slow lookups, or unexpected DNS behavior.

## Using the Hubble UI

The Hubble UI provides a graphical interface for exploring service maps and flows:

```bash
# Port-forward the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Open in your browser
# http://localhost:12000
```

The UI shows:

- A service dependency map with connections between namespaces and services
- Flow tables with filtering capabilities
- Policy verdict visualization
- Real-time and historical views

For production access, expose the Hubble UI through an Ingress:

```yaml
# hubble-ui-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hubble-ui
  namespace: kube-system
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: hubble-ui-auth
spec:
  rules:
  - host: hubble.internal.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hubble-ui
            port:
              number: 80
```

## Configuring Hubble Metrics

Hubble can export metrics to Prometheus for dashboarding and alerting:

```bash
# Enable specific metrics during Cilium installation/upgrade
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set hubble.metrics.enabled="{dns:query;ignoreAAAA,drop:sourceContext=identity;destinationContext=identity,tcp,flow:sourceContext=workload-name;destinationContext=workload-name,icmp,http}"
```

The metrics are exposed on port 9965 on each Cilium agent. Create a ServiceMonitor to scrape them:

```yaml
# hubble-metrics-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hubble-metrics
  namespace: monitoring
spec:
  endpoints:
  - port: hubble-metrics
    interval: 15s
  selector:
    matchLabels:
      k8s-app: cilium
  namespaceSelector:
    matchNames:
    - kube-system
```

Common Hubble metrics for Grafana dashboards:

```promql
# DNS query rate by response code
sum(rate(hubble_dns_queries_total[5m])) by (rcode)

# Dropped packet rate by reason
sum(rate(hubble_drop_total[5m])) by (reason)

# HTTP request rate by status code
sum(rate(hubble_http_requests_total[5m])) by (status)

# TCP connection rate
sum(rate(hubble_tcp_flags_total[5m])) by (flag)

# Flow rate by verdict
sum(rate(hubble_flows_processed_total[5m])) by (verdict)
```

## Layer 7 Visibility

For HTTP and gRPC observability, configure Cilium to parse Layer 7 traffic:

```yaml
# l7-visibility-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: l7-visibility
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: web-api
  ingress:
  - fromEndpoints:
    - matchLabels: {}
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - {}  # Match all HTTP requests for visibility
```

With L7 visibility enabled, Hubble shows individual HTTP requests including method, URL, status code, and latency:

```bash
# Observe HTTP flows
hubble observe --namespace production --http-method GET
hubble observe --namespace production --http-status 500
```

## Troubleshooting Hubble

If Hubble is not showing data:

```bash
# Check Hubble Relay status
kubectl logs -n kube-system -l app.kubernetes.io/name=hubble-relay --tail=50

# Verify Hubble is enabled in Cilium config
kubectl exec -n kube-system ds/cilium -- cilium status | grep Hubble

# Check that flows are being collected
hubble observe --last 10

# If no flows, check Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 | grep hubble
```

## Summary

Cilium Hubble on Talos Linux transforms your cluster's networking from a black box into a transparent, observable system. Enable Hubble through your Cilium Helm configuration, use the CLI for quick investigations, the UI for visual exploration, and Prometheus metrics for ongoing monitoring. The combination of Talos Linux's secure platform, Cilium's eBPF networking, and Hubble's deep observability gives you complete visibility into every packet flowing through your cluster.
