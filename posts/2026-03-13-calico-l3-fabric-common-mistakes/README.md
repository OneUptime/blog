# How to Avoid Common Mistakes with L3 Interconnect Fabric with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, L3, BGP, Networking, Troubleshooting, Best Practices, Routing

Description: Common BGP routing mistakes in Calico deployments - from session flapping to AS number conflicts - and how to diagnose and prevent them.

---

## Introduction

BGP routing mistakes in Calico tend to have larger blast radii than overlay mistakes - a misconfigured BGP setup can cause routing failures across an entire cluster or disrupt your organization's existing BGP infrastructure. Understanding the common mistakes and their early warning signs is essential for operating L3 BGP mode safely in production.

## Prerequisites

- A Calico cluster running in BGP mode
- `kubectl`, `calicoctl`, `birdcl` access
- Familiarity with BGP session states (Established, Active, Idle)

## Mistake 1: AS Number Conflict with Enterprise BGP

If you choose a BGP AS number (for your Calico cluster) that conflicts with an existing AS in your organization's BGP infrastructure, it can cause routing loops or unexpected route advertisements propagating to the broader network.

**Symptom**: Network team reports unexpected BGP route advertisements appearing in the enterprise routing table. Or: routes from the cluster's AS number conflict with existing routes.

**Prevention**: Before deploying BGP mode, coordinate with your network team to:
1. Confirm the available AS number range for the cluster
2. Use a private AS range (64512-65534 for 16-bit, 4200000000-4294967294 for 32-bit)
3. Document the allocation

## Mistake 2: Single Route Reflector - No High Availability

Deploying only one route reflector means it is a single point of failure for all routing in the cluster. When the route reflector node is drained, upgraded, or fails, all BGP sessions that peer with it are lost.

**Symptom**: Cross-node traffic fails after a specific node is drained for maintenance. `birdcl show protocols` shows all sessions in `Active` state (trying to re-establish).

**Fix**: Always deploy route reflectors in pairs with pod anti-affinity:

```yaml
# Route reflector pod anti-affinity (if deployed as pods)
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchLabels:
          calico-route-reflector: 'true'
      topologyKey: kubernetes.io/hostname
```

## Mistake 3: Forgetting to Disable Node-to-Node Mesh When Adding Route Reflectors

A common configuration mistake: adding route reflectors without disabling the default node-to-node mesh. This creates redundant BGP sessions and iBGP route reflection loops.

**Symptom**: Excessive BGP session count. Routes may be preferred via direct node-to-node sessions over route reflectors, causing inconsistent behavior.

**Fix**: Always disable node-to-node mesh when switching to route reflectors:

```bash
calicoctl patch bgpconfiguration default \
  -p '{"spec":{"nodeToNodeMeshEnabled":false}}'
```

Disable the mesh AFTER configuring route reflectors and confirming all nodes are peered with them.

## Mistake 4: BGP Session Flapping

BGP sessions that repeatedly establish and drop cause route instability - routes appear and disappear, causing intermittent connectivity failures.

**Symptom**: Cross-node connectivity is intermittent. `birdcl show protocols all` shows session uptime is short (seconds or minutes).

**Diagnosis**:
```bash
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- birdcl show protocols all | grep -A5 "BGP"
# Look for "session uptime" - should be days/hours, not seconds
```

**Common causes**:
- BGP hold timer mismatch between peers
- Network congestion causing keepalive packet loss
- Felix restarting and disrupting BIRD
- Insufficient resources causing BIRD to crash

**Fix**: Check Felix and BIRD logs for error patterns:
```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep -i "bird\|bgp\|reconnect" | tail -50
```

## Mistake 5: Advertising Pod Routes to External Network Without Firewall ACLs

Advertising pod CIDR routes externally (so external systems can reach pod IPs directly) without updating firewall ACLs creates a security gap - external systems that were previously unable to reach your pods can now do so directly.

**Symptom**: Security audit discovers that external systems can reach pod IPs that should be internal-only.

**Fix**: Before enabling external pod route advertisement, work with your security team to:
1. Define which external systems should be able to reach pod IPs
2. Implement firewall ACLs at the cluster boundary
3. Apply Calico HostEndpoint policies to control external-to-pod traffic

## Best Practices

- Coordinate AS number allocation with your network team before any BGP deployment
- Deploy route reflectors before disabling node-to-node mesh - never disable mesh without replacements ready
- Monitor BGP session uptime as a metric - alert if any session has been up for less than 10 minutes (indicates recent flapping)
- Never advertise pod routes externally without security review and ACL implementation

## Conclusion

BGP routing mistakes in Calico tend to have large blast radii because BGP affects routing across the entire cluster. AS number conflicts, single route reflectors, mesh/reflector configuration mistakes, session flapping, and unauthorized external route advertisement are the most common and most impactful mistakes. Preventing them requires coordination with your network team, deliberate HA planning for route reflectors, and careful testing of configuration changes before production rollout.
