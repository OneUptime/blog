# How to Isolate Workloads Between Projects in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Project, Security, Network Isolation, Multi-Tenancy

Description: Learn how to isolate workloads between Rancher projects using RBAC, network policies, resource quotas, and node affinity.

Workload isolation prevents one project's applications from interfering with another project's applications. In Rancher, isolation operates across multiple dimensions: access control, network communication, resource consumption, and node placement. This guide covers each isolation mechanism and how to implement them together.

## Prerequisites

- Rancher v2.7+ with cluster owner or administrator access
- Multiple projects with workloads
- A CNI plugin that supports NetworkPolicy (Calico, Canal, or Cilium)
- Understanding of your isolation requirements

## Isolation Dimensions

Effective workload isolation covers four areas:

1. **RBAC isolation**: Users in one project cannot see or modify workloads in another project.
2. **Network isolation**: Pods in one project cannot communicate with pods in another project.
3. **Resource isolation**: One project cannot consume resources allocated to another project.
4. **Compute isolation**: Workloads run on separate nodes (strongest isolation).

## Step 1: RBAC Isolation

RBAC isolation is built into Rancher's project model. By default, users assigned only project-scoped roles can access namespaces within that project.

Verify isolation is working:

```bash
# As a user in Project A

kubectl get pods -n project-b-namespace
# Error from server (Forbidden): pods is forbidden

# As a user in Project A
kubectl get pods -n project-a-namespace
# Lists pods successfully
```

Ensure no user has both project memberships unless intentional. Rancher `ProjectRoleTemplateBinding` objects live in the Rancher management cluster, so run the next command against that kubeconfig context:

```bash
# Find users with roles in multiple projects
kubectl get projectroletemplatebindings --all-namespaces -o json | \
  jq -r '[.items[] | {user: (.userName // .userPrincipalName // .groupName // .groupPrincipalName // .serviceAccount), project: .projectName}] |
  group_by(.user) | .[] | select(length > 1) |
  "\(.[0].user) is in projects: \([.[].project] | join(", "))"'
```

## Step 2: Network Isolation via Rancher

Enable project network isolation at the cluster level through the Rancher UI:

1. Click **☰ > Cluster Management**.
2. Go to the cluster you want to configure and click the three-dot menu.
3. Select **Edit Config**.
4. In the cluster configuration, enable **Project Network Isolation**.
5. Click **Save**.

When supported by the cluster's CNI, Rancher disables inter-project communication. The `system` project is excluded from this isolation by default.

## Step 3: Network Isolation via NetworkPolicy

For more granular control, create custom NetworkPolicy resources. Because `NetworkPolicy` is namespace-scoped, apply these policies in each namespace that belongs to the project:

**Default deny all ingress and egress in a project namespace:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: team-a-production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

**Allow traffic within the same project across labeled namespaces:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-project
  namespace: team-a-production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              project: team-a
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              project: team-a
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

Apply matching labels to the project namespaces:

```bash
kubectl label namespace team-a-production project=team-a
kubectl label namespace team-a-staging project=team-a
```

**Allow ingress from an ingress controller:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: team-a-production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              project: shared-platform
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
```

## Step 4: Resource Isolation

Rancher `Project` resources live in the Rancher management cluster, not the downstream cluster. Apply them there to enforce project-level quotas:

```yaml
# Project A - allocated 40% of cluster resources
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  name: p-team-a
  namespace: c-m-xxxxx
spec:
  clusterName: c-m-xxxxx
  displayName: team-a
  resourceQuota:
    limit:
      pods: "200"
      requestsCpu: "16000m"
      requestsMemory: "64Gi"
      limitsCpu: "32000m"
      limitsMemory: "128Gi"

---
# Project B - allocated 30% of cluster resources
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  name: p-team-b
  namespace: c-m-xxxxx
spec:
  clusterName: c-m-xxxxx
  displayName: team-b
  resourceQuota:
    limit:
      pods: "150"
      requestsCpu: "12000m"
      requestsMemory: "48Gi"
      limitsCpu: "24000m"
      limitsMemory: "96Gi"
```

Add LimitRange to prevent any single container from being over-provisioned:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: team-a-production
spec:
  limits:
    - type: Container
      max:
        cpu: "4"
        memory: "8Gi"
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
```

## Step 5: Compute Isolation with Node Affinity

For stronger isolation, run different projects on different nodes:

**Label nodes for specific projects:**

```bash
# Assign nodes to projects
kubectl label node worker-1 project=team-a
kubectl label node worker-2 project=team-a
kubectl label node worker-3 project=team-b
kubectl label node worker-4 project=team-b
```

