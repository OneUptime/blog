# How to Learn from Common Istio Migration Mistakes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Migration, Kubernetes, Best Practices

Description: Learn from the most common mistakes teams make when migrating to Istio and how to avoid them in your own service mesh adoption journey.

---

Migrating to Istio is one of those projects that looks straightforward on paper but gets messy fast in practice. After watching dozens of teams go through this process, I have seen the same mistakes come up over and over again. The good news is that most of these are entirely avoidable if you know what to look out for.

## Mistake 1: Enabling Sidecar Injection Everywhere at Once

This is probably the single most common mistake. A team reads the Istio docs, gets excited, and labels every namespace for automatic injection in one shot.

```bash
# Don't do this all at once
kubectl label namespace default istio-injection=enabled
kubectl label namespace backend istio-injection=enabled
kubectl label namespace frontend istio-injection=enabled
kubectl label namespace data istio-injection=enabled
```

The problem is that some workloads simply don't play well with sidecars out of the box. Maybe they use host networking, maybe they have init containers that need network access before the sidecar is ready, or maybe they bind to specific ports that conflict with Envoy.

Instead, start with a single non-critical namespace and roll out gradually:

```bash
# Start small
kubectl label namespace staging istio-injection=enabled

# Verify everything works
kubectl get pods -n staging -o jsonpath='{.items[*].status.containerStatuses[*].ready}'

# Then move to the next namespace
kubectl label namespace backend istio-injection=enabled
```

## Mistake 2: Ignoring Resource Requirements

Envoy sidecars consume CPU and memory. This sounds obvious, but teams regularly forget to account for it in their capacity planning. Each sidecar typically uses around 50-100m CPU and 64-128Mi memory at baseline, and that adds up fast when you have hundreds of pods.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

Check your cluster capacity before migration:

```bash
# See current resource usage
kubectl top nodes
kubectl top pods --all-namespaces --sort-by=memory

# Calculate additional resources needed
# (number of pods) * (sidecar resource requests) = additional capacity needed
kubectl get pods --all-namespaces --no-headers | wc -l
```

## Mistake 3: Not Understanding mTLS Modes

The PERMISSIVE vs STRICT mTLS distinction trips people up constantly. When you first install Istio, mTLS is in PERMISSIVE mode by default, meaning services accept both plaintext and encrypted traffic. Teams often switch to STRICT mode prematurely before all services have sidecars.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE  # Keep this until all services have sidecars
```

Only switch to STRICT after confirming every service in the mesh has a sidecar:

```bash
# Check for pods without sidecars
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.containers | length == 1) | .metadata.namespace + "/" + .metadata.name'
```

## Mistake 4: Forgetting About Non-HTTP Protocols

Istio handles HTTP traffic beautifully, but teams forget that they also have TCP, gRPC, and database connections flowing through their cluster. If you don't name your Service ports correctly, Istio treats everything as opaque TCP and you lose all the Layer 7 features.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-web        # Prefix with protocol name
    port: 80
    targetPort: 8080
  - name: grpc-api        # gRPC needs the grpc- prefix
    port: 9090
    targetPort: 9090
  - name: tcp-database    # TCP connections need tcp- prefix
    port: 5432
    targetPort: 5432
```

The naming convention matters. Istio uses the port name prefix to determine protocol detection. Without it, you won't get proper metrics, tracing, or routing capabilities.

## Mistake 5: Skipping the Canary Control Plane Upgrade

When upgrading Istio versions, running two control planes side by side (canary upgrade) is the safe approach. But many teams just do an in-place upgrade and hope for the best.

```bash
# Install canary revision
istioctl install --set revision=canary --set tag=canary

# Migrate namespaces one at a time
kubectl label namespace backend istio.io/rev=canary --overwrite

# Restart pods to pick up new sidecar
kubectl rollout restart deployment -n backend

# Verify with the new revision
istioctl proxy-status | grep canary
```

## Mistake 6: Not Setting Up Monitoring Before Migration

You need visibility into what's happening during migration. Setting up monitoring after something breaks is too late. Install Prometheus, Grafana, and Kiali before you begin.

```bash
# Install observability addons
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/kiali.yaml

# Verify they're running
kubectl get pods -n istio-system
```

Key metrics to watch during migration:

```bash
# Check for 5xx errors
istioctl dashboard prometheus
# Query: istio_requests_total{response_code=~"5.*"}

# Check sidecar injection status
kubectl get namespace -L istio-injection

# Monitor pilot errors
kubectl logs -n istio-system -l app=istiod --tail=100
```

## Mistake 7: Ignoring DNS and Service Discovery Changes

Istio modifies how DNS resolution works for your services. If your applications use hardcoded IPs or external DNS resolvers, they might break after migration.

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.external-service.com
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

## Mistake 8: Not Testing with Real Traffic Patterns

Load testing with synthetic traffic is fine, but it doesn't catch the edge cases that real traffic patterns reveal. Use traffic mirroring to test with production traffic without affecting users:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 100
    mirror:
      host: my-service
      subset: v2-with-sidecar
    mirrorPercentage:
      value: 10.0
```

## Building a Migration Checklist

Based on all these mistakes, here is a practical checklist:

1. Audit all services for protocol usage and port naming
2. Calculate additional resource requirements for sidecars
3. Set up monitoring and alerting before starting
4. Start with PERMISSIVE mTLS mode
5. Migrate one namespace at a time, starting with non-critical services
6. Verify each namespace works correctly before moving to the next
7. Create ServiceEntry resources for all external dependencies
8. Test with traffic mirroring before cutting over
9. Use canary upgrades for the control plane
10. Document everything as you go

The teams that succeed with Istio migration are not the ones who avoid all mistakes. They are the ones who create an environment where mistakes are caught early and rolled back quickly. Take your time, validate at each step, and don't rush the process.
