# How to Troubleshoot Firewall Rules Blocking OTLP Traffic on Ports 4317 and 4318 in Corporate Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Firewall, Networking, Security

Description: Diagnose and resolve firewall rules that block OpenTelemetry OTLP traffic on the standard gRPC and HTTP ports.

In corporate environments, firewalls and network policies often block non-standard ports by default. OpenTelemetry uses ports 4317 (gRPC) and 4318 (HTTP/protobuf) for OTLP traffic, and these are frequently caught by restrictive egress rules. Here is how to identify and fix the problem.

## Recognizing Firewall-Blocked Traffic

The symptoms vary depending on the firewall behavior. Some firewalls drop packets silently (causing timeouts), while others actively reject connections.

```
# Timeout symptoms (firewall drops packets)
context deadline exceeded
export timeout: context deadline exceeded after 30s

# Active rejection (firewall sends RST)
connection refused
dial tcp 10.0.5.20:4317: connect: connection refused
```

The key difference between a firewall block and a service being down: if the service is down, you get an immediate "connection refused." If a firewall is silently dropping, you get a timeout after the configured deadline.

## Step 1: Test Connectivity

Start by testing basic TCP connectivity from the source to the destination:

```bash
# From your application pod, test gRPC port
kubectl exec -it my-app-pod -- sh -c "nc -zv -w 5 otel-collector.observability 4317"

# Test HTTP port
kubectl exec -it my-app-pod -- sh -c "nc -zv -w 5 otel-collector.observability 4318"

# If nc is not available, try with curl
kubectl exec -it my-app-pod -- sh -c "curl -v --connect-timeout 5 http://otel-collector.observability:4318/v1/traces"
```

If these hang or time out, a firewall is likely involved.

## Step 2: Check Kubernetes Network Policies

Kubernetes NetworkPolicies can block traffic between namespaces or pods:

```bash
# List all network policies in the cluster
kubectl get networkpolicies -A

# Describe policies in the Collector namespace
kubectl describe networkpolicies -n observability

# Describe policies in the application namespace
kubectl describe networkpolicies -n default
```

A restrictive network policy might look like this:

```yaml
# This policy only allows traffic from specific labels
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: otel-collector-ingress
  namespace: observability
spec:
  podSelector:
    matchLabels:
      app: otel-collector
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: default  # Only allows traffic from 'default' namespace
      ports:
        - port: 4317
        - port: 4318
```

If your application runs in a different namespace, you need to update the policy:

```yaml
# Updated policy allowing traffic from any namespace with the right label
ingress:
  - from:
      - namespaceSelector:
          matchLabels:
            otel-access: "true"  # Label your app namespaces with this
    ports:
      - port: 4317
        protocol: TCP
      - port: 4318
        protocol: TCP
```

Then label the namespaces that need access:

```bash
kubectl label namespace my-app-namespace otel-access=true
```

## Step 3: Check Cloud Provider Firewall Rules

In cloud environments (AWS, GCP, Azure), security groups and firewall rules operate at the VPC/network level.

For AWS:

```bash
# Check security groups attached to the node
aws ec2 describe-security-groups --group-ids sg-xxxx \
  --query 'SecurityGroups[].IpPermissions[?FromPort<=`4317` && ToPort>=`4317`]'
```

For GCP:

```bash
# List firewall rules that affect the relevant network
gcloud compute firewall-rules list --filter="network:my-vpc" \
  --format="table(name,direction,allowed,sourceRanges,targetTags)"
```

## Step 4: Check for Egress Restrictions

If your application sends telemetry to an external backend (not in-cluster), egress rules come into play:

```bash
# Test egress from the application pod to an external endpoint
kubectl exec -it my-app-pod -- sh -c "curl -v --connect-timeout 5 https://otlp.example.com:4317"
```

Many corporate networks use allowlists for egress traffic. You will need to request that ports 4317 and 4318 (or whatever port your backend uses) are opened for the Collector's egress.

## Workaround: Use Standard Ports

If getting firewall rules changed is a slow process, consider routing OTLP traffic through standard ports that are usually already allowed:

```yaml
# Configure the Collector to listen on port 443 (HTTPS)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:443"
      http:
        endpoint: "0.0.0.0:443"

# Or use a reverse proxy/ingress controller on port 443
# that forwards to the Collector internally
```

For the exporter side, many backends accept OTLP on port 443:

```yaml
exporters:
  otlp:
    endpoint: "otlp.backend.example.com:443"
    tls:
      insecure: false
```

## Systematic Debugging

When you suspect a firewall, trace the path:

```bash
# 1. Can you reach the destination from the pod?
kubectl exec -it my-app -- nc -zv otel-collector.observability 4317

# 2. Can you reach it from the node?
ssh node-ip "nc -zv collector-cluster-ip 4317"

# 3. Is there a network policy blocking it?
kubectl get netpol -A -o yaml | grep -A 20 "4317"

# 4. Is there a cloud-level firewall?
# Check your cloud provider's console for security groups/firewall rules
```

Firewalls are a fundamental part of network security, but they need to be configured to allow observability traffic. Document the ports and protocols OpenTelemetry needs, and work with your security team to add the right rules.
