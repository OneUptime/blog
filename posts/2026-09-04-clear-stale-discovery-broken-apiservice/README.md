# 'Couldn't Get Current Server API Group List': Clear Stale Discovery and Find Broken APIService Registrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, API Discovery, API Server, TLS, Troubleshooting

Description: Separate a stale local kubectl discovery cache from a live aggregated API failure, then diagnose APIService routing, endpoints, latency, and trust safely.

---

The message `couldn't get current server API group list` means a client could not complete Kubernetes API discovery. It does not, by itself, mean the cluster is down. The cause can be local, such as a wrong context, expired credentials, a proxy, or cached discovery. It can also be server-side, especially an unavailable APIService such as `metrics.k8s.io` or another aggregated API.

Treat discovery as its own request path. First prove basic API access, then force a clean discovery request, and only then repair the specific aggregated API registration that fails.

## Separate Connectivity from Discovery

Record the active target without exposing credentials:

```bash
kubectl config current-context
kubectl config view --minify --raw=false
kubectl --request-timeout=10s get --raw='/version'
kubectl --request-timeout=10s get --raw='/readyz?verbose'
```

Interpret the result before changing anything:

- DNS, connect, or TLS errors on `/version` point to the workstation-to-kube-apiserver path.
- `401` means authentication failed; `403` means the identity lacks the requested permission.
- `/version` works but discovery fails, so investigate `/api`, `/apis`, and extension API servers.
- `/readyz` failing an etcd or post-start check is a control-plane incident, not a cache problem.

Use client verbosity only for a harmless read and sanitize tokens, certificate data, proxy URLs, and headers before sharing output:

```bash
kubectl --request-timeout=15s --v=8 api-resources
```

## Test Without the Existing Cache

`kubectl` has a configurable cache directory. Bypass the existing cache with a fresh temporary directory instead of deleting all Kubernetes configuration:

```bash
fresh_discovery_cache="$(mktemp -d)"
kubectl --cache-dir="$fresh_discovery_cache" \
  --request-timeout=15s api-resources
```

If this succeeds while the default invocation fails, preserve the old cache for inspection and replace only the cache directory. Do not replace `config`, client certificates, or other kubeconfig files:

```bash
mv "$HOME/.kube/cache" \
  "$HOME/.kube/cache.backup.$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$HOME/.kube/cache"
kubectl api-resources
```

Run those commands only for the affected OS account and after checking the paths. On shared automation hosts, prefer passing a dedicated `--cache-dir` per job. For programs using `client-go` cached discovery, call the cache client's `Invalidate` method after an API extension is installed or removed; do not assume an in-memory cache falls back to a live lookup on every miss.

If a fresh cache still fails, the cache is not the cause.

## Query Discovery Endpoints Directly

Current Kubernetes supports aggregated discovery at `/api` and `/apis`. `kubectl get --raw` does not provide a generic request-header flag, so use an authenticated loopback `kubectl proxy` and ask for the stable discovery representation with `curl`.

In one terminal:

```bash
kubectl proxy --port=8001
```

In another terminal:

```bash
curl --fail --silent --show-error \
  -H 'Accept: application/json;v=v2;g=apidiscovery.k8s.io;as=APIGroupDiscoveryList' \
  http://127.0.0.1:8001/apis \
  > /tmp/apis-discovery.json
```

The proxy uses the current kubeconfig and listens on loopback by default. Stop it when the diagnostic request is complete; do not expose an authenticated proxy on a shared or non-loopback interface.

Use a protected temporary location because discovery reveals installed APIs. Inspect stale or failed group versions:

```bash
jq -r '.items[] | .metadata.name as $group |
  .versions[] |
  select(.freshness != "Current") |
  [$group, .version, .freshness] | @tsv' \
  /tmp/apis-discovery.json
```

Also test the legacy hierarchy to isolate one group version:

```bash
kubectl get --raw='/api'
kubectl get --raw='/apis'
kubectl get --raw='/apis/metrics.k8s.io/v1beta1'
```

Replace the example group/version with the one named in the error. Extension API discovery is required to round-trip through kube-apiserver quickly; Kubernetes documents a five-second discovery latency requirement for aggregated API servers.

The Metrics API is only an example. Read the failing APIService's own `spec.group` and `spec.version` rather than assuming `metrics.k8s.io/v1beta1`; newer clusters and implementations can also serve the stable `metrics.k8s.io/v1` API while compatibility clients still use `v1beta1`.

## Find the Unavailable APIService

APIService objects claim paths beneath `/apis`. List and describe registrations before editing them:

```bash
kubectl get apiservices.apiregistration.k8s.io
kubectl get apiservices.apiregistration.k8s.io \
  -o custom-columns='NAME:.metadata.name,AVAILABLE:.status.conditions[?(@.type=="Available")].status,REASON:.status.conditions[?(@.type=="Available")].reason,MESSAGE:.status.conditions[?(@.type=="Available")].message'
kubectl describe apiservice v1beta1.metrics.k8s.io
```

An APIService with no `spec.service` is local and served by kube-apiserver. For an aggregated registration, inspect its route and trust data:

