# How to Debug DNS Resolution Failures in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Debugging, CoreDNS, Service Mesh

Description: Diagnose and fix DNS resolution failures in Istio service mesh, covering DNS proxy behavior, CoreDNS issues, and ServiceEntry resolution problems.

---

DNS resolution failures in Istio show up in all sorts of ways. Your app gets "connection refused" errors, curl returns "Could not resolve host," or the Envoy proxy logs show upstream connection failures. The tricky part is that Istio adds its own DNS proxy layer on top of the standard Kubernetes DNS, and failures can happen at either level.

Here is how to systematically debug DNS issues when Istio is involved.

## How DNS Works in Istio

In a standard Kubernetes setup, pods use CoreDNS (or kube-dns) for name resolution. The flow is simple: app makes a DNS query, it goes to CoreDNS through the cluster DNS service, and CoreDNS responds.

With Istio (1.8+), there is an additional layer called the Istio DNS proxy. When enabled, the sidecar intercepts DNS queries from the application and can resolve them locally for known services, or forward them to the upstream DNS server for external names.

The DNS proxy is controlled by the `ISTIO_META_DNS_CAPTURE` and `ISTIO_META_DNS_AUTO_ALLOCATE` environment variables on the istio-proxy container. Check if they are enabled:

```bash
kubectl get pod my-app-xxxxx -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].env}' | python3 -m json.tool
```

Or check the mesh config:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 5 dnsCapture
```

## Step 1: Test DNS from Different Containers

Test DNS resolution from the application container:

```bash
kubectl exec my-app-xxxxx -c my-app -- nslookup my-service.default.svc.cluster.local
```

Test from the istio-proxy container:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- nslookup my-service.default.svc.cluster.local
```

If DNS works from istio-proxy but not from the app container, the issue is in the DNS interception or proxy layer. If it fails from both, the issue is likely with CoreDNS or the service itself.

## Step 2: Check the Pod DNS Configuration

Look at what DNS servers the pod is configured to use:

```bash
kubectl exec my-app-xxxxx -c my-app -- cat /etc/resolv.conf
```

Typical output:

```text
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

The nameserver should point to the kube-dns service:

```bash
kubectl get svc -n kube-system kube-dns
```

If the resolv.conf is wrong or the nameserver is unreachable, that is your problem.

## Step 3: Check CoreDNS Health

CoreDNS handles DNS for the entire cluster. If it is down, nothing works:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

Check CoreDNS logs:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

Look for error messages like `SERVFAIL`, `REFUSED`, or timeout errors. Common issues:

- CoreDNS pods are crashing (OOM, config errors)
- Upstream DNS servers are unreachable
- CoreDNS Corefile has syntax errors

Check the Corefile:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

## Step 4: Debug Istio DNS Proxy Issues

When Istio's DNS proxy is enabled, it intercepts DNS queries before they reach CoreDNS. This can cause issues in a few scenarios:

### ServiceEntry DNS resolution

If you have a ServiceEntry with `resolution: DNS`, the Istio DNS proxy resolves the hostname. If the DNS proxy can not resolve it, the request fails.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.external.com
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

Check if the Envoy proxy has endpoints for this host:

```bash
istioctl proxy-config endpoints my-app-xxxxx.default --cluster "outbound|443||api.external.com"
```

If endpoints are empty, the DNS resolution in the proxy is failing.

### DNS auto-allocation conflicts

When `ISTIO_META_DNS_AUTO_ALLOCATE` is enabled, Istio assigns virtual IPs to ServiceEntry hosts. This can conflict with actual IPs if there is an overlap:

```bash
istioctl proxy-config clusters my-app-xxxxx.default | grep api.external.com
```

Look at the assigned IP. If it conflicts with anything in your cluster, you have a problem.

## Step 5: Check for ndots Issues

The `ndots:5` option in resolv.conf means that any name with fewer than 5 dots gets the search domains appended before trying the absolute name. So when your app tries to resolve `api.external.com`, Kubernetes DNS first tries:

1. `api.external.com.default.svc.cluster.local`
2. `api.external.com.svc.cluster.local`
3. `api.external.com.cluster.local`
4. `api.external.com`

This causes extra DNS queries and can lead to timeouts if the DNS server is slow. It can also cause problems if one of the intermediate lookups resolves to something unexpected.

You can reduce ndots at the pod level:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"
```

## Step 6: Check for Headless Service Issues

Headless services (ClusterIP: None) work differently with DNS. Instead of returning the service ClusterIP, DNS returns the pod IPs directly:

```bash
kubectl get svc my-headless-service -o jsonpath='{.spec.clusterIP}'
# Output: None
```

With Istio, headless service DNS resolution can be tricky because the sidecar needs to know about individual pod endpoints. Check if the endpoints are populated:

```bash
kubectl get endpoints my-headless-service
```

And check the proxy config:

```bash
istioctl proxy-config endpoints my-app-xxxxx.default | grep my-headless-service
```

## Step 7: Debug Multicluster DNS Issues

In multicluster Istio setups, DNS resolution for remote cluster services depends on DNS proxy or custom CoreDNS configuration. If remote services are not resolving:

Check if remote service endpoints are visible:

```bash
istioctl proxy-config endpoints my-app-xxxxx.default | grep remote-service
```

Check the multicluster secret:

```bash
kubectl get secrets -n istio-system -l istio/multiCluster=true
```

## Step 8: Test DNS with Specific Tools

Use dig for more detailed DNS information:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- dig +short my-service.default.svc.cluster.local
```

If dig is not available, use the busybox debug pod:

```bash
kubectl run dns-test --image=busybox:1.28 --restart=Never -- sleep 3600
kubectl exec dns-test -- nslookup my-service.default.svc.cluster.local
```

For external DNS:

```bash
kubectl exec dns-test -- nslookup api.external.com
```

## Step 9: Disable DNS Proxy Temporarily

If you suspect the Istio DNS proxy is the problem, you can disable it for a specific pod by adding an annotation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  annotations:
    proxy.istio.io/config: |
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "false"
```

Restart the pod and test DNS again. If it works with the DNS proxy disabled, the issue is in Istio's DNS handling.

## Common DNS Error Patterns

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `NXDOMAIN` | Service does not exist or wrong search domain | Check service name and namespace |
| `SERVFAIL` | CoreDNS upstream failure | Check CoreDNS logs and upstream DNS |
| Timeout | DNS server unreachable | Check CoreDNS pods and network policies |
| Wrong IP returned | DNS proxy auto-allocation conflict | Check allocated IPs |
| Works in one pod, fails in another | Sidecar resource limiting DNS | Check Sidecar egress hosts |

## Debugging Checklist

1. Test DNS from both the app container and istio-proxy
2. Verify resolv.conf is correct
3. Check CoreDNS pods are healthy
4. Check Istio DNS proxy settings
5. Look at Envoy endpoints for the target host
6. Test with ndots reduced
7. Try disabling the DNS proxy temporarily
8. Check for headless service or multicluster issues

DNS failures in Istio are usually caused by either CoreDNS being unhealthy, the Istio DNS proxy misconfigured, or ServiceEntry resolution settings being wrong. Start from the bottom of the stack (CoreDNS) and work your way up to Istio-specific configuration, and you will narrow down the cause quickly.
