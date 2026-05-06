# How to Configure Cluster-Level Policies in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Policies, Kubernetes, RBAC, Security, OPA, Admission Control

Description: Learn how to configure cluster-level policies in Rancher including resource quotas, network policies, Pod Security Standards, and OPA admission controls to enforce governance across all workloads.

---

Cluster-level policies establish guardrails that apply to every workload in a cluster, regardless of who deployed it. Rancher provides several policy mechanisms: Kubernetes-native resource quotas, network policies, Pod Security Standards, and OPA Gatekeeper.

---

## 1. Resource Quotas via Rancher Projects

Rancher Projects wrap namespaces and allow you to set project-wide resource quotas that propagate to namespaces in the project:

```yaml
# Applied via Rancher management API or UI

apiVersion: management.cattle.io/v3
kind: Project
metadata:
  name: team-alpha
  namespace: c-xxxxx   # cluster namespace
spec:
  clusterName: c-xxxxx
  resourceQuota:
    limit:
      # Maximum resources for the entire project
      pods: "100"
      requestsCpu: "20"
      requestsMemory: "40Gi"
      limitsCpu: "40"
      limitsMemory: "80Gi"
  namespaceDefaultResourceQuota:
    limit:
      # Default quota per namespace in the project
      pods: "20"
      requestsCpu: "4"
      requestsMemory: "8Gi"
```

---

## 2. Pod Security Standards

Pod Security Standards are enforced at the namespace level (Kubernetes 1.25+). To label existing namespaces:

```bash
# Label all existing namespaces with baseline enforcement
kubectl label --overwrite ns --all \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=latest

# Set the production namespace to restricted
kubectl label --overwrite ns production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted
```

---

## 3. Network Policies for Cluster-Wide Default Deny

Because NetworkPolicies are namespaced, apply a default-deny policy in each namespace to implement zero-trust networking:

```yaml
# default-deny.yaml (create one copy per namespace, for example via Fleet)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: app-namespace
spec:
  podSelector: {}   # applies to all pods
  policyTypes:
    - Ingress
    - Egress
  # Empty ingress/egress rules = deny all
```

Then add explicit allow rules per service:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-egress-to-backend
  namespace: app-namespace
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              tier: backend
      ports:
        - protocol: TCP
          port: 8080
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-ingress-from-frontend
  namespace: app-namespace
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: frontend
      ports:
        - protocol: TCP
          port: 8080
```

---

## 4. OPA Gatekeeper Constraints

Install OPA Gatekeeper to enforce custom policies at admission time:

```bash
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm install gatekeeper gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace
```

Create a constraint template that requires `limits.cpu` on each Pod container:

```yaml
# constrainttemplate-require-limits.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requireresourcelimits
spec:
  crd:
    spec:
      names:
        kind: RequireResourceLimits
      validation:
        openAPIV3Schema:
          type: object
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requireresourcelimits
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.cpu
          msg := sprintf("Container '%v' must set resource limits.cpu", [container.name])
        }
```

Apply the constraint to enforce it:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireResourceLimits
metadata:
  name: require-resource-limits
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

---

## Best Practices

- Distribute policies via **Rancher Fleet** so they are applied consistently and tracked in Git.
- Start with `warn` enforcement for new policies before switching to `deny` to avoid breaking existing workloads.
- Use Rancher's built-in **compliance scans** to validate CIS benchmark posture after policy changes.
