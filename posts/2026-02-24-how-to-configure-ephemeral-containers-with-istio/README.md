# How to Configure Ephemeral Containers with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ephemeral Container, Debugging, Kubernetes, Sidecar

Description: How to use Kubernetes ephemeral containers for debugging Istio-enabled pods including network troubleshooting and proxy diagnostics.

---

Ephemeral containers are a Kubernetes feature (GA since 1.25) that lets you add a temporary container to a running pod for debugging. This is incredibly useful for Istio-enabled pods where you need to troubleshoot networking issues, inspect iptables rules, or test connectivity without modifying the deployment. Here's how to use ephemeral containers effectively with Istio.

## What Are Ephemeral Containers?

Ephemeral containers are a special type of container that you can add to a running pod through the `kubectl debug` command. They differ from regular containers in several ways:

- They're added under `spec.ephemeralContainers`, not `spec.containers`, and aren't restarted if they exit
- They can't have ports, readiness probes, or resource requests or limits
- They share the pod's network namespace; they don't automatically get the target container's filesystem or volume mounts
- They're designed purely for debugging

## Basic Usage with Istio Pods

To add a debug container to an Istio-enabled pod:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot --target=my-app -- /bin/bash
```

The `--target=my-app` flag asks the runtime to run the ephemeral container in the process namespace of your application container, so you can see your app's processes when the container runtime supports it.

This gives you a shell with networking tools (curl, nslookup, tcpdump, etc.) inside the pod's network namespace, which is the same namespace the Istio sidecar uses.

## Debugging Network Traffic

One of the best uses of ephemeral containers with Istio is inspecting network traffic. Since the ephemeral container shares the pod's network namespace, you can use tcpdump to see traffic between your application and the sidecar:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- tcpdump -i lo port 8080
```

This captures traffic on the loopback interface on port 8080, which is where the sidecar communicates with your application.

To see the iptables rules that Istio set up:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- iptables -t nat -L -n
```

Note: You generally need the `NET_ADMIN` capability to inspect iptables rules. If your cluster doesn't allow this for the debug container, try the sidecar container instead:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- iptables -t nat -L -n
```

## Targeting the Sidecar Container

You can also target the sidecar container directly:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot --target=istio-proxy -- /bin/bash
```

This is useful when you want to see the sidecar's processes. It does not give the debug container access to the sidecar's filesystem. To inspect files inside the sidecar container, use `kubectl exec`:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- ls /etc/istio/proxy/
kubectl exec -it deploy/my-app -c istio-proxy -- cat /etc/istio/proxy/envoy_bootstrap_tmpl.json
```

## Testing Connectivity from Inside the Mesh

A common debugging scenario is testing whether a specific service is reachable from within the mesh. The ephemeral container shares the pod's network and sidecar, so all traffic goes through Envoy:

```bash
kubectl debug -it deploy/my-app --image=curlimages/curl -- \
  curl -v http://other-service.default.svc.cluster.local:8080/health
```

This request goes through the Istio outbound path: iptables redirect, outbound listener, route matching, mTLS origination when configured, etc. If it works here but not from your application, the problem is likely in your application code or in differences between the debug container and application container.

To test without going through the sidecar (to rule out Istio issues), use an IP range or port that you have explicitly excluded from sidecar capture. For example, if `10.96.0.15` is in `traffic.sidecar.istio.io/excludeOutboundIPRanges`:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- \
  curl -v --resolve other-service:8080:10.96.0.15 http://other-service:8080/health
```

## DNS Debugging with Ephemeral Containers

Test DNS resolution from the pod's perspective:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- nslookup my-service.default.svc.cluster.local
```

Check the DNS configuration:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- cat /etc/resolv.conf
```

If DNS proxy is enabled, DNS requests are redirected to the sidecar or ztunnel even though `/etc/resolv.conf` may still point at the cluster DNS server. Test normal resolution from the pod:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- dig my-service.default.svc.cluster.local
```

## Inspecting mTLS Traffic

An ephemeral container sends application traffic into the local sidecar; it does not perform Istio mTLS itself. To inspect the certificates presented on an mTLS connection, run `openssl` from the `istio-proxy` container:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- \
  openssl s_client -connect other-service.default.svc.cluster.local:8080 -showcerts
```

You can also check the certificates the sidecar is using:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- \
  pilot-agent request GET /certs
```

## Ephemeral Container Traffic and Istio

An important question: does traffic from the ephemeral container go through the sidecar?

The answer is yes, because the ephemeral container shares the pod's network namespace, and the iptables rules redirect all outbound traffic (except from the proxy user) through Envoy. However, the ephemeral container's traffic might not have all the same metadata that your application's traffic has.

If you need to make requests that bypass the sidecar entirely:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- \
  curl --interface lo -v http://127.0.0.1:8080/health
```

Direct localhost connections bypass Envoy's capture rules.

## Copying the Debug Profile

If you frequently debug Istio pods, create a reusable custom debug profile for `kubectl debug`:

```yaml
stdin: true
tty: true
securityContext:
  capabilities:
    add:
    - NET_ADMIN
    - NET_RAW
```

You can apply the file with `--custom`:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot --profile=general --custom=debug-profile.yaml -- /bin/bash
```

You can also use the `--profile` flag with kubectl debug for predefined profiles:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot --profile=netadmin -- /bin/bash
```

The `netadmin` profile adds network administration capabilities.

## Debugging Sidecar Configuration

Use an ephemeral container to access the Envoy admin interface:

```bash
kubectl debug -it deploy/my-app --image=curlimages/curl -- \
  curl -s http://localhost:15000/config_dump | head -100
```

Other useful admin endpoints:

```bash
# Cluster information

curl -s http://localhost:15000/clusters

# Listener information
curl -s http://localhost:15000/listeners

# Server info
curl -s http://localhost:15000/server_info

# Statistics
curl -s http://localhost:15000/stats
```

## Performance Testing from Inside the Pod

You can use ephemeral containers for quick performance tests:

```bash
kubectl debug -it deploy/my-app --image=williamyeh/wrk -- \
  wrk -t2 -c10 -d30s http://backend-service.default.svc.cluster.local:8080/api
```

This runs a 30-second load test from inside the mesh, so traffic goes through the full Istio pipeline. Compare results with and without the sidecar to measure Istio's overhead.

## Cleaning Up

Ephemeral containers can't be removed from a pod once added (they persist in the pod spec until the pod is deleted). However, they stop running when their process exits. To see ephemeral containers on a pod:

```bash
kubectl get pod my-app-xyz -o jsonpath='{.spec.ephemeralContainers[*].name}'
```

If the pod has accumulated too many ephemeral containers, the simplest cleanup is to restart the pod:

```bash
kubectl delete pod my-app-xyz
```

The deployment will create a fresh pod without any ephemeral containers.

## Limitations

A few things to keep in mind:

1. Ephemeral containers can't be removed once added to a pod
2. They don't support resource limits, so be careful with memory-intensive tools
3. The `--target` flag for process namespace sharing depends on container runtime support
4. Some cluster security policies may restrict ephemeral container usage
5. The ephemeral container doesn't have the same service account tokens as your application by default

Ephemeral containers are one of the best tools for debugging Istio issues in production. They let you inspect the exact environment where your application runs, including the sidecar's iptables rules, network state, and proxy configuration, without modifying deployments or restarting pods.
