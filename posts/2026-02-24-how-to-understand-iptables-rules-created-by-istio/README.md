# How to Understand iptables Rules Created by Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, iptables, Networking, Envoy, Kubernetes, Service Mesh

Description: A practical guide to understanding the iptables rules that Istio creates to intercept and redirect traffic through the Envoy sidecar proxy.

---

When you deploy Istio in your Kubernetes cluster, something interesting happens behind the scenes. Every pod that gets an Envoy sidecar injected also gets a set of iptables rules configured by an init container called `istio-init`. These rules are the foundation of how Istio transparently intercepts all traffic without requiring any changes to your application code.

Understanding these iptables rules is critical when you're debugging connectivity issues, figuring out why traffic isn't flowing as expected, or just trying to understand the full picture of what Istio does at the network level.

## The istio-init Container

Before your application container starts, the `istio-init` container runs a program called `istio-iptables` (previously `pilot-agent istio-iptables`). This program sets up the iptables rules inside the pod's network namespace. You can see this container in any Istio-injected pod:

```bash
kubectl get pod my-app-pod -o jsonpath='{.spec.initContainers[*].name}'
```

You should see `istio-init` in the output. To see what arguments it runs with:

```bash
kubectl get pod my-app-pod -o jsonpath='{.spec.initContainers[?(@.name=="istio-init")].args}'
```

## Viewing the iptables Rules

The most direct way to see what iptables rules Istio created is to exec into a pod and inspect them. You'll need the `NET_ADMIN` capability or you can use `nsenter` from the node. Here's the simplest approach using a debug container:

```bash
kubectl debug -it my-app-pod --image=nicolaka/netshoot --target=istio-proxy -- iptables -t nat -L -v -n
```

If your cluster supports ephemeral containers, this gives you a clean view. Alternatively, if you have node access:

```bash
# Find the PID of your container
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' <container-id>)

# Enter the network namespace and list rules
nsenter -t $CONTAINER_PID -n iptables -t nat -L -v -n
```

## Breaking Down the NAT Table Rules

Istio primarily uses the `nat` table in iptables. The rules are organized into custom chains. Here's what a typical output looks like:

```text
Chain PREROUTING (policy ACCEPT)
target     prot opt source               destination
ISTIO_INBOUND  tcp  --  0.0.0.0/0        0.0.0.0/0

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination
ISTIO_OUTPUT  tcp  --  0.0.0.0/0        0.0.0.0/0

Chain ISTIO_INBOUND (1 references)
target     prot opt source               destination
RETURN     tcp  --  0.0.0.0/0        0.0.0.0/0   tcp dpt:15008
RETURN     tcp  --  0.0.0.0/0        0.0.0.0/0   tcp dpt:15090
RETURN     tcp  --  0.0.0.0/0        0.0.0.0/0   tcp dpt:15021
RETURN     tcp  --  0.0.0.0/0        0.0.0.0/0   tcp dpt:15020
ISTIO_IN_REDIRECT  tcp  --  0.0.0.0/0  0.0.0.0/0

Chain ISTIO_IN_REDIRECT (3 references)
target     prot opt source               destination
REDIRECT   tcp  --  0.0.0.0/0        0.0.0.0/0   redir ports 15006

Chain ISTIO_OUTPUT (1 references)
target     prot opt source               destination
RETURN     all  --  127.0.0.6        0.0.0.0/0
ISTIO_IN_REDIRECT  all  --  0.0.0.0/0  !127.0.0.1   owner UID match 1337
RETURN     all  --  0.0.0.0/0        0.0.0.0/0   ! owner UID match 1337
RETURN     all  --  0.0.0.0/0        127.0.0.1
ISTIO_REDIRECT  all  --  0.0.0.0/0    0.0.0.0/0

Chain ISTIO_REDIRECT (1 references)
target     prot opt source               destination
REDIRECT   tcp  --  0.0.0.0/0        0.0.0.0/0   redir ports 15001
```

That's a lot to take in, so let's walk through each chain.

## The PREROUTING Chain

The PREROUTING chain catches all incoming TCP traffic and sends it to the `ISTIO_INBOUND` chain. This handles traffic coming from outside the pod - requests from other services, load balancers, or external clients.

## The ISTIO_INBOUND Chain

This chain has several RETURN rules for specific ports. These ports are Envoy's own ports that should not be intercepted:

