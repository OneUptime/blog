# How to Verify That Traffic is Using mTLS in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Verification, Security, Observability

Description: Practical methods to verify that service-to-service traffic in your Istio mesh is actually encrypted with mutual TLS as expected.

---

You enabled mTLS in Istio. Your PeerAuthentication says STRICT. But is traffic actually encrypted? Trust but verify is the wrong approach here. In security, it should be verify, verify, and verify again.

There are several ways to confirm mTLS is working in your mesh, ranging from CLI tools to metrics queries to packet captures. This guide covers all of them.

## Method 1: istioctl x describe

The quickest way to check mTLS status for a specific pod:

```bash
istioctl x describe pod <pod-name> -n <namespace>
```

Sample output:

```
Pod: my-service-abc123
   Pod Revision: default
   Pod Ports: 8080 (my-service), 15090 (istio-proxy)
Suggestion: add 'version' label to pod for Istio telemetry.
--------------------
Service: my-service
   Port: http 8080/HTTP targets pod port 8080

Effective PeerAuthentication:
   default/production (namespace-wide policy)
   mTLS mode: STRICT

Applied DestinationRules:
   None
```

The "Effective PeerAuthentication" section tells you what mTLS mode is active for this pod. If it says STRICT, the pod only accepts mTLS connections.

## Method 2: Check Proxy Configuration

Inspect the actual Envoy configuration to see if TLS is configured on the inbound listeners:

```bash
istioctl proxy-config listener <pod-name> -n <namespace> --port 8080 -o json
```

In the JSON output, look for `transportSocket` entries. If mTLS is enabled, you will see a transport socket with type `envoy.transport_sockets.tls` and it will reference certificate paths like `/etc/certs/` or SDS (Secret Discovery Service) configuration.

For a more targeted check, look at the cluster configuration for a specific destination:

```bash
istioctl proxy-config cluster <source-pod-name> -n <namespace> --fqdn <destination-service> -o json
```

Look for:

```json
{
  "transportSocket": {
    "name": "envoy.transport_sockets.tls",
    "typedConfig": {
      "@type": "type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext",
      ...
    }
  }
}
```

If this is present, the source pod is configured to use TLS when connecting to the destination.

## Method 3: Prometheus Metrics

Istio adds a `connection_security_policy` label to request metrics. This is one of the most reliable ways to check mTLS status at scale.

Check if all traffic to a service uses mTLS:

```
istio_requests_total{destination_service="my-service.production.svc.cluster.local", reporter="destination"}
```

Group by security policy:

```
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service, connection_security_policy)
```

The `connection_security_policy` label has these possible values:
- `mutual_tls` - Connection used mTLS
- `none` - Connection was plain text
- `unknown` - Could not be determined

If you see `none` for any service in strict mode, something is wrong.

### Build a Dashboard

Create a Grafana panel with this query to track mTLS adoption across the mesh:

```
sum(rate(istio_requests_total{connection_security_policy="mutual_tls", reporter="destination"}[5m]))
/
sum(rate(istio_requests_total{reporter="destination"}[5m]))
```

This gives you the percentage of traffic using mTLS. In a fully strict mesh, this should be 100%.

## Method 4: Access Logs

Enable access logging and check the log entries for TLS information:

```bash
kubectl logs <pod-name> -c istio-proxy --tail=50
```

In the default access log format, look for the `DOWNSTREAM_TLS_VERSION` and `DOWNSTREAM_TLS_CIPHER` fields. If the connection uses mTLS, these will show values like `TLSv1.3` and cipher suite names.

To get more detailed TLS information in the access logs, you can customize the log format:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %DOWNSTREAM_TLS_VERSION% %DOWNSTREAM_TLS_CIPHER%
      %DOWNSTREAM_PEER_SUBJECT% "%UPSTREAM_TRANSPORT_FAILURE_REASON%"\n
```

With this format, mTLS connections will show the peer's certificate subject, while plain text connections will show empty fields.

## Method 5: Envoy Admin Stats

Each sidecar tracks TLS connection statistics. Query them directly:

```bash
kubectl exec <pod-name> -c istio-proxy -- pilot-agent request GET /stats | grep ssl
```

Key stats to look for:

```
listener.0.0.0.0_8080.ssl.connection_error: 0
listener.0.0.0.0_8080.ssl.handshake: 1523
listener.0.0.0.0_8080.ssl.no_certificate: 0
listener.0.0.0.0_8080.ssl.peer_certificate_error: 0
```

- `ssl.handshake` - Number of successful TLS handshakes
- `ssl.connection_error` - TLS connection errors
- `ssl.no_certificate` - Connections where the client did not present a certificate
- `ssl.peer_certificate_error` - Client certificate validation failures

If `ssl.handshake` is incrementing and the error counters are zero, mTLS is working correctly.

For outbound stats:

```bash
kubectl exec <pod-name> -c istio-proxy -- pilot-agent request GET /stats | grep "cluster.outbound.*ssl"
```

## Method 6: Kiali Service Graph

If you have Kiali installed (Istio's observability dashboard), it provides a visual way to check mTLS:

```bash
istioctl dashboard kiali
```

In the service graph view, connections using mTLS show a padlock icon. Connections without mTLS show an open connection line. This gives you a quick visual overview of the entire mesh.

## Method 7: Packet Capture (The Ultimate Proof)

If you really want to prove that traffic is encrypted on the wire, capture packets between two pods:

```bash
# Get the IP of the destination pod
kubectl get pod <dest-pod> -o jsonpath='{.status.podIP}'

# Capture traffic on the source pod's sidecar
kubectl exec <source-pod> -c istio-proxy -- tcpdump -i eth0 host <dest-pod-ip> -w /tmp/capture.pcap -c 100

# Copy the capture file
kubectl cp <source-pod>:/tmp/capture.pcap ./capture.pcap -c istio-proxy
```

Open the capture in Wireshark. If mTLS is working, you will see TLS handshake packets (ClientHello, ServerHello, Certificate, etc.) followed by encrypted application data. You should NOT see readable HTTP requests or responses.

## Automated Verification Script

Here is a script that checks mTLS status across all services:

```bash
#!/bin/bash

echo "Checking mTLS status for all pods..."

for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo ""
  echo "=== Namespace: $ns ==="

  # Check PeerAuthentication
  pa=$(kubectl get peerauthentication -n $ns -o jsonpath='{.items[0].spec.mtls.mode}' 2>/dev/null)
  echo "PeerAuthentication mode: ${pa:-not set (using mesh default)}"

  # Check each deployment
  for deploy in $(kubectl get deploy -n $ns -o jsonpath='{.items[*].metadata.name}'); do
    pod=$(kubectl get pod -n $ns -l app=$deploy -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$pod" ]; then
      has_sidecar=$(kubectl get pod $pod -n $ns -o jsonpath='{.spec.containers[*].name}' | grep -c istio-proxy)
      echo "  $deploy: sidecar=$has_sidecar"
    fi
  done
done
```

Run this periodically or as part of your CI/CD pipeline to catch any drift in mTLS coverage.

## What to Do When mTLS is Not Working

If any of these checks reveal that traffic is not using mTLS when it should be:

1. Verify the PeerAuthentication policy is applied correctly
2. Check that both source and destination pods have sidecars
3. Look for DestinationRules that might override the TLS mode
4. Check if auto mTLS is disabled in the mesh config
5. Restart the affected pods to pick up the latest configuration

The most common cause of unexpected plain text traffic is a missing sidecar on the source side. Auto mTLS detects this and falls back to plain text rather than failing the connection (in permissive mode). Fix the source pod's sidecar injection and the traffic will automatically switch to mTLS.
