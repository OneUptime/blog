# How to Debug Traffic Redirection Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Traffic Redirection, Ztunnel, Networking

Description: Step-by-step troubleshooting for traffic redirection problems in Istio ambient mode when pods bypass or fail to reach ztunnel.

---

Traffic redirection is the foundation of Istio ambient mode. Without it working correctly, pods either bypass the mesh entirely (losing mTLS and authorization) or lose network connectivity altogether. When redirection breaks, the symptoms range from subtle security gaps to complete network failures. This guide walks through how to diagnose and fix redirection issues.

## How Traffic Redirection Works in Ambient Mode

In ambient mode, the Istio CNI agent sets up redirection rules when a pod starts in an ambient-enabled namespace. The general flow is:

1. Pod is created in a namespace labeled with `istio.io/dataplane-mode: ambient`
2. The Istio CNI plugin (or the Istio CNI agent DaemonSet) detects the pod
3. Redirection rules are configured in the pod's network namespace
4. Outbound traffic from the pod is redirected to the local ztunnel
5. Inbound traffic destined for the pod is also routed through ztunnel

If step 2 or 3 fails, the pod either has no mesh connectivity or bypasses the mesh.

## Verifying Namespace and Pod Enrollment

Start with the basics. Check that the namespace is enrolled in ambient mode:

```bash
kubectl get namespace my-app --show-labels
```

You need to see `istio.io/dataplane-mode=ambient` in the labels. If it is missing:

```bash
kubectl label namespace my-app istio.io/dataplane-mode=ambient
```

In ambient mode, existing pods do not normally need to be restarted when you add the namespace label. The CNI agent watches for the label and can add running pods to the mesh. If a pod still does not get enrolled after the label is applied, restarting it is a useful recovery step:

```bash
kubectl rollout restart deployment -n my-app
```

## Checking Istio CNI Agent Status

The Istio CNI agent runs as a DaemonSet and is responsible for configuring redirection:

```bash
# Check CNI agent pods

kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o wide

# Check CNI agent logs for errors
kubectl logs -n istio-system -l k8s-app=istio-cni-node | grep -i "error\|fail\|ambient"
```

If the CNI agent is not running or has errors, redirection will not be configured for any pods.

Look for successful enrollment messages:

```bash
kubectl logs -n istio-system -l k8s-app=istio-cni-node | grep "Adding pod to ambient mesh"
```

And error messages:

```bash
kubectl logs -n istio-system -l k8s-app=istio-cni-node | grep -i "failed to add pod"
```

## Verifying Redirection Rules

Once a pod is enrolled, check that redirection rules exist in its network namespace:

```bash
POD_NAME="my-pod-xxx"

# Check iptables rules in the pod's network namespace.
# The netadmin debug profile gives the debug container enough privileges.
kubectl debug $POD_NAME -n my-app -it \
  --image=gcr.io/istio-release/base \
  --profile=netadmin -- \
  iptables-save | grep -E "ISTIO|15001|15006|15008"
```

You should see rules that redirect traffic to ztunnel's ports. If these rules are missing, the CNI agent did not set up redirection for this pod.

## Checking ztunnel Connectivity

Even if redirection rules are in place, the ztunnel must be able to receive and process the redirected traffic:

```bash
# Find ztunnel on the same node
NODE=$(kubectl get pod -n my-app my-pod-xxx -o jsonpath='{.spec.nodeName}')
ZTUNNEL=$(kubectl get pods -n istio-system -l app=ztunnel \
  --field-selector spec.nodeName=$NODE -o jsonpath='{.items[0].metadata.name}')

# Check if ztunnel knows about the pod
istioctl ztunnel-config workloads $ZTUNNEL.istio-system \
  --workload-namespace my-app | grep my-pod
```

If ztunnel does not know about the pod, it cannot handle its traffic even if redirection is configured. Check ztunnel logs:

```bash
kubectl logs -n istio-system $ZTUNNEL | grep "my-pod"
```

## Common Issue: Pod Not Reconciled After Namespace Was Labeled

Ambient mode can add already-running pods to the mesh when a namespace is labeled. If that reconciliation did not happen, compare the pod state with the ztunnel view:

```bash
kubectl get pod -n my-app my-pod-xxx -o jsonpath='{.metadata.creationTimestamp}'
istioctl ztunnel-config workloads --workload-namespace my-app | grep my-pod
```

