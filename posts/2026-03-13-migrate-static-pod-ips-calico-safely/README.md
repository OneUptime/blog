# Migrate Static Pod IPs with Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Static-ip, Kubernetes, Migration, Networking, Pod-ip

Description: Learn how to safely migrate workloads that depend on static pod IP addresses to Calico's IP annotation model, maintaining IP stability without manual IPAM management.

---

## Introduction

Some Kubernetes workloads inherit requirements from legacy VM-based infrastructure where static IP addresses were standard practice. Databases, monitoring agents, and legacy integration middleware often have their IPs hardcoded in configuration files or firewall rules.

Calico's IP annotation system (`cni.projectcalico.org/ipAddrs`) provides a Kubernetes-native way to assign stable, specific IP addresses to pods without maintaining external IPAM systems. Migrating from ad-hoc static IP management to Calico's annotation model centralizes IP assignment control and makes it version-controllable in Git.

This guide covers identifying workloads with static IP requirements, migrating them to use Calico IP annotations, and managing the associated IP reservations.

## Prerequisites

- Kubernetes cluster with Calico v3.x
- `calicoctl` CLI configured
- List of workloads requiring static IPs and their assigned addresses
- Cluster admin permissions

## Step 1: Inventory Static IP Requirements

Document all pods and services that currently rely on static IP addresses.

```bash
# Find pods with existing Calico IP annotations
kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.metadata.annotations.cni\.projectcalico\.org/ipAddrs)]}{.metadata.namespace}/{.metadata.name}{": "}{.metadata.annotations.cni\.projectcalico\.org/ipAddrs}{"\n"}{end}'

# Find pods with nodeSelector that co-locate them with specific nodes for IP stability
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.nodeName != null) | "\(.metadata.namespace)/\(.metadata.name): node=\(.spec.nodeName), ip=\(.status.podIP)"'

# Check ConfigMaps and Secrets for hardcoded pod IPs
kubectl get configmaps --all-namespaces -o yaml | grep -E "10\.244\.|172\.16\."
```

## Step 2: Reserve Target Static IPs in Calico IPAM

Create IPReservation resources for all IPs that need to be statically assigned.

```yaml
# calico-ipam/static-ip-reservations.yaml - Reserve all static IP addresses
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: static-pod-ips
spec:
  reservedCIDRs:
    # Database pod - requires stable IP for connection string in application configs
    - "10.244.5.10/32"
    # Metrics exporter - firewall allows this IP to reach Prometheus
    - "10.244.5.20/32"
    # Legacy middleware - IP hardcoded in downstream partner system
    - "10.244.5.30/32"
```

```bash
# Apply the reservations before modifying pod definitions
calicoctl apply -f static-ip-reservations.yaml
calicoctl get ipreservation -o yaml
```

## Step 3: Update Workload Definitions with IP Annotations

Add Calico IP annotations to the pod templates of Deployments, StatefulSets, or static pod manifests.

```yaml
# workloads/database.yaml - Database Deployment with a stable IP annotation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-primary
  namespace: database
spec:
  # Single replica required for specific IP assignment
  replicas: 1
  selector:
    matchLabels:
      app: postgres-primary
  template:
    metadata:
      labels:
        app: postgres-primary
      annotations:
        # Assign the reserved static IP - applications reference this IP in connection strings
        cni.projectcalico.org/ipAddrs: '["10.244.5.10"]'
    spec:
      containers:
        - name: postgres
          image: postgres:15
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
```

## Step 4: Roll Out the Migration

Apply the updated workload definitions and verify that pods receive the correct static IPs.

```bash
# Apply the updated Deployment with the IP annotation
kubectl apply -f workloads/database.yaml

# Force pod recreation to apply the new IP annotation
kubectl rollout restart deployment/postgres-primary -n database

# Verify the pod received the correct static IP
kubectl get pod -n database -l app=postgres-primary -o wide
# The pod IP should be 10.244.5.10

# Confirm IPAM reflects the allocation
calicoctl ipam show --ip=10.244.5.10

# Test application connectivity to the stable IP
kubectl run db-test --image=postgres:15 --rm -it \
  -- psql -h 10.244.5.10 -U postgres -c "SELECT version();"
```

## Step 5: Update External References

After migrating to Calico-managed static IPs, update any configurations that referenced the old dynamic IPs.

```bash
# Update ConfigMaps that reference old pod IPs
kubectl edit configmap app-config -n production
# Change: DATABASE_HOST=10.244.3.15 (old dynamic IP)
# To:     DATABASE_HOST=10.244.5.10 (new Calico-assigned stable IP)

# Rolling restart applications that consumed the updated ConfigMap
kubectl rollout restart deployment/app -n production

# Update firewall rules to reference the new static IP
# (External firewall command depends on your firewall vendor)
```

## Best Practices

- Reserve IPs in Calico IPAM before annotating pods to prevent allocation conflicts
- Only use static IP assignment for workloads with genuine external IP dependencies
- Store IP reservations and deployment annotations in Git for version control and audit trails
- Test that the static IP persists across pod restarts before completing migration
- Document static IP assignments with explanatory comments describing why the IP is needed
- Use StatefulSets for stateful workloads requiring stable IPs rather than Deployments when possible

## Conclusion

Migrating workloads from ad-hoc static IP management to Calico's annotation-based IP assignment provides a structured, IPAM-integrated approach to stable pod addressing. By reserving IPs first, annotating pod templates, and validating persistence across restarts, you can maintain the IP stability that legacy applications require while keeping control of your address space in Calico's centralized IPAM.