```bash
kubectl get apiservice v1beta1.metrics.k8s.io \
  -o jsonpath='{.spec.service.namespace}{"/"}{.spec.service.name}{":"}{.spec.service.port}{"\n"}'
kubectl get apiservice v1beta1.metrics.k8s.io \
  -o jsonpath='{.spec.insecureSkipTLSVerify}{"\n"}'
```

If `.spec.service.port` is omitted, the APIService route defaults to Service port 443. An empty value in the first command therefore does not mean that no port is configured.

Do not “repair” the registration by setting `insecureSkipTLSVerify: true`. That suppresses server identity verification and can hide a wrong CA, wrong endpoint, or interception.

## Trace Service, Endpoint, and Port

For the namespace, Service, and port named by the APIService, verify that the selector resolves to ready backends:

```bash
kubectl -n kube-system get service metrics-server -o yaml
kubectl -n kube-system get endpointslice \
  -l kubernetes.io/service-name=metrics-server -o wide
kubectl -n kube-system get pods -l k8s-app=metrics-server -o wide
kubectl -n kube-system logs deployment/metrics-server --tail=200
```

Adapt names and labels to the actual registration. Check that:

- the Service exists in the exact namespace and on the registered port;
- EndpointSlices contain ready addresses and the port the server listens on;
- the extension server is ready and serves its group-version discovery path;
- NetworkPolicy, host firewall, and routing allow the **kube-apiserver** to reach that backend; and
- the response completes within the discovery latency requirement.

A successful request from an ordinary Pod proves only that Pod's network path. In a kubeadm cluster, kube-apiserver usually uses host networking, so test from the control-plane network namespace or correlate API-server logs. If kube-proxy is not present on API-server hosts, review whether `--enable-aggregator-routing=true` is required by the deployment design.

## Verify TLS Without Leaking Keys

`spec.caBundle` must contain the PEM-encoded CA that signed the extension server's serving certificate. The kube-apiserver connects using the Service DNS identity, so the serving certificate must have an appropriate DNS Subject Alternative Name, normally `<service>.<namespace>.svc`.

Inspect the public CA bundle and the live server certificate through an authorized control-plane path:

```bash
kubectl get apiservice v1beta1.metrics.k8s.io \
  -o jsonpath='{.spec.caBundle}' |
  base64 --decode |
  openssl x509 -noout -subject -issuer -dates -fingerprint -sha256
```

Never print or copy the extension server's private key. Compare issuer, validity window, CA fingerprint, DNS SAN, and the port. Also confirm that the extension server trusts the aggregation proxy client CA and has the RBAC needed to read the `extension-apiserver-authentication` ConfigMap and submit SubjectAccessReviews.

The front-proxy CA is a separate trust role from the general Kubernetes client CA. Reusing CAs can create authentication conflicts and widens the impact of a key compromise.

## Repair the Owner, Not Just the Symptom

Determine who owns the APIService before patching it:

```bash
kubectl get apiservice v1beta1.metrics.k8s.io \
  -o jsonpath='{.metadata.labels}{"\n"}{.metadata.annotations}{"\n"}{.metadata.ownerReferences}{"\n"}'
```

If Helm, an Operator, or a platform controller manages it, fix the source configuration and reconcile. Direct edits will otherwise be reverted. If the backing product was intentionally removed, verify that no supported feature still depends on it, then remove the orphaned APIService through that product's uninstall procedure. Deleting an APIService immediately removes its claimed API path, so take an inventory and use the normal change process.

After repair, verify both registration and client behavior:

```bash
kubectl wait --for=condition=Available \
  apiservice/v1beta1.metrics.k8s.io --timeout=60s
kubectl --cache-dir="$(mktemp -d)" api-resources
kubectl get --raw='/apis/metrics.k8s.io/v1beta1'
```

Repeat from each kube-apiserver replica in an HA control plane. A load-balanced client can appear intermittent if only one API server lacks the correct route, CA file, or proxy configuration.

## Conclusion

Clear discovery errors systematically: prove the base API path, bypass the local cache, test discovery directly, and inspect every unavailable APIService. Most lasting fixes are an endpoint, latency, routing, or certificate correction in the extension server. Deleting all kubeconfig data or disabling TLS verification is not a fix.

## Official Documentation

- [Kubernetes API Discovery](https://kubernetes.io/docs/concepts/overview/kubernetes-api/#api-discovery)
- [Kubernetes API Aggregation Layer](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/)
- [Kubernetes: Configure the Aggregation Layer](https://kubernetes.io/docs/tasks/extend-kubernetes/configure-aggregation-layer/)
- [Kubernetes APIService v1 Reference](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/api-service-v1/)
- [Kubernetes Metrics API v1 Reference](https://kubernetes.io/docs/reference/external-api/metrics.v1/)
- [kubectl Global Options](https://kubernetes.io/docs/reference/kubectl/kubectl/)
- [client-go Cached Discovery Package](https://pkg.go.dev/k8s.io/client-go/discovery/cached/disk)
