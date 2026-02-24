# How to Verify mTLS is Enabled in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, mTLS, Security, Kubernetes

Description: Practical methods to verify that mutual TLS is working correctly in Istio ambient mode including log analysis, traffic inspection, and policy checks.

---

After enrolling workloads in Istio ambient mode, you want to confirm that mutual TLS is actually working. Unlike sidecar mode where you can inspect the sidecar proxy directly, ambient mode handles mTLS in the ztunnel component. The verification approach is a bit different.

This guide covers multiple ways to confirm mTLS is active and properly encrypting traffic between your workloads.

## Quick Check: ztunnel Workload Status

The fastest way to see if workloads are enrolled and using mTLS is through the ztunnel config command:

```bash
istioctl ztunnel-config workloads
```

This shows all workloads managed by ztunnel:

```
NAMESPACE    POD NAME            IP          NODE      WAYPOINT  PROTOCOL
bookinfo     productpage-v1-xx   10.0.1.5    node-1    None      HBONE
bookinfo     reviews-v1-yy       10.0.1.6    node-1    None      HBONE
bookinfo     ratings-v1-zz       10.0.2.3    node-2    None      HBONE
default      sleep-abc           10.0.1.8    node-1    None      TCP
```

The key column is `PROTOCOL`. Workloads showing `HBONE` are part of the ambient mesh and their traffic is encrypted with mTLS via the HBONE protocol. Workloads showing `TCP` are not enrolled.

## Check ztunnel Logs

ztunnel logs show connection details including whether mTLS was used. Send some traffic between meshed services:

```bash
kubectl exec deploy/sleep -n bookinfo -- curl -s http://productpage:9080/
```

Then check the ztunnel logs:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=50
```

Look for log entries that mention HBONE connections and source/destination identities:

```
info    access  connection complete src.addr=10.0.1.8:45234
  src.workload="sleep-abc" src.namespace="bookinfo"
  src.identity="spiffe://cluster.local/ns/bookinfo/sa/sleep"
  dst.addr=10.0.1.5:9080 dst.service="productpage.bookinfo.svc.cluster.local"
  dst.identity="spiffe://cluster.local/ns/bookinfo/sa/bookinfo-productpage"
  direction="outbound" bytes_sent=1234 bytes_recv=5678
  connection_security_policy="mutual_tls"
```

The `connection_security_policy="mutual_tls"` confirms mTLS is active. The `src.identity` and `dst.identity` fields show the SPIFFE identities used for the TLS handshake.

## Use Prometheus Metrics

Istio generates metrics that include connection security information. If you have Prometheus installed, query for the `istio_tcp_connections_opened_total` metric:

```bash
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'istio_tcp_connections_opened_total{connection_security_policy="mutual_tls"}'
```

For a more human-readable check, use the Prometheus web UI or Grafana:

```promql
# Count of mTLS connections in the last 5 minutes
sum(rate(istio_tcp_connections_opened_total{connection_security_policy="mutual_tls"}[5m])) by (source_workload, destination_workload)
```

If you see connections with `connection_security_policy="unknown"` or empty, those are not using mTLS.

## Test with PeerAuthentication in STRICT Mode

The ultimate test: set STRICT mTLS on a service and see if traffic still flows from other meshed services.

Apply a STRICT policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-test
  namespace: bookinfo
spec:
  selector:
    matchLabels:
      app: productpage
  mtls:
    mode: STRICT
```

Now test from a meshed service:

```bash
# This should succeed (meshed to meshed)
kubectl exec deploy/sleep -n bookinfo -- curl -s -o /dev/null -w "%{http_code}" http://productpage:9080/
```

Expected output: `200`

Test from a non-meshed service:

```bash
# Create a non-meshed namespace
kubectl create namespace no-mesh
kubectl apply -f samples/sleep/sleep.yaml -n no-mesh

# This should fail (non-meshed to STRICT meshed)
kubectl exec deploy/sleep -n no-mesh -- curl -s -o /dev/null -w "%{http_code}" http://productpage.bookinfo:9080/ --max-time 5
```

This should fail with a connection error or timeout. If the non-meshed pod can still reach the STRICT service, something is wrong with mTLS enforcement.

Clean up the test:

```bash
kubectl delete peerauthentication strict-test -n bookinfo
kubectl delete namespace no-mesh
```

