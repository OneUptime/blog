# How to Configure Ephemeral Containers with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ephemeral Containers, Debugging, Kubernetes, Sidecar

Description: How to use Kubernetes ephemeral containers for debugging Istio-enabled pods including network troubleshooting and proxy diagnostics.

---

Ephemeral containers are a Kubernetes feature (GA since 1.25) that lets you add a temporary container to a running pod for debugging. This is incredibly useful for Istio-enabled pods where you need to troubleshoot networking issues, inspect iptables rules, or test connectivity without modifying the deployment. Here's how to use ephemeral containers effectively with Istio.

## What Are Ephemeral Containers?

Ephemeral containers are a special type of container that you can add to a running pod through the `kubectl debug` command. They differ from regular containers in several ways:

- They're not part of the pod spec and aren't restarted if they exit
- They can't have ports, readiness probes, or resource limits
- They share the pod's network namespace and storage volumes
- They're designed purely for debugging

## Basic Usage with Istio Pods

To add a debug container to an Istio-enabled pod:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot --target=my-app -- /bin/bash
```

The `--target=my-app` flag makes the ephemeral container share the process namespace with your application container, so you can see your app's processes.

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

Note: You need the `NET_ADMIN` capability to view iptables rules. If your cluster doesn't allow this, you can still see the rules through the sidecar:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- iptables -t nat -L -n
```

## Targeting the Sidecar Container

You can also target the sidecar container directly:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot --target=istio-proxy -- /bin/bash
```

This is useful when you want to see the sidecar's processes or file system. From inside, you can inspect the Envoy configuration files:

```bash
ls /etc/istio/proxy/
cat /etc/istio/proxy/envoy_bootstrap_tmpl.json
```

## Testing Connectivity from Inside the Mesh

A common debugging scenario is testing whether a specific service is reachable from within the mesh. The ephemeral container shares the pod's network and sidecar, so all traffic goes through Envoy:

```bash
kubectl debug -it deploy/my-app --image=curlimages/curl -- \
  curl -v http://other-service.default.svc.cluster.local:8080/health
```

This request goes through the full Istio pipeline: iptables redirect, outbound listener, route matching, mTLS, etc. If it works here but not from your application, the problem is in your application code.

To test without going through the sidecar (to rule out Istio issues), use an IP that's excluded from capture:

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

If DNS proxy is enabled, you'll see the nameserver pointing to the sidecar. Test resolution through the sidecar directly:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- dig @localhost my-service.default.svc.cluster.local
```

## Inspecting mTLS Traffic

To verify that mTLS is working, you can use openssl from an ephemeral container:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot -- \
  openssl s_client -connect other-service.default.svc.cluster.local:8080 -showcerts
```

You can also check the certificates the sidecar is using:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot --target=istio-proxy -- \
  cat /var/run/secrets/istio/root-cert.pem
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

If you frequently debug Istio pods, create a reusable debug profile:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-template
spec:
  ephemeralContainers:
  - name: debug
    image: nicolaka/netshoot
    command: ["/bin/bash"]
    stdin: true
    tty: true
    securityContext:
      capabilities:
        add:
        - NET_ADMIN
        - NET_RAW
```

You can use the `--profile` flag with kubectl debug for predefined profiles:

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
3. The `--target` flag for process namespace sharing requires Kubernetes 1.25+
4. Some cluster security policies may restrict ephemeral container usage
5. The ephemeral container doesn't have the same service account tokens as your application by default

Ephemeral containers are one of the best tools for debugging Istio issues in production. They let you inspect the exact environment where your application runs, including the sidecar's iptables rules, network state, and proxy configuration, without modifying deployments or restarting pods.
