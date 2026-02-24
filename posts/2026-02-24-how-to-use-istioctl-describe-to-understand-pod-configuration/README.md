# How to Use istioctl describe to Understand Pod Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, istioctl, Kubernetes, Debugging, Service Mesh

Description: Learn how to use the istioctl describe command to quickly understand what Istio configuration applies to a specific pod in your mesh.

---

You've got a pod running in your Istio mesh, and traffic isn't behaving the way you expect. Maybe requests are timing out, or they're hitting the wrong version of a service. The first question is always: what Istio configuration actually applies to this pod?

That's exactly what `istioctl describe` answers. It gives you a human-readable summary of every Istio configuration affecting a specific pod, including VirtualServices, DestinationRules, mTLS settings, and more.

## Basic Usage

The syntax is straightforward:

```bash
istioctl describe pod <pod-name> -n <namespace>
```

For example:

```bash
istioctl describe pod reviews-v1-545db77b95-abc12 -n default
```

You get output like:

```
Pod: reviews-v1-545db77b95-abc12
   Pod Revision: default
   Pod Ports: 9080 (reviews), 15090 (istio-proxy)
--------------------
Service: reviews
   Port: http 9080/HTTP targets pod port 9080

Exposed on Ingress Gateway http://192.168.1.100
VirtualService: reviews-route
   Match: /reviews* to reviews.default
   Timeout: 5s
   Retries: attempts=3, perTryTimeout=2s

DestinationRule: reviews-dr
   Traffic Policy: connection pool, outlier detection
   Subset: v1 (labels: version=v1)
   Subset: v2 (labels: version=v2)
   Subset: v3 (labels: version=v3)

Effective PeerAuthentication:
   Workload mTLS mode: STRICT
```

This single command saves you from running five or six different kubectl and istioctl commands to piece together the same information.

## What the Output Tells You

The `describe` output is broken into several sections. Here's what each one means.

### Pod Information

The top section shows basic pod details, including which Istio revision the sidecar is running (important if you're doing canary upgrades), and what ports are exposed.

```
Pod: reviews-v1-545db77b95-abc12
   Pod Revision: default
   Pod Ports: 9080 (reviews), 15090 (istio-proxy)
```

If the pod revision doesn't match what you expect, the sidecar might be injected from a different Istiod version than intended.

### Service Mapping

This shows which Kubernetes Services select this pod and how their ports map:

```
Service: reviews
   Port: http 9080/HTTP targets pod port 9080
```

If your pod isn't listed under any Service, that's a red flag. Istio routing depends on Kubernetes Services. A pod without a matching Service won't get proper Istio configuration.

The protocol detection is also important here. Istio needs to know if a port carries HTTP, gRPC, TCP, or other traffic. If it shows as TCP when you expected HTTP, you need to name your port correctly in the Service definition (e.g., `http-reviews` or `grpc-reviews`).

### VirtualService Details

If any VirtualServices match this pod's service, they show up here with their routing rules:

```
VirtualService: reviews-route
   Match: /reviews* to reviews.default
   Timeout: 5s
   Retries: attempts=3, perTryTimeout=2s
```

This is where you verify that your routing configuration is actually applying. If you created a VirtualService but don't see it here, check that the `hosts` field matches the service name and that it's in the right namespace.

### DestinationRule Details

DestinationRules that target this pod's service are listed with their traffic policies and subsets:

```
DestinationRule: reviews-dr
   Traffic Policy: connection pool, outlier detection
   Subset: v1 (labels: version=v1)
   Subset: v2 (labels: version=v2)
```

If you're doing subset routing (sending traffic to specific versions), verify that the subset labels match the actual pod labels. A mismatch here means traffic goes to a subset with no endpoints, causing 503 errors.

### mTLS and Authentication

The effective PeerAuthentication policy shows up at the bottom:

```
Effective PeerAuthentication:
   Workload mTLS mode: STRICT
```

This tells you whether mTLS is enforced for this workload. If it says STRICT but you're trying to send plaintext traffic to this pod from outside the mesh, that explains why connections are failing.

## Using describe for Specific Services

You can also describe a service instead of a pod:

```bash
istioctl describe service reviews -n default
```

This shows all the Istio configuration affecting that service across all its pods.

## Practical Debugging Examples

### Scenario: Traffic Not Reaching the Right Version

You set up a VirtualService to send 80% of traffic to v1 and 20% to v2, but all traffic seems to go to v1.

```bash
istioctl describe pod reviews-v2-abc123 -n default
```

Check the VirtualService section. If the weight distribution isn't listed, or if the subsets don't match, you've found the problem. Also check the DestinationRule section to make sure the v2 subset exists and its label selector matches the v2 pod.

### Scenario: 503 Errors After Deploying a DestinationRule

You applied a DestinationRule with subsets, and now requests fail. The usual cause is that you have a DestinationRule with subsets but no VirtualService routing to those subsets. Envoy doesn't know which subset to pick.

```bash
istioctl describe pod productpage-v1-xyz789 -n default
```

If the output shows a DestinationRule with subsets but no VirtualService with corresponding weight or match rules, that's the issue. Either add a VirtualService or remove the subsets from the DestinationRule.

### Scenario: mTLS Failures Between Services

Service A can't talk to Service B. You suspect mTLS settings.

```bash
istioctl describe pod service-a-pod -n namespace-a
istioctl describe pod service-b-pod -n namespace-b
```

Compare the mTLS modes. If Service A is in PERMISSIVE mode and Service B is in STRICT mode, connections should work because PERMISSIVE accepts both plaintext and mTLS. But if Service B is STRICT and Service A is somehow not sending mTLS (maybe it's not in the mesh), you'll get connection failures.

### Scenario: Gateway Not Forwarding Traffic

You've set up an Istio Gateway and VirtualService, but external traffic isn't reaching your service.

```bash
istioctl describe pod my-app-pod -n default
```

Check whether the output shows "Exposed on Ingress Gateway". If it doesn't, the VirtualService might not be correctly bound to the Gateway, or the Gateway might not be selecting the right ingress pod.

## Combining describe with Other Commands

The `describe` command gives you the big picture. Once you know which configuration to investigate, use more specific commands:

```bash
# Found a suspicious VirtualService? Check its YAML
kubectl get virtualservice reviews-route -n default -o yaml

# Want to see how it translates to Envoy config?
istioctl proxy-config routes reviews-v1-545db77b95-abc12.default -o json

# Need to validate the whole namespace?
istioctl analyze -n default
```

The typical workflow is: describe to understand what's applied, then proxy-config to see how Envoy interpreted it, then analyze to check for misconfigurations.

## Limitations

The `describe` command doesn't show everything. It won't display:

- EnvoyFilter resources (these are low-level and bypass the normal config path)
- Telemetry configuration
- WasmPlugin settings
- AuthorizationPolicy details (though it does show PeerAuthentication)

For those, you'll need to check with kubectl directly or use `istioctl proxy-config` to see the resulting Envoy configuration.

## Summary

The `istioctl describe` command is the fastest way to understand what Istio is doing with a specific pod. It consolidates information from multiple sources into one readable output. Make it the first command you run when investigating traffic issues - it often points you straight to the problem without needing to dig through individual Envoy configs.
