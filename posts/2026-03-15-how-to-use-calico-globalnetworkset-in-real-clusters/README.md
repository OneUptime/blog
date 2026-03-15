# How to Use the Calico GlobalNetworkSet Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GlobalNetworkSet, Kubernetes, Production, Network Security

Description: Apply Calico GlobalNetworkSet resources in production clusters for threat blocking, allowlisting, and egress control.

---

## Introduction

Calico GlobalNetworkSet resources become powerful when combined with GlobalNetworkPolicy in production environments. They serve as centralized IP registries that multiple policies can reference, enabling consistent access control across the cluster.

In real clusters, GlobalNetworkSets are used to maintain threat intelligence blocklists, define partner and vendor allowlists, segment internal infrastructure, and manage cloud service IP ranges. Their label-based referencing model means you can group sets logically and apply policies against those groups.

This guide demonstrates production patterns for GlobalNetworkSets including automated threat feed ingestion, tiered access control, and multi-tenant egress filtering.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- Existing GlobalNetworkPolicy resources

## Threat Intelligence Feed Integration

Create a GlobalNetworkSet from an external threat feed and reference it in a deny policy:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: threat-feed-daily
  labels:
    feed: threat-intel
    update-frequency: daily
spec:
  nets:
    - 10.200.0.0/16
    - 172.30.50.0/24
    - 192.168.200.0/24
```

Block all traffic to threat-listed IPs:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-threat-feed
spec:
  order: 5
  selector: all()
  types:
    - Egress
  egress:
    - action: Deny
      destination:
        selector: feed == 'threat-intel'
```

```bash
calicoctl apply -f threat-feed-daily.yaml
calicoctl apply -f block-threat-feed.yaml
```

## Tiered Egress Control with Multiple Sets

Define separate network sets for different trust levels:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: tier1-partners
  labels:
    trust-level: tier1
spec:
  nets:
    - 203.0.113.0/24
    - 198.51.100.0/24
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: tier2-vendors
  labels:
    trust-level: tier2
spec:
  nets:
    - 192.0.2.0/24
    - 198.18.0.0/24
```

Allow only specific workloads to reach tier2 vendors:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-tier2-egress
spec:
  order: 100
  selector: app == 'vendor-integration'
  types:
    - Egress
  egress:
    - action: Allow
      destination:
        selector: trust-level == 'tier2'
```

```bash
calicoctl apply -f tiered-sets.yaml
calicoctl apply -f allow-tier2-egress.yaml
```

## Automating Network Set Updates

Use a CronJob to pull threat feeds and update the GlobalNetworkSet:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: update-threat-feed
  namespace: calico-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl-sa
          containers:
            - name: updater
              image: calico/ctl:v3.27.0
              command:
                - /bin/sh
                - -c
                - |
                  calicoctl get globalnetworkset threat-feed-daily -o yaml > /tmp/current.yaml
                  # Replace nets with updated feed
                  calicoctl replace -f /tmp/updated-feed.yaml
          restartPolicy: OnFailure
```

```bash
kubectl apply -f update-threat-feed-cronjob.yaml
```

## Verification

List all GlobalNetworkSets and their labels:

```bash
calicoctl get globalnetworkset -o wide
```

Check which policies reference a specific label:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep "trust-level"
```

Test that blocked IPs are unreachable:

```bash
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=3 http://10.200.0.1/
```

Verify allowed traffic still flows:

```bash
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=3 http://203.0.113.10/
```

## Troubleshooting

If a network set update does not take effect, confirm the label selector matches:

```bash
calicoctl get globalnetworkset -o yaml | grep -A3 "labels:"
```

Check that the CronJob is running successfully:

```bash
kubectl get cronjob update-threat-feed -n calico-system
kubectl get jobs -n calico-system --sort-by=.metadata.creationTimestamp | tail -3
```

Verify Felix is syncing the updated sets:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=20 | grep -i "networkset"
```

## Conclusion

GlobalNetworkSets in production clusters serve as centralized IP registries that decouple address management from policy logic. Combining them with automated feed updates, tiered trust models, and label-based selectors creates a scalable and maintainable network security architecture. Always test connectivity after updates and maintain rollback copies of critical network sets.
