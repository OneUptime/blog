# How to Monitor Kubernetes IPv4 Network Traffic with Hubble and Cilium

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, Hubble, Kubernetes, IPv4, Monitoring, Observability

Description: Use Cilium's Hubble network observability platform to monitor, visualize, and analyze IPv4 network traffic flows between Kubernetes pods and services.

Hubble is Cilium's built-in network observability platform. It provides real-time visibility into IPv4 flows between pods, service-level metrics, and policy decision information.

## Enabling Hubble

```bash
# Enable Hubble on an existing Cilium installation

cilium hubble enable

# Or during initial installation
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true

# Verify Hubble is running
cilium status | grep Hubble
# Expected: Hubble Relay: OK
```

## Setting Up the Hubble CLI

```bash
# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --fail -o hubble.tar.gz \
  "https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz"
sudo tar -xzf hubble.tar.gz -C /usr/local/bin

# Forward the Hubble API
cilium hubble port-forward &

# Verify connection
hubble status
```

## Observing Live IPv4 Flows

```bash
# Watch all flows in the cluster
hubble observe --follow

# Filter by namespace
hubble observe --namespace production --follow

# Filter to show only IPv4 traffic
hubble observe --ipv4 --follow

# Show only flows to/from a specific pod
hubble observe --from-pod production/my-api --follow
hubble observe --to-pod production/database --follow

# Filter by IPv4 address
hubble observe --from-ip 10.244.1.5 --follow
hubble observe --to-ip 10.96.45.123 --follow
```

## Monitoring Dropped Traffic

```bash
# Watch for dropped flows (policy denials, forwarding failures)
hubble observe --verdict DROPPED --follow

# Filter dropped flows in a specific namespace
hubble observe --namespace production --verdict DROPPED --follow

# Example output:
# Mar 20 10:15:32.123 DROPPED
#   production/my-api → production/database
#   TCP 10.244.1.5:45678 → 10.244.2.8:5432
#   Reason: policy-deny
```

## Service-Level Flow Monitoring

```bash
# Observe flows to a Kubernetes service
hubble observe --to-service default/nginx --follow

# Observe flows between two services
hubble observe --from-service production/api --to-service production/database --follow
```

## HTTP Flow Inspection (L7)

```bash
# Enable HTTP-level visibility (requires Cilium L7 proxy)
hubble observe --protocol http --follow

# Example output:
# production/api → production/frontend
# HTTP/1.1 GET http://frontend-service/api/users → 200 OK (2ms)
```

## Hubble UI

```bash
# Access Hubble's graphical interface
kubectl port-forward -n kube-system svc/hubble-ui 12000:80 &
# Open: http://localhost:12000

# The UI shows:
# - Service dependency map (which services talk to which)
# - Per-namespace flow visualization
# - Real-time traffic rates
```

## Generating Traffic Statistics

```bash
# View flow statistics for the last hour
hubble observe --since 1h --output json | \
  jq '.flow | select(.verdict == "FORWARDED") | .source.namespace' | \
  sort | uniq -c | sort -rn

# Count drops per namespace
hubble observe --since 1h --verdict DROPPED --output json | \
  jq -r '.flow.source.namespace' | sort | uniq -c | sort -rn
```

Hubble transforms Kubernetes network debugging from educated guesswork into evidence-based investigation with full IPv4 flow context.
