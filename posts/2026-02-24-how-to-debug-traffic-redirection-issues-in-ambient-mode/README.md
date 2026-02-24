# How to Debug Traffic Redirection Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Traffic Redirection, ztunnel, Networking

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

Note that existing pods may need to be restarted for the CNI agent to set up their redirection rules. New pods pick it up automatically:

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

Once a pod is enrolled, check that redirection rules exist in its network namespace. You need to run commands in the context of the node:

```bash
# Find the pod's node and PID
POD_NAME="my-pod-xxx"
NODE=$(kubectl get pod -n my-app $POD_NAME -o jsonpath='{.spec.nodeName}')

# Use a debug pod to check iptables rules
kubectl debug node/$NODE -it --image=nicolaka/netshoot -- bash
```

Inside the debug pod, find the pod's network namespace and check iptables:

```bash
# Find the pod's PID
POD_IP=$(kubectl get pod -n my-app my-pod-xxx -o jsonpath='{.status.podIP}')

# Check iptables rules in the pod's network namespace
# (this requires nsenter, which is available in netshoot)
nsenter -t $(pgrep -f "pause" | head -1) -n -- iptables-save | grep -E "ztunnel|15001|15006|15008"
```

You should see rules that redirect traffic to ztunnel's ports. If these rules are missing, the CNI agent did not set up redirection for this pod.

## Checking ztunnel Connectivity

Even if redirection rules are in place, the ztunnel must be able to receive and process the redirected traffic:

```bash
# Find ztunnel on the same node
ZTUNNEL=$(kubectl get pods -n istio-system -l app=ztunnel \
  --field-selector spec.nodeName=$NODE -o jsonpath='{.items[0].metadata.name}')

# Check if ztunnel knows about the pod
kubectl exec -n istio-system $ZTUNNEL -- \
  curl -s localhost:15000/config_dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for w in data.get('workloads', []):
    if 'my-pod' in json.dumps(w):
        print(json.dumps(w, indent=2))
"
```

If ztunnel does not know about the pod, it cannot handle its traffic even if redirection is configured. Check ztunnel logs:

```bash
kubectl logs -n istio-system $ZTUNNEL | grep "my-pod"
```

## Common Issue: Pod Created Before Namespace Was Labeled

If pods were created before the namespace was labeled for ambient mode, the CNI agent may not have set up redirection for them:

```bash
# Check pod creation time vs namespace label time
kubectl get pod -n my-app my-pod-xxx -o jsonpath='{.metadata.creationTimestamp}'
```

Fix by restarting the pods:

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
  cat /etc/cni/net.d/*.conflist
```

The Istio CNI should appear in the plugins chain. If it is missing, reinstall the Istio CNI component:

```bash
istioctl install --set profile=ambient --set components.cni.enabled=true -y
```

## Common Issue: Traffic Going to Wrong ztunnel

In some rare cases, traffic gets redirected but to the wrong ztunnel instance or port. Verify by capturing traffic:

```bash
# On the ztunnel pod, capture incoming traffic
kubectl exec -n istio-system $ZTUNNEL -- \
  tcpdump -i any -n "port 15008 or port 15001 or port 15006" -c 30
```

Port 15001 is ztunnel's outbound capture port, and port 15006 is the inbound capture port. Port 15008 is the HBONE tunnel port. You should see traffic on these ports when the pod makes or receives connections.

## Common Issue: DNS Not Working

When DNS requests from ambient-enrolled pods fail, it is usually because DNS traffic is also being redirected through ztunnel but ztunnel is not handling it correctly:

```bash
# Test DNS from inside the pod
kubectl exec -n my-app deploy/my-app -- nslookup kubernetes.default

# Check ztunnel DNS handling
kubectl exec -n istio-system $ZTUNNEL -- \
  curl -X POST "localhost:15000/logging?ztunnel::dns=debug"

kubectl logs -n istio-system $ZTUNNEL | grep dns
```

If DNS is failing, check the Istio installation to make sure DNS capture is enabled:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
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

# Test that mTLS is enforced (indicating traffic goes through ztunnel)
kubectl run test-client -n my-app --image=curlimages/curl --rm -it -- \
  curl -s http://test-server/headers
```

In the response headers, look for `X-Forwarded-Client-Cert`. If it is present, traffic went through the mesh with mTLS. If it is absent, redirection is not working.

## Checking ztunnel Metrics for Redirection

ztunnel metrics can confirm whether traffic is flowing through it:

```bash
kubectl exec -n istio-system $ZTUNNEL -- \
  curl -s localhost:15020/metrics | grep -E "ztunnel_connections_opened|ztunnel_bytes"
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
