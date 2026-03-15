# How to Update the Calico WorkloadEndpoint Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, WorkloadEndpoint, Kubernetes, Networking, Safe Updates, DevOps

Description: Safely update Calico WorkloadEndpoint resources with proper backup, validation, and minimal disruption to network connectivity.

---

## Introduction

Updating a WorkloadEndpoint resource in Calico modifies the network identity of a running workload. This includes changes to IP addresses, labels, profiles, and interface configurations. Unlike staged policy resources, WorkloadEndpoint changes take effect immediately, making safe update practices critical to avoid network disruption.

In Kubernetes environments, Calico manages WorkloadEndpoint resources automatically for pods. Manual updates are typically needed for non-Kubernetes workloads, custom orchestrator integrations, or when correcting misconfigured endpoints. Each update must preserve the endpoint's core identity fields while modifying only the intended attributes.

This guide covers safe update procedures for WorkloadEndpoint resources, including backup workflows, label updates, IP address changes, and profile modifications.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI configured with write access
- Existing WorkloadEndpoint resources to update
- Understanding of Calico's endpoint identity fields
- Network connectivity to verify changes

## Backing Up the Current Endpoint

Always export the current endpoint state before modifications:

```bash
calicoctl get workloadendpoint node2-custom-legacy-db-eth0 -n default -o yaml > endpoint-backup.yaml
```

Back up all endpoints in the default namespace:

```bash
calicoctl get workloadendpoints -n default -o yaml > endpoints-backup.yaml
```

## Updating Labels Safely

Labels control which network policies apply to an endpoint. Changing labels can immediately alter traffic enforcement. Review which policies currently match before updating:

```bash
calicoctl get networkpolicies -n default -o yaml | grep -A 2 "selector"
```

Update the endpoint labels:

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node2-custom-legacy-db-eth0
  namespace: default
  labels:
    app: legacy-database
    tier: data
    env: production
    compliance: pci
spec:
  node: node2
  orchestrator: custom
  workload: legacy-db
  endpoint: eth0
  interfaceName: cali5678efgh
  ipNetworks:
    - 10.240.0.50/32
  profiles:
    - legacy-workloads
```

```bash
calicoctl apply -f endpoint-updated-labels.yaml
```

## Updating IP Addresses

Changing an endpoint's IP address requires coordination with the network infrastructure. The old IP must be released and the new IP must be routable:

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node2-custom-legacy-db-eth0
  namespace: default
  labels:
    app: legacy-database
    tier: data
    env: production
spec:
  node: node2
  orchestrator: custom
  workload: legacy-db
  endpoint: eth0
  interfaceName: cali5678efgh
  ipNetworks:
    - 10.240.0.75/32
  profiles:
    - legacy-workloads
```

After applying the IP change, verify routing is updated:

```bash
calicoctl apply -f endpoint-new-ip.yaml
kubectl exec -it -n calico-system ds/calico-node -- ip route | grep 10.240.0.75
```

## Updating Profiles

Profiles control default policy rules applied to an endpoint. Update profiles when migrating workloads between security tiers:

```yaml
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: node2-custom-legacy-db-eth0
  namespace: default
  labels:
    app: legacy-database
    tier: data
    env: production
spec:
  node: node2
  orchestrator: custom
  workload: legacy-db
  endpoint: eth0
  interfaceName: cali5678efgh
  ipNetworks:
    - 10.240.0.50/32
  profiles:
    - pci-compliant-workloads
    - legacy-workloads
```

Verify the new profile exists before applying:

```bash
calicoctl get profile pci-compliant-workloads -o yaml
```

Apply the update:

```bash
calicoctl apply -f endpoint-new-profile.yaml
```

## Verification

Confirm the endpoint was updated successfully:

```bash
calicoctl get workloadendpoint node2-custom-legacy-db-eth0 -n default -o yaml
```

Test network connectivity to the endpoint after the update:

```bash
kubectl exec -it test-pod -- ping -c 3 10.240.0.50
```

Verify that network policies are correctly applied to the updated endpoint:

```bash
calicoctl get workloadendpoint node2-custom-legacy-db-eth0 -n default -o yaml | grep -A 5 "labels"
```

Check Felix logs for any programming errors related to the endpoint:

```bash
kubectl logs -n calico-system ds/calico-node -c calico-node --tail=20 | grep "legacy-db"
```

## Troubleshooting

If network connectivity breaks after a label change, check whether the new labels still match existing allow policies:

```bash
calicoctl get networkpolicies -n default -o yaml | grep selector
```

If routing is broken after an IP change, verify the new IP is within a configured Calico IP pool:

```bash
calicoctl get ippools -o wide
```

If the update is rejected with an immutable field error, note that the node, orchestrator, and workload fields cannot be changed. You must delete and recreate the endpoint instead:

```bash
calicoctl delete workloadendpoint node2-custom-legacy-db-eth0 -n default
calicoctl apply -f endpoint-recreated.yaml
```

To roll back any changes, apply the backup:

```bash
calicoctl apply -f endpoint-backup.yaml
```

## Conclusion

Updating WorkloadEndpoint resources safely requires understanding which fields trigger immediate network changes. Label updates alter policy matching, IP changes affect routing, and profile changes modify default security rules. Always back up the current state, verify prerequisites like IP pool availability and profile existence, and test connectivity immediately after applying changes. For identity field changes, plan for endpoint recreation rather than in-place updates.
