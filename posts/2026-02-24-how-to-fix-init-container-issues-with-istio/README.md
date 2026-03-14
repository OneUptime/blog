# How to Fix Init Container Issues with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Init Containers, Iptables, Troubleshooting, Kubernetes

Description: Resolve Istio init container failures including iptables permission errors, CNI conflicts, security policy blocks, and network setup problems.

---

The `istio-init` container is the unsung hero of the Istio sidecar. It runs before everything else and sets up the iptables rules that redirect all network traffic through the Envoy sidecar proxy. When it fails, the pod either does not start at all or starts without traffic interception, which means the mesh features simply do not work.

This guide focuses specifically on init container issues and how to resolve them.

## What the Init Container Does

The `istio-init` container runs a single command: it sets up iptables rules to intercept inbound and outbound traffic and redirect it through the Envoy proxy. Specifically, it:

1. Redirects all outbound traffic to Envoy's outbound listener (port 15001)
2. Redirects all inbound traffic to Envoy's inbound listener (port 15006)
3. Excludes certain ports and IP ranges from interception (based on configuration)

After this setup is done, the init container exits and the regular containers start.

Check the init container status:

```bash
# See if the init container succeeded
kubectl get pod <pod-name> -n production -o jsonpath='{.status.initContainerStatuses[?(@.name=="istio-init")].state}'

# Check the exit code
kubectl get pod <pod-name> -n production -o jsonpath='{.status.initContainerStatuses[?(@.name=="istio-init")].lastState.terminated.exitCode}'
```

## Permission Denied Errors

The most common init container failure:

```bash
kubectl logs <pod-name> -c istio-init -n production
# Output: iptables v1.8.7: can't initialize iptables table `nat': Permission denied
```

The init container needs the NET_ADMIN and NET_RAW capabilities. Check what capabilities it has:

```bash
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.initContainers[?(@.name=="istio-init")].securityContext}'
```

It should have:

```yaml
securityContext:
  capabilities:
    add:
      - NET_ADMIN
      - NET_RAW
  runAsNonRoot: false
  runAsUser: 0
```

If a PodSecurityPolicy or Pod Security Admission is stripping these:

```bash
# Check Pod Security Admission labels
kubectl get namespace production --show-labels | grep pod-security

# If the namespace enforces "restricted"
kubectl label namespace production pod-security.kubernetes.io/enforce=baseline --overwrite
```

The `baseline` security standard allows NET_ADMIN for init containers. The `restricted` standard does not.

## Using Istio CNI Instead of Init Containers

If you cannot use NET_ADMIN capabilities (common in highly locked-down environments), the Istio CNI plugin is the alternative. It sets up the iptables rules at the node level using a DaemonSet, eliminating the need for the init container entirely.

Install Istio with CNI:

```bash
istioctl install --set components.cni.enabled=true --set values.cni.excludeNamespaces='{istio-system,kube-system}'
```

Or via IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
        - istio-system
        - kube-system
```

Verify the CNI is running:

```bash
kubectl get pods -n istio-system -l k8s-app=istio-cni-node
```

With CNI enabled, new pods will not have the istio-init container. Restart existing pods to switch over:

```bash
kubectl rollout restart deployment -n production
```

## Init Container Image Pull Failures

If the init container cannot pull its image:

```bash
kubectl describe pod <pod-name> -n production | grep "istio-init" -A 10

# You might see:
# Failed to pull image "docker.io/istio/proxyv2:1.20.0": rpc error
```

Fix by configuring the image registry:

```yaml
# For air-gapped environments, mirror the image
# Then configure Istio to use your registry
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      hub: my-registry.example.com/istio
      tag: 1.20.0
```

If you just need an image pull secret:

```bash
# Create the secret
kubectl create secret docker-registry istio-pull-secret \
  --docker-server=my-registry.example.com \
  --docker-username=user \
  --docker-password=pass \
  -n production

# Add it to the default service account
kubectl patch serviceaccount default -n production \
  -p '{"imagePullSecrets": [{"name": "istio-pull-secret"}]}'
```

## Multiple Init Containers Ordering

If your pod has other init containers along with istio-init, the order matters. The istio-init container should run first (or at least before any init container that needs network access):

```bash
# Check init container order
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.initContainers[*].name}'
```

If your custom init container runs before istio-init and needs to make network calls, those calls will not go through the mesh. If it runs after istio-init, network calls will be intercepted by iptables but the Envoy proxy might not be ready yet.

For init containers that need network access, exclude them from traffic interception:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432"  # Allow direct DB connection
```

## Excluding Ports and IP Ranges

Sometimes the init container succeeds but the iptables rules break something. For example, if your application needs to connect to a service on a specific port without going through the proxy:

```yaml
metadata:
  annotations:
    # Exclude specific outbound ports from interception
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379"

    # Exclude specific inbound ports
    traffic.sidecar.istio.io/excludeInboundPorts: "9090"

    # Exclude specific IP ranges
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8"

    # Only intercept traffic to these IP ranges
    traffic.sidecar.istio.io/includeOutboundIPRanges: "10.96.0.0/12"
```

Check what iptables rules were created:

```bash
# If the pod is running, check iptables rules
kubectl exec <pod-name> -c istio-proxy -n production -- iptables -t nat -L -n
```

## Init Container Timeout

In rare cases, the init container might hang instead of crashing:

```bash
# Pod stuck in Init:0/2 state
kubectl get pod <pod-name> -n production
```

This can happen when:

- The iptables kernel modules are not loaded on the node
- The container runtime is slow
- The node is under heavy load

Check the node:

```bash
# Which node is the pod on?
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.nodeName}'

# Check node conditions
kubectl describe node <node-name> | grep -A 5 "Conditions"
```

## Debugging iptables Rules

If the init container completes but traffic is not being intercepted correctly, inspect the rules:

```bash
# Check the NAT table rules
kubectl exec <pod-name> -c istio-proxy -n production -- iptables -t nat -L ISTIO_INBOUND -n -v
kubectl exec <pod-name> -c istio-proxy -n production -- iptables -t nat -L ISTIO_OUTPUT -n -v
kubectl exec <pod-name> -c istio-proxy -n production -- iptables -t nat -L ISTIO_REDIRECT -n -v
```

Expected rules should show:
- ISTIO_REDIRECT chain redirecting traffic to port 15001 (outbound)
- ISTIO_IN_REDIRECT chain redirecting to port 15006 (inbound)
- Exceptions for excluded ports and the proxy's own ports

If these rules are missing, the init container either did not run or failed silently.

## Quick Troubleshooting Steps

```bash
# 1. Check init container status
kubectl describe pod <pod-name> -n production | grep -A 20 "Init Containers"

# 2. Check init container logs
kubectl logs <pod-name> -c istio-init -n production

# 3. Check security context
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.initContainers[?(@.name=="istio-init")].securityContext}' | jq .

# 4. Check namespace security policy
kubectl get namespace production --show-labels

# 5. Check if CNI is available as an alternative
kubectl get pods -n istio-system -l k8s-app=istio-cni-node

# 6. Verify iptables rules (on running pod)
kubectl exec <pod-name> -c istio-proxy -n production -- iptables -t nat -L -n
```

Init container issues are almost always permission-related. If you are in a restricted environment, switching to Istio CNI is usually the cleanest solution. For less restricted environments, making sure the init container has NET_ADMIN and NET_RAW capabilities resolves the vast majority of problems.
