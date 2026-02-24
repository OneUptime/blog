# How to Block Unauthorized Egress Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Security, Authorization Policy, Kubernetes

Description: Learn how to lock down outbound traffic in your Istio service mesh by blocking unauthorized egress and only allowing registered external services.

---

Controlling outbound traffic is just as important as controlling inbound traffic, but it often gets overlooked. A compromised container that can freely reach the internet is a data exfiltration risk. Even without malicious intent, uncontrolled egress means you have no idea which external services your workloads depend on.

Istio provides several mechanisms to block unauthorized outbound traffic. This guide covers how to combine outbound traffic policies, ServiceEntries, and AuthorizationPolicies to create a tight egress security posture.

## The Default: Everything is Allowed

Out of the box, Istio uses the `ALLOW_ANY` outbound traffic policy. This means every pod with a sidecar proxy can reach any external IP address or hostname. The sidecar will proxy the traffic, but it will not block anything.

You can check your current setting:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A2 outboundTrafficPolicy
```

If you see `mode: ALLOW_ANY` or nothing at all (it defaults to ALLOW_ANY), your mesh is not blocking any outbound traffic.

## Step 1: Switch to REGISTRY_ONLY

The most impactful change you can make is switching the outbound traffic policy to `REGISTRY_ONLY`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

Apply the change:

```bash
istioctl install -f restricted-egress.yaml
```

After this change, any traffic to an external host that is not registered as a ServiceEntry will be blocked. The sidecar proxy will return a 502 or drop the connection.

This is a big change in a production cluster, so plan accordingly. You need to inventory all your external dependencies and create ServiceEntries for them before flipping this switch.

## Step 2: Register Allowed External Services

For each external service your workloads need to access, create a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allowed-github-api
  namespace: default
spec:
  hosts:
  - api.github.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allowed-docker-registry
  namespace: default
spec:
  hosts:
  - registry-1.docker.io
  - auth.docker.io
  - production.cloudflare.docker.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

Each ServiceEntry acts as an allowlist entry. Only hosts listed in a ServiceEntry will be reachable from the mesh.

## Step 3: Discover Existing External Dependencies

Before blocking everything, you need to know what your workloads are currently accessing. If you have access logs enabled, you can mine them for external connections:

```bash
kubectl logs -n istio-system -l istio=ingressgateway -c istio-proxy --since=24h | \
  grep -o '"authority":"[^"]*"' | sort | uniq -c | sort -rn
```

You can also check each namespace by looking at sidecar proxy logs:

```bash
kubectl logs -n default deploy/my-app -c istio-proxy --since=24h | \
  grep "upstream_host" | head -50
```

Another approach is to switch to `REGISTRY_ONLY` in a staging environment first and watch for BlackHoleCluster entries in the metrics:

```promql
sum(rate(istio_requests_total{destination_service="BlackHoleCluster"}[5m])) by (source_workload, source_workload_namespace)
```

Any traffic hitting the BlackHoleCluster is being blocked. Use this to find missing ServiceEntries.

## Step 4: Add Authorization Policies for Fine-Grained Control

ServiceEntries control which external hosts are reachable from the mesh, but they apply globally. If you want to restrict which workloads can reach specific external services, use AuthorizationPolicies on the egress gateway.

First, route your egress traffic through an egress gateway (covered in previous guides). Then apply policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: egress-deny-all
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: DENY
  rules:
  - {}
```

Wait, that would block everything. Instead, use a combination of a default deny and specific allow rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: egress-default-deny
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: ALLOW
  rules: []
```

An empty `rules` list with `ALLOW` action means nothing is explicitly allowed, so everything is denied. Now add specific allow rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-backend-to-github
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["backend"]
        principals: ["cluster.local/ns/backend/sa/ci-runner"]
    to:
    - operation:
        ports: ["443"]
```

This only allows the `ci-runner` service account in the `backend` namespace to reach the egress gateway.

## Step 5: Block Specific Destinations

Sometimes you want to allow most external traffic but block specific known-bad destinations. You can do this with a DENY AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-known-bad-destinations
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: DENY
  rules:
  - from:
    - source:
        namespaces: ["*"]
    to:
    - operation:
        hosts: ["evil-exfiltration-site.com"]
```

## Using Sidecar Resources to Restrict Egress at the Namespace Level

Another approach is to use the Sidecar resource to limit the egress scope for workloads in a namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: restricted-egress
  namespace: frontend
spec:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
  egress:
  - hosts:
    - "istio-system/*"
    - "./backend-api.default.svc.cluster.local"
```

This restricts workloads in the `frontend` namespace to only reach services in `istio-system` (which includes the egress gateway) and the `backend-api` service. They cannot directly access any other service in the mesh or any external service.

## Monitoring Blocked Traffic

Once you have blocking in place, monitor what is being denied. Check the sidecar proxy logs for blocked connections:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "BlackHoleCluster"
```

Set up an alert for blocked connections:

```yaml
- alert: EgressTrafficBlocked
  expr: |
    sum(rate(istio_requests_total{
      destination_service="BlackHoleCluster"
    }[5m])) by (source_workload, source_workload_namespace) > 0
  for: 1m
  labels:
    severity: info
  annotations:
    summary: "Outbound traffic blocked for {{ $labels.source_workload }}"
```

## Rollout Strategy

Blocking egress in a running production cluster can break things if you are not careful. Here is a safe approach:

1. **Audit phase**: Enable access logging and run with `ALLOW_ANY` for a week. Collect all external hosts being accessed.
2. **Register phase**: Create ServiceEntries for all discovered external hosts.
3. **Test phase**: Switch to `REGISTRY_ONLY` in a staging environment. Watch for failures.
4. **Rollout phase**: Switch to `REGISTRY_ONLY` in production during a low-traffic window.
5. **Harden phase**: Add AuthorizationPolicies for fine-grained control.

## Common Pitfalls

**Forgetting about DNS**: Even with `REGISTRY_ONLY`, pods need DNS resolution to work. If your pods use an external DNS server, you might need a ServiceEntry for it.

**Init containers**: Init containers run before the sidecar proxy is ready. If they make external calls, those calls might fail. Use `holdApplicationUntilProxyStarts` in the mesh config to mitigate this.

**Helm chart dependencies**: Helm hooks and jobs often pull images or check external endpoints. Make sure these are covered by ServiceEntries.

Blocking unauthorized egress traffic is one of the most effective security measures you can apply to a Kubernetes cluster running Istio. It takes planning, but the security benefits are substantial.
