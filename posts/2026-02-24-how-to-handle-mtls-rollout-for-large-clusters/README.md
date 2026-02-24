# How to Handle mTLS Rollout for Large Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Large Clusters, Migration, Kubernetes

Description: A phased approach to rolling out strict mTLS across a large Kubernetes cluster with hundreds of services and multiple teams without causing outages.

---

Rolling out strict mTLS across a cluster with hundreds of services is not something you do in an afternoon. Large clusters have complex service dependencies, multiple teams owning different services, legacy applications, and varying levels of Istio adoption. A careless rollout can cascade into a cluster-wide outage.

This guide provides a phased approach to mTLS rollout that has worked in production for clusters with 500+ services across dozens of namespaces.

## Phase 0: Inventory and Assessment

Before touching any configuration, you need to understand what you are working with.

**Map your service dependencies**: Use Kiali or Istio metrics to build a dependency graph:

```promql
sum(rate(istio_requests_total[24h])) by (source_workload, source_workload_namespace, destination_workload, destination_workload_namespace)
```

Export this to a spreadsheet or visualization tool. You need to know which services talk to which other services.

**Identify non-mesh workloads**: Find pods without sidecars:

```bash
kubectl get pods -A -o json | \
  jq -r '.items[] | select(.spec.containers | length > 0) | select(.spec.containers | map(.name) | contains(["istio-proxy"]) | not) | "\(.metadata.namespace)/\(.metadata.name)"'
```

These are your risk points. If a service with a sidecar calls a service without one, the call currently works (the sidecar sends plaintext). But if you enforce strict mTLS on the receiving side while the caller does not have a sidecar, the call breaks.

**Check current mTLS status**: See what policies exist:

```bash
kubectl get peerauthentication -A
kubectl get destinationrules -A -o yaml | grep -A3 "tls:"
```

## Phase 1: Enable PERMISSIVE Mode Mesh-Wide

Start by setting the mesh-wide default to PERMISSIVE if it is not already:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

PERMISSIVE mode means every service accepts both mTLS and plaintext. This is a safe starting point. Services with sidecars will automatically use mTLS when talking to each other, and plaintext connections from non-mesh services will still work.

Verify that everything is healthy after applying this:

```bash
kubectl get pods -A | grep -v "Running\|Completed"
```

Monitor for any increase in errors:

```promql
sum(rate(istio_requests_total{response_code!~"2.."}[5m])) by (source_workload_namespace, destination_workload_namespace)
```

## Phase 2: Ensure Full Sidecar Coverage

Before you can go to strict mTLS, every service that receives mesh traffic needs a sidecar. Go namespace by namespace:

```bash
kubectl label namespace my-namespace istio-injection=enabled
kubectl rollout restart deployments -n my-namespace
```

After restarting, verify all pods have sidecars:

```bash
kubectl get pods -n my-namespace -o jsonpath='{range .items[*]}{.metadata.name}{" containers: "}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
```

Every pod should show `istio-proxy` in its container list.

Some workloads cannot run with sidecars (see the legacy applications guide). Document these exceptions and plan for how they will be handled.

## Phase 3: Strict mTLS by Namespace (Low-Risk First)

Start with namespaces that have full sidecar coverage and are low risk (internal tools, staging environments, non-critical services):

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: internal-tools
spec:
  mtls:
    mode: STRICT
```

Apply and monitor:

```bash
kubectl apply -f strict-internal-tools.yaml
```

Watch for errors in that namespace:

```promql
sum(rate(istio_requests_total{
  destination_workload_namespace="internal-tools",
  response_code!~"2.."
}[5m])) by (source_workload, response_code)
```

Also watch for connection failures:

```promql
sum(rate(istio_requests_total{
  destination_workload_namespace="internal-tools",
  response_code="503"
}[1m])) by (source_workload)
```

503 errors right after applying strict mTLS usually mean a caller does not have a sidecar or has a misconfigured DestinationRule.

## Phase 4: Strict mTLS for Critical Namespaces

Once you are confident with the low-risk namespaces, move to critical ones. For each namespace:

1. Verify sidecar coverage is 100%
2. Check that no external (non-mesh) services call into this namespace
3. Apply strict mTLS
4. Monitor for 24-48 hours before moving to the next namespace

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: payment-system
spec:
  mtls:
    mode: STRICT
```

For namespaces that receive traffic from non-mesh sources (like an ingress controller without a sidecar), you may need port-level exceptions:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-with-exception
  namespace: api-gateway
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
```

## Phase 5: Handle Cross-Namespace Dependencies

The trickiest part of large-cluster rollout is cross-namespace traffic. When namespace A calls namespace B:

- If both have strict mTLS and both have sidecars: works fine
- If A has strict but B is still permissive: works fine (A sends mTLS, B accepts both)
- If A is permissive and B switches to strict: works fine (A's sidecar automatically uses mTLS for mesh destinations)
- If A has no sidecar and B switches to strict: breaks

Map your cross-namespace dependencies carefully:

```promql
sum(rate(istio_requests_total{
  source_workload_namespace!="",
  destination_workload_namespace!=""
}[24h])) by (source_workload_namespace, destination_workload_namespace)
```

## Phase 6: Switch to Mesh-Wide STRICT

Once all namespaces have been individually switched to strict mTLS and verified, set the mesh-wide default:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

At this point, the mesh-wide default is strict, and any new namespace will automatically require mTLS.

Remove the per-namespace PeerAuthentication policies for namespaces that no longer need them (they are redundant now that the mesh-wide default is strict). Keep per-namespace policies only for namespaces that need exceptions.

## Rollback Plan

For every phase, have a rollback plan. If strict mTLS causes issues in a namespace, switch it back to permissive immediately:

```bash
kubectl patch peerauthentication strict-mtls -n payment-system --type merge -p '{"spec":{"mtls":{"mode":"PERMISSIVE"}}}'
```

This takes effect within seconds and restores the ability to accept plaintext connections.

## Automation for Large Rollouts

For clusters with many namespaces, automate the rollout with a script:

```bash
NAMESPACES="ns1 ns2 ns3 ns4 ns5"

for ns in $NAMESPACES; do
  echo "Applying strict mTLS to $ns"
  kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: $ns
spec:
  mtls:
    mode: STRICT
EOF

  echo "Waiting 60 seconds and checking for errors..."
  sleep 60

  ERROR_COUNT=$(kubectl logs -n istio-system deploy/istiod --since=60s 2>/dev/null | grep -c "error" || true)
  if [ "$ERROR_COUNT" -gt "10" ]; then
    echo "Too many errors in $ns, rolling back"
    kubectl patch peerauthentication strict-mtls -n $ns --type merge -p '{"spec":{"mtls":{"mode":"PERMISSIVE"}}}'
    break
  fi

  echo "$ns is healthy, moving to next namespace"
done
```

This applies strict mTLS to each namespace, waits a minute, checks for errors, and rolls back automatically if something looks wrong.

## Communication Plan

In a large organization, the mTLS rollout affects multiple teams. Communicate clearly:

- Announce the rollout schedule in advance
- Provide a Slack channel or similar for teams to report issues
- Document the rollback procedure so on-call engineers can respond quickly
- Share the monitoring dashboards so teams can check their own services

A successful mTLS rollout in a large cluster is as much about coordination and communication as it is about technical configuration.