**Add node affinity to deployments:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: team-a-production
spec:
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api-server
          image: nginx:1.27
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: project
                    operator: In
                    values:
                      - team-a
```

**Use taints and tolerations for stronger enforcement:**

```bash
# Taint nodes so only project-specific workloads can run on them
kubectl taint nodes worker-1 project=team-a:NoSchedule
kubectl taint nodes worker-2 project=team-a:NoSchedule
kubectl taint nodes worker-3 project=team-b:NoSchedule
kubectl taint nodes worker-4 project=team-b:NoSchedule
```

Add tolerations to workloads:

```yaml
spec:
  template:
    spec:
      tolerations:
        - key: project
          operator: Equal
          value: team-a
          effect: NoSchedule
```

## Step 6: Storage Isolation

Separate storage provisioning and limit storage consumption per project:

```yaml
# Create a StorageClass per project
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: team-a-storage
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3
  encrypted: "true"
```

Use ResourceQuota to limit storage per project:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-a-production
spec:
  hard:
    requests.storage: "500Gi"
    persistentvolumeclaims: "20"
    team-a-storage.storageclass.storage.k8s.io/requests.storage: "500Gi"
```

## Step 7: Apply Pod Security Standards

Enforce security standards per project:

```bash
# Apply restricted PSA to sensitive projects
for ns in team-a-production team-a-staging; do
  kubectl label namespace $ns \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite
done

# Apply baseline PSA to development projects
for ns in team-a-development; do
  kubectl label namespace $ns \
    pod-security.kubernetes.io/enforce=baseline \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite
done
```

## Step 8: Verify Isolation

Run a comprehensive verification:

```bash
#!/bin/bash
# verify-isolation.sh

echo "=== Workload Isolation Verification ==="

# 1. Test network isolation
echo ""
echo "1. Network Isolation Test"
# Create a test pod in team-a namespace
kubectl run nettest -n team-a-production --image=busybox:1.36 --restart=Never -- sleep 3600
kubectl wait --for=condition=Ready pod/nettest -n team-a-production --timeout=60s

# Replace "service" with an actual Service name in team-b-production
if kubectl exec -n team-a-production nettest -- \
  wget -qO- --timeout=3 http://service.team-b-production.svc.cluster.local >/dev/null 2>&1; then
  echo "  FAIL: team-a can reach team-b services"
else
  echo "  PASS: Cannot reach team-b services from team-a"
fi

kubectl delete pod nettest -n team-a-production --ignore-not-found

# 2. Check RBAC isolation
echo ""
echo "2. RBAC Isolation Test"
if kubectl auth can-i list pods -n team-b-production --as=team-a-user --quiet; then
  echo "  FAIL: team-a-user can access team-b"
else
  echo "  PASS: team-a-user cannot access team-b"
fi

# 3. Check resource quotas
echo ""
echo "3. Resource Quota Check"
for ns in team-a-production team-b-production; do
  quotas=$(kubectl get resourcequota -n $ns --no-headers 2>/dev/null | wc -l)
  if [ "$quotas" -gt 0 ]; then
    echo "  PASS: $ns has resource quotas"
  else
    echo "  FAIL: $ns has no resource quotas"
  fi
done

# 4. Check NetworkPolicies
echo ""
echo "4. NetworkPolicy Check"
for ns in team-a-production team-b-production; do
  policies=$(kubectl get networkpolicies -n $ns --no-headers 2>/dev/null | wc -l)
  if [ "$policies" -gt 0 ]; then
    echo "  PASS: $ns has $policies network policies"
  else
    echo "  FAIL: $ns has no network policies"
  fi
done

echo ""
echo "=== Verification Complete ==="
```

## Best Practices

- **Layer your isolation**: Use RBAC, network policies, and resource quotas together for defense in depth.
- **Start with network isolation**: Network policies provide the most impactful isolation with the least disruption.
- **Use node affinity for compliance**: When regulatory requirements mandate physical separation, use taints and node affinity.
- **Test isolation regularly**: Automated tests should verify that isolation boundaries hold.
- **Allow shared services**: Design a clean path for shared infrastructure (monitoring, ingress, DNS) to communicate across projects.
- **Document exceptions**: When isolation boundaries need to be relaxed, document the reason and set a review date.
- **Monitor cross-project traffic**: Use network monitoring to detect any unintended communication between projects.

## Conclusion

Isolating workloads between Rancher projects requires a multi-layered approach combining RBAC, network policies, resource quotas, and optionally node affinity. Each layer addresses a different type of interference: access, communication, resources, and compute. By implementing all relevant layers and verifying them regularly, you create robust boundaries between projects that protect each team's workloads from unintended interaction.