- **15008** - HBONE mTLS tunnel port
- **15090** - Envoy Prometheus telemetry port
- **15021** - Health check port
- **15020** - Merged Prometheus telemetry port

Any traffic not destined for these ports gets sent to `ISTIO_IN_REDIRECT`, which redirects it to port **15006** - the Envoy inbound listener.

## The OUTPUT Chain

The OUTPUT chain handles all traffic originating from within the pod. This includes requests your application makes to other services. All outbound TCP traffic gets sent to the `ISTIO_OUTPUT` chain.

## The ISTIO_OUTPUT Chain

This is where it gets interesting. The rules here are evaluated in order:

1. **Traffic from 127.0.0.6** - This is Envoy's internal address for inbound traffic forwarding. It gets a RETURN (no redirection) to avoid infinite loops.

2. **Traffic from UID 1337 to non-localhost** - UID 1337 is the Envoy proxy user. When Envoy sends traffic to non-localhost destinations, it gets redirected to `ISTIO_IN_REDIRECT` (port 15006). This handles the case where Envoy needs to send traffic back to the inbound path.

3. **Traffic NOT from UID 1337** - Any traffic not from Envoy gets a RETURN. Wait, that seems wrong, right? Actually, this rule works because of ordering. Traffic from your app (not UID 1337) that doesn't match rule 2 falls through to the catch-all redirect.

4. **Traffic to 127.0.0.1** - Localhost traffic gets a RETURN, meaning it's not intercepted. Your app can talk to localhost freely.

5. **Everything else** - Goes to `ISTIO_REDIRECT`, which sends it to port **15001** - the Envoy outbound listener.

## The Two Key Ports

Two Envoy listener ports are central to the whole setup:

- **Port 15001** - The outbound listener (virtualOutbound). Handles traffic your app sends to other services.
- **Port 15006** - The inbound listener (virtualInbound). Handles traffic coming into your pod from other services.

## UID 1337 - The Envoy Identity

The user ID 1337 is crucial. Istio runs the Envoy proxy as this UID so that iptables rules can distinguish between traffic from Envoy and traffic from your application. Without this distinction, you'd get infinite redirect loops where Envoy's outbound traffic keeps getting redirected back to Envoy.

You can verify this:

```bash
kubectl exec my-app-pod -c istio-proxy -- id
```

## Excluding Ports and IPs from Interception

Sometimes you need certain traffic to bypass the Envoy proxy. Istio provides annotations for this:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "8081,8082"
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432"
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8"
```

When you set these annotations, the `istio-init` container adds extra RETURN rules to the iptables chains so that matching traffic skips the redirect.

After applying exclusions, you'll see additional rules like:

```text
Chain ISTIO_INBOUND (1 references)
target     prot opt source               destination
RETURN     tcp  --  0.0.0.0/0        0.0.0.0/0   tcp dpt:8081
RETURN     tcp  --  0.0.0.0/0        0.0.0.0/0   tcp dpt:8082
...
```

## Debugging Tips

When things go wrong, here are some practical debugging steps:

```bash
# Check if iptables rules exist in the pod
kubectl exec my-app-pod -c istio-proxy -- iptables -t nat -S

# Check if the init container ran successfully
kubectl describe pod my-app-pod | grep -A5 "istio-init"

# Verify Envoy is listening on the expected ports
kubectl exec my-app-pod -c istio-proxy -- ss -tlnp

# Check for any REDIRECT rules
kubectl exec my-app-pod -c istio-proxy -- iptables -t nat -L ISTIO_REDIRECT -v -n
```

If you see no iptables rules at all, the init container may have failed. Check its logs:

```bash
kubectl logs my-app-pod -c istio-init
```

## The Bigger Picture

The iptables approach is Istio's default traffic interception method, but it's not the only one. Istio also supports using eBPF or the Kubernetes CNI plugin for traffic redirection. The CNI approach (`istio-cni`) removes the need for the init container and the `NET_ADMIN` capability, which is better from a security perspective.

Regardless of the interception method, the fundamental concept remains the same: redirect all inbound traffic to Envoy's port 15006 and all outbound traffic to Envoy's port 15001, while carefully avoiding redirect loops for Envoy's own traffic.

Knowing these rules inside and out makes debugging Istio networking issues much more straightforward. When someone says "my service can't connect to the database through Istio," you now know exactly where to look.
