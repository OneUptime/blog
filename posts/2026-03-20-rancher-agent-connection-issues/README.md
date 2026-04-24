# How to Troubleshoot Rancher Agent Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, Agent

Description: Learn how to diagnose and fix Rancher agent connection problems, including network issues, certificate mismatches, and proxy configuration.

## Introduction

The `cattle-cluster-agent` is the primary component that maintains communication between a downstream cluster and the Rancher management server. Depending on the cluster type, Rancher may also use a node-level agent such as `cattle-node-agent` or `rancher-system-agent` for node operations or as a fallback tunnel. When these agents lose connectivity, clusters appear as "Unavailable" in the Rancher UI, and operations like deploying workloads stop working. This guide covers how to systematically restore connectivity.

## Understanding the Agent Architecture

```text
Rancher Server (management cluster)
        ↑  tunnel connection
cattle-cluster-agent (downstream cluster)

Optional node-level agent, depending on cluster type:
- cattle-node-agent (RKE clusters created by Rancher)
- rancher-system-agent (RKE2/K3s clusters provisioned by Rancher)
```

The `cattle-cluster-agent` opens a tunnel to the corresponding cluster controller in Rancher. Rancher uses this path for cluster management traffic unless you access the cluster through an authorized cluster endpoint.

## Step 1: Check Agent Pod Status

```bash
# Check the cluster agent

kubectl get pods -n cattle-system

# Expected: cattle-cluster-agent-<hash>   1/1   Running
# Problem:  cattle-cluster-agent-<hash>   0/1   CrashLoopBackOff

# Get detailed events
kubectl describe pod -n cattle-system -l app=cattle-cluster-agent

# Stream agent logs
kubectl logs -n cattle-system -l app=cattle-cluster-agent -f --tail=200
```

## Step 2: Check Network Connectivity

The agent must reach the Rancher server URL on port 443:

```bash
# Test from inside the cluster using a debug pod
kubectl run net-debug --rm -it \
  --image=nicolaka/netshoot \
  --restart=Never \
  --command -- curl -vk https://<rancher-url>/healthz

# Check DNS resolution
kubectl run dns-debug --rm -it \
  --image=nicolaka/netshoot \
  --restart=Never \
  --command -- nslookup <rancher-hostname>

# Check the Rancher API endpoint through the same hostname/load balancer
kubectl run api-debug --rm -it \
  --image=nicolaka/netshoot \
  --restart=Never \
  --command -- curl -vk https://<rancher-url>/v3
```

If Rancher is behind a load balancer or reverse proxy, confirm that it supports long-lived WebSocket connections.

## Step 3: Verify the Cattle Server URL

The agent uses the `CATTLE_SERVER` environment variable to know where to connect. It should match Rancher's configured `server-url` setting:

```bash
# Check the current server URL setting via the Rancher API
curl -sk -u "$ACCESS_KEY:$SECRET_KEY" \
  https://<rancher-url>/v3/settings/server-url | jq -r .value
```

If the URL is wrong, correct it in Rancher under **Global Settings**. Rancher documents the server URL as a setting that should be set carefully, because updating it after initial configuration is not a supported routine operation.

## Step 4: Check Certificate Trust

If Rancher uses a private or self-signed CA, the agent must trust it:

```bash
# Check the cacerts setting
curl -sk https://<rancher-url>/v3/settings/cacerts \
  | jq -r .value | openssl x509 -noout -subject -issuer -dates

# Calculate the checksum Rancher agents should use
curl -sk https://<rancher-url>/v3/settings/cacerts \
  | jq -r .value | sha256sum | awk '{print $1}'

# Agent logs showing TLS errors
# "x509: certificate signed by unknown authority"
# → The agent doesn't trust Rancher's CA

# Update the checksum on the cluster agent
kubectl set env deployment/cattle-cluster-agent -n cattle-system \
  CATTLE_CA_CHECKSUM=<new-ca-checksum>

# If the cluster also has cattle-node-agent, update it too
kubectl set env daemonset/cattle-node-agent -n cattle-system \
  CATTLE_CA_CHECKSUM=<new-ca-checksum>
```

## Step 5: Check Proxy Configuration

If your cluster nodes use an HTTP proxy, the agent needs matching configuration:

```bash
# Check existing proxy env vars on the agent
kubectl get deployment -n cattle-system cattle-cluster-agent -o json \
  | jq '.spec.template.spec.containers[].env[]? | select(.name | endswith("PROXY"))'

# The agent respects standard proxy env vars:
# HTTP_PROXY, HTTPS_PROXY, NO_PROXY
# NO_PROXY must contain hostnames, domains, or CIDR ranges that should bypass the proxy
# Use uppercase NO_PROXY when you need CIDR notation
```

Update proxy settings:

```bash
kubectl set env deployment/cattle-cluster-agent -n cattle-system \
  HTTP_PROXY=http://proxy.example.com:3128 \
  HTTPS_PROXY=http://proxy.example.com:3128 \
  NO_PROXY=127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,cattle-system.svc,.svc,.cluster.local,<rancher-hostname>

# If the cluster also has cattle-node-agent, update it too
kubectl set env daemonset/cattle-node-agent -n cattle-system \
  HTTP_PROXY=http://proxy.example.com:3128 \
  HTTPS_PROXY=http://proxy.example.com:3128 \
  NO_PROXY=127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,cattle-system.svc,.svc,.cluster.local,<rancher-hostname>
```

## Step 6: Force Re-registration

If all else fails, force the agent to re-register with Rancher:

```bash
# If you have access to the Rancher local management cluster,
# force Rancher to redeploy the downstream agent manifest
kubectl annotate clusters.management.cattle.io <cluster-id> \
  io.cattle.agent.force.deploy=true

# Watch the downstream agent restart
kubectl get pods -n cattle-system -w
```

Alternatively, for imported clusters, re-run the generated registration `kubectl apply` command from the Rancher UI on the downstream cluster.

## Step 7: Check Firewall and Security Groups

Ensure the downstream cluster's egress rules allow:

| Protocol | Port | Destination |
|---|---|---|
| TCP | 443 | Rancher server |
| TCP | 443 | Container registry (if pulling agent image) |

If Rancher is fronted by a load balancer or reverse proxy, it also needs to allow long-lived WebSocket connections.

## Conclusion

Rancher agent connection issues almost always trace back to network reachability, TLS certificate trust, incorrect server URLs, or proxy misconfiguration. Work through each layer methodically - pod status, network connectivity, certificate validity, and proxy settings - and the agent will re-establish its connection to the Rancher management server.
