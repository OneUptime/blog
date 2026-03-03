# How to Understand How Istio Intercepts Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Traffic Interception, Envoy, Kubernetes, Networking

Description: A practical guide to understanding how Istio intercepts and redirects traffic using iptables rules and the Envoy sidecar proxy in Kubernetes pods.

---

One of the things that makes Istio so powerful is that it works transparently. Your application code doesn't need to know about the service mesh at all. But that transparency can also make things confusing when something goes wrong. Understanding how Istio actually intercepts traffic at the network level is essential for debugging and for making informed architecture decisions.

## The Big Picture

When you deploy a pod with Istio sidecar injection enabled, two things happen before your application container starts receiving traffic:

1. An init container called `istio-init` runs and sets up iptables rules inside the pod's network namespace.
2. The `istio-proxy` sidecar container (running Envoy) starts alongside your application container.

The iptables rules redirect all inbound and outbound TCP traffic through the Envoy proxy. Your application thinks it's talking directly to the network, but every packet goes through Envoy first.

## How the Init Container Sets Up Rules

The `istio-init` container runs a small program called `istio-iptables` that configures the pod's network namespace. You can see the rules it creates by exec-ing into a pod:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L -v -n
```

This will show you something like:

```text
Chain PREROUTING (policy ACCEPT)
target     prot opt source               destination
ISTIO_INBOUND  tcp  --  0.0.0.0/0            0.0.0.0/0

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination
ISTIO_OUTPUT  tcp  --  0.0.0.0/0            0.0.0.0/0

Chain ISTIO_INBOUND (1 references)
target     prot opt source               destination
RETURN     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:15008
RETURN     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:15090
ISTIO_IN_REDIRECT  tcp  --  0.0.0.0/0            0.0.0.0/0

Chain ISTIO_IN_REDIRECT (1 references)
target     prot opt source               destination
REDIRECT   tcp  --  0.0.0.0/0            0.0.0.0/0            redir ports 15006

Chain ISTIO_OUTPUT (1 references)
target     prot opt source               destination
RETURN     all  --  127.0.0.6            0.0.0.0/0
ISTIO_IN_REDIRECT  all  --  0.0.0.0/0            !127.0.0.1/32         owner UID match 1337
RETURN     all  --  0.0.0.0/0            0.0.0.0/0            ! owner UID match 1337
RETURN     all  --  0.0.0.0/0            127.0.0.1/32
ISTIO_REDIRECT  all  --  0.0.0.0/0            0.0.0.0/0

Chain ISTIO_REDIRECT (1 references)
target     prot opt source               destination
REDIRECT   tcp  --  0.0.0.0/0            0.0.0.0/0            redir ports 15001
```

## Breaking Down the Chains

There are a few custom iptables chains that Istio creates. Here's what each one does:

**ISTIO_INBOUND**: This chain catches all incoming traffic to the pod. It skips certain ports that Envoy uses internally (like 15008 for HBONE tunneling and 15090 for Prometheus metrics) and redirects everything else to the `ISTIO_IN_REDIRECT` chain.

**ISTIO_IN_REDIRECT**: This chain does a simple REDIRECT to port 15006, which is the Envoy inbound listener. So all traffic destined for your application first hits Envoy on port 15006.

**ISTIO_OUTPUT**: This chain handles outbound traffic originating from within the pod. The rules here are a bit more nuanced. Traffic from UID 1337 (the Envoy proxy user) is handled specially to avoid infinite redirect loops. If Envoy itself sends traffic, it should go directly to the network, not back through Envoy.

**ISTIO_REDIRECT**: Outbound traffic that isn't from Envoy gets redirected to port 15001, which is the Envoy outbound listener.

## The Inbound Flow

When external traffic arrives at your pod, here is the path it takes:

1. Traffic hits the pod's network interface on the application port (say, port 8080).
2. The PREROUTING chain in the NAT table catches it and sends it to ISTIO_INBOUND.
3. ISTIO_INBOUND sends it to ISTIO_IN_REDIRECT.
4. ISTIO_IN_REDIRECT redirects it to port 15006 (Envoy inbound listener).
5. Envoy processes the request (applies policies, collects telemetry).
6. Envoy forwards the request to localhost:8080 (your actual application).

Your application sees the connection coming from 127.0.0.1. This is worth noting because if your app relies on the source IP of the client, you'll need to take extra steps (like using the PROXY protocol or TPROXY mode).

## The Outbound Flow

When your application makes an outbound request, the flow looks like this:

1. Your app sends a request to, say, `http://other-service:8080`.
2. The OUTPUT chain in the NAT table catches it and sends it to ISTIO_OUTPUT.
3. ISTIO_OUTPUT sees the traffic is NOT from UID 1337, so it sends it to ISTIO_REDIRECT.
4. ISTIO_REDIRECT redirects it to port 15001 (Envoy outbound listener).
5. Envoy resolves the destination using Istio's service registry, applies routing rules, mutual TLS, retries, and so on.
6. Envoy sends the request to the actual upstream pod.

## The UID 1337 Trick

The way Istio avoids infinite loops is clever. The Envoy process runs as user ID 1337. The iptables rules check the owner UID of outbound packets. If the packet comes from UID 1337, the rules skip the redirect and let the traffic go straight to the network. This is why you should never run your application as UID 1337 in an Istio mesh.

You can verify which user the proxy runs as:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- id
```

You should see `uid=1337(istio-proxy)`.

## Inspecting the Sidecar Configuration

You can look at the actual Envoy configuration that Istio pushes to the sidecar:

```bash
istioctl proxy-config listener <pod-name> --port 15006
```

This shows the inbound listener configuration. For the outbound side:

```bash
istioctl proxy-config listener <pod-name> --port 15001
```

To get the full Envoy configuration dump:

```bash
istioctl proxy-config all <pod-name> -o json
```

## What About UDP and Other Protocols?

The iptables rules only redirect TCP traffic. UDP, ICMP, and other protocols pass through without going through Envoy. This means DNS queries (which typically use UDP on port 53) are not intercepted by default, though Istio does have a DNS proxy feature that can be enabled separately through the `meshConfig.defaultConfig.proxyMetadata.ISTIO_META_DNS_CAPTURE` setting.

## Common Gotchas

There are a few things that trip people up regularly:

First, if your application binds to 127.0.0.1 instead of 0.0.0.0, Envoy won't be able to forward traffic to it because the redirected connection comes from a different origin. Always bind to 0.0.0.0 or the pod IP.

Second, if you use hostNetwork pods, the iptables rules would affect the entire node's network namespace. Istio sidecar injection is typically disabled for hostNetwork pods for this reason.

Third, health check probes from the kubelet get intercepted too. Istio rewrites the probe definitions to go through a special Envoy health check endpoint on port 15021 to handle this correctly.

## Verifying the Setup

A quick way to verify that traffic interception is working is to check the Envoy access logs:

```bash
kubectl logs <pod-name> -c istio-proxy
```

You should see log entries for both inbound and outbound requests. If you see no logs at all, the iptables rules might not be set up correctly, or the init container may have failed.

You can also check the init container logs:

```bash
kubectl logs <pod-name> -c istio-init
```

Understanding this interception mechanism gives you a solid foundation for debugging networking issues in Istio. When traffic doesn't flow as expected, knowing the iptables chains and the Envoy listener ports lets you pinpoint exactly where things break down.
