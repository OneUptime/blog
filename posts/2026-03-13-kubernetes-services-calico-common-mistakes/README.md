# How to Avoid Common Mistakes with Kubernetes Services with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Service, CNI, Troubleshooting, Best Practice, Kube-proxy

Description: Common service networking mistakes in Calico environments, from ClusterIP policy mismatches to kube-proxy conflicts with eBPF mode.

---

## Introduction

Service networking mistakes in Calico environments tend to be subtle - connectivity appears to work but policies are not enforced as intended, or source IPs are not what the application expects. The most dangerous mistakes are those where the service is reachable but the security policy is silently bypassed.

This post covers the most common service-related mistakes in Calico deployments, with diagnostic commands and concrete fixes for each.

## Prerequisites

- A Calico cluster with services deployed
- `kubectl` and optionally `calicoctl` access
- Understanding of how kube-proxy and Calico eBPF handle service routing

## Mistake 1: Writing Ingress Policy Matching ClusterIP as Source

The most common service-policy mistake is writing ingress policy that tries to match on a service ClusterIP as the traffic source. By the time a packet arrives at the backend pod, the source IP is the client pod's IP, not the ClusterIP.

**Symptom**: Ingress policy does not allow the intended service traffic, because the rule matching the ClusterIP never matches the backend pod's source address.

**Example of the mistake**:
```yaml
# This will never match - ClusterIP is not the source on the backend

ingress:
- from:
  - ipBlock:
      cidr: 10.96.0.0/16  # Service CIDR
```

**Fix**: Write policy using pod selectors:
```yaml
ingress:
- from:
  - podSelector:
      matchLabels:
        app: my-client
```

## Mistake 2: Running kube-proxy and Calico eBPF Simultaneously

Enabling Calico eBPF while kube-proxy is still running causes both components to manage service handling, which can waste resources and create conflicts with kube-proxy's iptables rules.

**Symptom**: Services are intermittently reachable; some requests succeed, others time out. Behavior can vary by which node receives the request.

**Diagnosis**:
```bash
# Check if kube-proxy is running
kubectl get pods -n kube-system -l k8s-app=kube-proxy
# AND check if eBPF is enabled
kubectl get felixconfiguration default -o jsonpath='{.spec.bpfEnabled}'
```

If both are true, you have a conflict.

**Fix**: Disable kube-proxy before enabling eBPF:
```bash
kubectl patch daemonset kube-proxy -n kube-system \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico":"true"}}}}}'
```

## Mistake 3: Not Accounting for SNAT in Ingress Policy for NodePort Services

With `externalTrafficPolicy: Cluster`, external traffic to a NodePort is SNAT'd to the node IP before reaching the backend pod. If you write ingress policy expecting to see the external client's IP, the policy will not match.

**Symptom**: Ingress policy based on external client IP does not work for NodePort services.

**Fix**: Either use `externalTrafficPolicy: Local` (traffic only goes to pods on the same node as the receiving node) or use Calico eBPF service handling, which preserves external source IPs. DSR can be enabled with Calico eBPF when you also want direct server return and your underlying network supports it.

## Mistake 4: Service EndpointSlice Not Updated After Pod Restart

When pods restart, Kubernetes EndpointSlice objects are updated by the EndpointSlice controller. However, in rare cases (network partitions, control plane issues), EndpointSlices can lag behind pod state, causing the service to route to pods that are no longer ready.

**Symptom**: Service requests fail intermittently.

**Diagnosis**:
```bash
kubectl get endpointslice -l kubernetes.io/service-name=my-service
# Compare pod IPs in EndpointSlices with actual running pod IPs
kubectl get pods -l app=my-app -o wide
```

**Fix**: Verify that the EndpointSlice controller is healthy. Temporary fix: delete and recreate the pods to force EndpointSlice controller reconciliation.

## Mistake 5: Service CIDR Overlapping with External Network

If the service ClusterIP range overlaps with external network CIDRs that pods need to reach, any external IP that is also allocated as a Service ClusterIP will be intercepted by kube-proxy/eBPF and routed to that service's backends instead.

**Symptom**: Traffic to an external IP that matches a Service ClusterIP silently goes to the service backend instead of the external server.

**Diagnosis**:
```bash
kubectl cluster-info dump | grep -i "service-cluster-ip"
```

Compare with your external network CIDR. Any overlap is a problem.

**Prevention**: Choose a service CIDR that does not overlap with any external CIDR your pods need to reach. This cannot be fixed after cluster creation without restarting the cluster.

## Best Practices

- Always write NetworkPolicy using pod label selectors, never ClusterIP ranges
- Disable kube-proxy before enabling Calico eBPF - never run both simultaneously
- Document your service CIDR alongside your pod CIDR and node CIDR at cluster creation time
- Monitor EndpointSlice lag with `kubectl get endpointslice` during high-churn deployments

## Conclusion

Service networking mistakes in Calico are often silent - incorrect policies that appear to work or source IPs that are not what the application expects. The most common issues are ClusterIP-based policy mismatches, kube-proxy and eBPF conflicts, SNAT surprises for NodePort services, stale EndpointSlices, and CIDR overlaps. Addressing each of these with the right policy selectors, dataplane consistency, and CIDR planning prevents the majority of service-related incidents.
