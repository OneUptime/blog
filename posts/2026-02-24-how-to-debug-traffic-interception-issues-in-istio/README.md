# How to Debug Traffic Interception Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, Traffic Interception, Envoy, Kubernetes, Troubleshooting

Description: Step-by-step techniques for debugging when Istio traffic interception is not working correctly, from iptables inspection to Envoy listener analysis.

---

Traffic interception issues in Istio can be some of the most frustrating problems to debug. Your application might work fine without the sidecar but break as soon as Istio injects one. Or maybe traffic flows to some services but not others. The key is to systematically check each layer of the interception mechanism.

## Symptom: Connection Refused or Timeout

If your application can't connect to other services after sidecar injection, start with the basics.

First, confirm the sidecar is actually running:

```bash
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].name}'
```

You should see both your application container and `istio-proxy`. If `istio-proxy` is missing, check that sidecar injection is enabled for the namespace:

```bash
kubectl get namespace <namespace> --show-labels | grep istio-injection
```

The namespace should have `istio-injection=enabled` or a revision label like `istio.io/rev=default`.

## Check the Init Container

The init container sets up iptables rules. If it failed, traffic won't be redirected:

```bash
kubectl get pod <pod-name> -o jsonpath='{.status.initContainerStatuses[*].name}: {.status.initContainerStatuses[*].ready}'
```

If the init container failed, check its logs:

```bash
kubectl logs <pod-name> -c istio-init
```

Common failures include:
- Missing NET_ADMIN capability (blocked by security policy)
- Image pull errors
- Insufficient permissions

## Inspect iptables Rules

The next step is to verify that iptables rules are in place:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L -v -n
```

Look for the custom Istio chains: ISTIO_INBOUND, ISTIO_IN_REDIRECT, ISTIO_OUTPUT, and ISTIO_REDIRECT. If these chains are missing or empty, the init container didn't run successfully.

Check the packet counters on each rule. If ISTIO_REDIRECT has packets flowing through it, outbound interception is working. If the counters are all zero, something is off.

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L -v -n --line-numbers
```

## Verify Envoy Is Listening

Envoy needs to be listening on the expected ports. Port 15001 is the outbound listener and 15006 is the inbound listener:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ss -tlnp
```

You should see entries for ports 15001, 15006, 15021, and 15090. If these ports aren't listening, Envoy hasn't started correctly.

Check the Envoy process:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ps aux | grep envoy
```

## Check Envoy Listener Configuration

Use `istioctl` to inspect the Envoy listeners:

```bash
istioctl proxy-config listener <pod-name>
```

This shows all the listeners configured in Envoy. For a healthy pod, you should see at least:

```
ADDRESS      PORT  MATCH                                     DESTINATION
0.0.0.0      15001 ALL                                       PassthroughCluster
0.0.0.0      15006 ALL                                       Inline Route: /*
0.0.0.0      15021 ALL                                       Inline Route: /healthz/ready*
10.96.0.1    443   ALL                                       Cluster: outbound|443||kubernetes.default.svc.cluster.local
```

If the listener list is empty or missing entries, Envoy might not be receiving configuration from istiod. Check the proxy status:

```bash
istioctl proxy-status
```

Look for your pod. The SYNCED column should show "SYNCED" for all categories (CDS, LDS, EDS, RDS). If any show "NOT SENT" or "STALE", there's a configuration delivery problem.

## Check Envoy Clusters and Routes

Beyond listeners, check that Envoy has the right upstream clusters:

```bash
istioctl proxy-config cluster <pod-name>
```

And the routes:

```bash
istioctl proxy-config route <pod-name>
```

If a destination service is missing from the cluster list, Envoy won't know how to route traffic to it. This can happen if the Kubernetes service doesn't exist or if the Sidecar resource is filtering it out.

## Examine Envoy Access Logs

Envoy access logs tell you exactly what's happening with each request:

```bash
kubectl logs <pod-name> -c istio-proxy --tail=100
```

A typical access log entry looks like:

```
[2024-01-15T10:30:45.123Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 15 14 "-" "curl/7.68.0" "abc-123" "users-service:8080" "10.244.1.5:8080" outbound|8080||users-service.default.svc.cluster.local 10.244.0.3:45678 10.96.5.10:8080 10.244.0.3:33456 - default
```

Key things to look for:
- The response code (200, 503, 404, etc.)
- The response flags (after the status code)
- The upstream cluster name
- The upstream host IP

Response flags are especially useful:
- `NR`: No route configured
- `UH`: No healthy upstream hosts
- `UF`: Upstream connection failure
- `UC`: Upstream connection termination
- `DC`: Downstream connection termination

## Debug Specific Connection Issues

To trace a specific connection, you can increase the Envoy log level:

```bash
istioctl proxy-config log <pod-name> --level debug
```

This produces a lot of output, so set it back after debugging:

```bash
istioctl proxy-config log <pod-name> --level warning
```

You can also set the level for specific Envoy components:

```bash
istioctl proxy-config log <pod-name> --level connection:debug,router:debug
```

## Test Direct Connectivity

To test whether the issue is with Envoy or with the network itself, you can test connectivity from the istio-proxy container:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -v http://other-service:8080/health
```

Since this runs inside the proxy container (UID 1337), the traffic won't be redirected by iptables. It goes directly to the destination. If this works but your application's requests fail, the problem is in Envoy's configuration or policies.

## Common Issues and Solutions

**Ports not in the Kubernetes service definition**: If your application listens on a port that's not declared in the Kubernetes Service object, Envoy won't have a route for it. Make sure all ports your app uses are defined in the Service spec.

**Protocol detection failures**: Istio tries to auto-detect protocols. If it guesses wrong, connections may fail. Explicitly name your ports with the protocol prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
  - name: grpc-service
    port: 9090
    targetPort: 9090
  - name: tcp-database
    port: 3306
    targetPort: 3306
```

The naming convention (`http-`, `grpc-`, `tcp-`) tells Istio what protocol to expect.

**Application binding to localhost**: If your app binds to 127.0.0.1 instead of 0.0.0.0, Envoy can't forward traffic to it. The redirected connection doesn't originate from localhost, so the app rejects it.

**mTLS mismatches**: If one side expects mTLS and the other doesn't, connections fail silently or with a "connection reset" error. Check the PeerAuthentication policy:

```bash
kubectl get peerauthentication -A
```

And the DestinationRule:

```bash
kubectl get destinationrule -A -o yaml | grep -A5 tls
```

A systematic approach to debugging traffic interception saves hours of guesswork. Start with the iptables rules, work through the Envoy configuration, check the access logs, and you'll find the problem.