## Inspect ztunnel Certificates

You can verify that ztunnel has valid certificates for your workloads:

```bash
istioctl ztunnel-config certificates
```

This shows the certificates ztunnel is using:

```
CERTIFICATE NAME                                        TYPE     STATUS  VALID CERT
spiffe://cluster.local/ns/bookinfo/sa/bookinfo-productpage  Leaf     Active  true
spiffe://cluster.local/ns/bookinfo/sa/sleep                 Leaf     Active  true
spiffe://cluster.local/ns/bookinfo/sa/bookinfo-reviews      Leaf     Active  true
```

If you see certificates with `Active` status and `VALID CERT: true`, ztunnel has valid SPIFFE certificates for those identities and can perform mTLS.

## Network Packet Inspection

For the truly paranoid (or thorough, depending on how you look at it), you can capture packets and verify they are encrypted.

Deploy a debug pod on the same node as your workload:

```bash
kubectl debug node/your-node -it --image=nicolaka/netshoot
```

Capture traffic between two pods:

```bash
tcpdump -i any -n host 10.0.1.5 and host 10.0.1.6 -w /tmp/capture.pcap -c 100
```

Generate some traffic between those pods, then examine the capture:

```bash
tcpdump -r /tmp/capture.pcap -X | head -100
```

If mTLS is working, you should see TLS handshake packets and encrypted payloads. The data should look like random bytes, not readable HTTP text.

If you see plaintext HTTP requests in the capture, mTLS is not working for that traffic path.

## Check the Istio Dashboard (Kiali)

If you have Kiali installed, it provides a visual way to verify mTLS:

```bash
istioctl dashboard kiali
```

Navigate to the Graph view and look for lock icons on the edges between services. A lock icon means the connection is using mTLS. A warning icon means it is not.

Kiali also shows the security details in the service detail page. Click on a service and look for the "Security" section to see the mTLS status.

## Common Issues Where mTLS is Not Active

### Namespace Not Labeled

The most common issue. Verify the label:

```bash
kubectl get namespace bookinfo -L istio.io/dataplane-mode
```

### Pod Has Opt-Out Label

Check if the pod has an override label:

```bash
kubectl get pod -n bookinfo -L istio.io/dataplane-mode
```

Pods with `istio.io/dataplane-mode=none` are excluded from the mesh.

### ztunnel Not Running on the Node

If the ztunnel DaemonSet is not healthy on a specific node, pods on that node will not have mTLS:

```bash
kubectl get ds ztunnel -n istio-system
kubectl get pods -l app=ztunnel -n istio-system -o wide
```

Make sure there is a running ztunnel on every node where ambient workloads are scheduled.

### istio-cni Not Configured

The CNI plugin handles traffic interception. If it is not running, traffic bypasses ztunnel entirely:

```bash
kubectl get ds istio-cni-node -n istio-system
kubectl logs -l k8s-app=istio-cni-node -n istio-system --tail=20
```

### Traffic Going to Non-Mesh Destinations

mTLS only works between two meshed endpoints. If the destination is outside the mesh, traffic is sent as plaintext (or whatever protocol the application uses). This is expected behavior, not a bug.

## Automated Verification Script

Here is a script that checks multiple indicators at once:

```bash
#!/bin/bash
NAMESPACE=${1:-bookinfo}

echo "=== Namespace Label ==="
kubectl get namespace $NAMESPACE -L istio.io/dataplane-mode

echo ""
echo "=== ztunnel Workloads ==="
istioctl ztunnel-config workloads | grep $NAMESPACE

echo ""
echo "=== ztunnel Certificates ==="
istioctl ztunnel-config certificates | grep $NAMESPACE

echo ""
echo "=== PeerAuthentication Policies ==="
kubectl get peerauthentication -n $NAMESPACE -o yaml 2>/dev/null || echo "None found"

echo ""
echo "=== ztunnel DaemonSet Status ==="
kubectl get ds ztunnel -n istio-system
```

Save it as `check-mtls.sh` and run it:

```bash
chmod +x check-mtls.sh
./check-mtls.sh bookinfo
```

This gives you a comprehensive view of mTLS status for any namespace. Combine multiple verification methods for confidence - ztunnel workload status plus metrics plus a STRICT mode test gives you strong assurance that mTLS is working as expected.