Fix by checking the CNI agent logs and, if needed, restarting the affected pods:

```bash
kubectl rollout restart deployment -n my-app my-deployment
```

## Common Issue: CNI Plugin Order

The Istio CNI plugin must be chained correctly with the primary CNI. Check the CNI configuration:

```bash
# On the node
cat /etc/cni/net.d/*.conflist
```

Or through a debug pod:

```bash
kubectl debug node/$NODE -it --image=nicolaka/netshoot -- \
  cat /host/etc/cni/net.d/*.conflist
```

The Istio CNI should appear in the plugins chain. If it is missing, reinstall the Istio CNI component:

```bash
istioctl install --set profile=ambient --set components.cni.enabled=true -y
```

## Common Issue: Traffic Going to Wrong ztunnel

In some rare cases, traffic gets redirected but to the wrong ztunnel instance or port. Verify by capturing traffic:

```bash
# From a debug container attached to the ztunnel pod, capture incoming traffic
kubectl debug -n istio-system $ZTUNNEL -it --image=nicolaka/netshoot -- \
  tcpdump -i any -n "port 15008 or port 15001 or port 15006" -c 30
```

Port 15001 is ztunnel's outbound capture port, and port 15006 is the inbound capture port. Port 15008 is the HBONE tunnel port. You should see traffic on these ports when the pod makes or receives connections.

## Common Issue: DNS Not Working

When DNS requests from ambient-enrolled pods fail, it is usually because DNS traffic is also being redirected through ztunnel but ztunnel is not handling it correctly:

```bash
# Test DNS from inside the pod
kubectl exec -n my-app deploy/my-app -- nslookup kubernetes.default

# Temporarily increase ztunnel DNS logging
istioctl ztunnel-config log $ZTUNNEL.istio-system --level debug

kubectl logs -n istio-system $ZTUNNEL | grep dns
```

DNS proxying is enabled by default for ambient mode in Istio 1.25 and later. For older ambient installations, check the Istio installation to make sure DNS capture is enabled:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    cni:
      ambient:
        dnsCapture: true
    pilot:
      env:
        PILOT_ENABLE_IP_AUTOALLOCATE: true
```

## Testing Redirection End-to-End

Run a comprehensive test to verify redirection works:

```bash
# Deploy test workloads
kubectl apply -n my-app -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-server
  template:
    metadata:
      labels:
        app: test-server
    spec:
      containers:
        - name: server
          image: kennethreitz/httpbin
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: test-server
spec:
  selector:
    app: test-server
  ports:
    - port: 80
EOF

# Test connectivity through the service
kubectl run test-client -n my-app --image=curlimages/curl --rm -it -- \
  curl -s http://test-server/headers

# Confirm the workloads are configured for HBONE
istioctl ztunnel-config workloads --workload-namespace my-app | \
  grep -E "test-client|test-server"
```

In the `istioctl ztunnel-config workloads` output, look for `HBONE` in the `PROTOCOL` column for the workloads. ztunnel operates at Layer 4, so it does not add HTTP headers such as `X-Forwarded-Client-Cert`.

## Checking ztunnel Metrics for Redirection

ztunnel metrics can confirm whether traffic is flowing through it:

```bash
kubectl debug -n istio-system $ZTUNNEL -it --image=curlimages/curl -- \
  curl -s localhost:15020/metrics | grep -E "istio_tcp_connections_opened_total|istio_tcp_sent_bytes_total|istio_tcp_received_bytes_total"
```

If connection counters are zero or not increasing when you send traffic, redirection is broken.

## Recovery Steps

If redirection is broken and you need to get things working:

1. Restart the Istio CNI agent: `kubectl rollout restart daemonset -n istio-system istio-cni-node`
2. Restart ztunnel: `kubectl rollout restart daemonset -n istio-system ztunnel`
3. Restart the affected pods: `kubectl rollout restart deployment -n my-app`

If the issue persists, temporarily remove the namespace from ambient mode to restore connectivity while you debug:

```bash
kubectl label namespace my-app istio.io/dataplane-mode-
```

Traffic redirection issues in ambient mode usually come down to the CNI agent not configuring rules correctly, ztunnel not being aware of the pod, or conflicts with other CNI plugins. Work through the checks systematically from namespace labels through CNI configuration to ztunnel state, and you will find the problem.
