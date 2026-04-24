# How to Configure Cluster-Level Policies in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Policies, OPA, Security

Description: Configure and enforce cluster-level security and governance policies in Rancher using OPA Gatekeeper, Pod Security Standards, and Network Policies deployed via Fleet.

## Introduction

Cluster-level policies in Rancher enforce security guardrails, resource quotas, and compliance requirements across all workloads. Using OPA Gatekeeper for admission control, Kubernetes Network Policies for traffic isolation, and Rancher Fleet for GitOps-driven policy deployment, you can enforce consistent governance across every cluster in your fleet.

## Policy Types to Enforce

| Policy Type | Tool | Purpose |
|---|---|---|
| Admission Control | OPA Gatekeeper | Block non-compliant resource creation |
| Pod Security | Pod Security Standards | Restrict container capabilities |
| Network Isolation | NetworkPolicy | Control pod-to-pod traffic |
| Resource Quotas | ResourceQuota / LimitRange | Prevent resource hoarding |
| Image Policy | Gatekeeper / Kyverno | Allow only approved registries |

## Step 1: Deploy OPA Gatekeeper via Fleet

```yaml
# gitrepo-gatekeeper.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: gatekeeper
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/cluster-policies
  branch: main
  paths:
    - gatekeeper/
  targets:
    - clusterSelector: {}   # Apply to all clusters
```

```yaml
# gatekeeper/fleet.yaml
defaultNamespace: gatekeeper-system
helm:
  repo: https://open-policy-agent.github.io/gatekeeper/charts
  chart: gatekeeper
  releaseName: gatekeeper
  values:
    replicas: 3
    auditInterval: 60
    validatingWebhookFailurePolicy: Ignore
```

## Step 2: Define ConstraintTemplates

```yaml
# policies/require-labels-template.yaml
# Enforce that all Deployments have required labels
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requiredeploymentlabels
spec:
  crd:
    spec:
      names:
        kind: RequireDeploymentLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            requiredLabels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requiredeploymentlabels

        violation[{"msg": msg}] {
          input.review.kind.kind == "Deployment"
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.requiredLabels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
```

```bash
# Install the Gatekeeper Library templates used by the built-in constraints below
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/pod-security-policy/privileged-containers/template.yaml
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/general/allowedrepos/template.yaml
```

## Step 3: Create Constraints

```yaml
# policies/require-labels-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireDeploymentLabels
metadata:
  name: must-have-team-label
spec:
  enforcementAction: deny    # or "warn" to start with
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    excludedNamespaces:
      - kube-system
      - cattle-system
  parameters:
    requiredLabels:
      - team
      - app
      - environment
---
# Block privileged containers
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPPrivilegedContainer
metadata:
  name: no-privileged-containers
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - cattle-system
      - cert-manager
```

## Step 4: Enforce Pod Security Standards

```yaml
# Apply Pod Security Standards at namespace level
# Label namespaces to enforce the "restricted" profile
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
```

```bash
# Apply the restricted profile to all non-system namespaces
kubectl get namespaces --no-headers -o name \
  | grep -Ev '^namespace/(kube-system|kube-public|kube-node-lease|cattle-.*|fleet-.*|cert-manager|gatekeeper-system)$' \
  | xargs -I {} kubectl label --overwrite {} \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/enforce-version=latest \
    pod-security.kubernetes.io/warn=restricted \
    pod-security.kubernetes.io/warn-version=latest \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/audit-version=latest
```

## Step 5: Configure Network Policies

```yaml
# network-policies/default-deny.yaml - Applied via Fleet to all clusters
# Requires a CNI plugin that enforces NetworkPolicy.
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow DNS (required for pod networking)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
---
# Allow intra-namespace communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
```

## Step 6: Configure Resource Quotas via Fleet

```yaml
# resource-quotas/production-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "50"
    requests.memory: 100Gi
    limits.cpu: "100"
    limits.memory: 200Gi
    persistentvolumeclaims: "20"
    services.loadbalancers: "5"
    count/deployments.apps: "50"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 8Gi
```

## Step 7: Enforce Image Registry Policy

```yaml
# Gatekeeper policy: only allow images from approved registries
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: approved-registries
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - cattle-system
  parameters:
    repos:
      - "ghcr.io/my-org/"
      - "registry.example.com/"
      - "public.ecr.aws/my-account/"
```

## Step 8: Audit Current Policy Violations

```bash
# List all Gatekeeper constraint violations
kubectl get constraints
kubectl describe k8spspprivilegedcontainer no-privileged-containers | grep -A20 '^Status:'

# Check violations in Gatekeeper audit
kubectl get constraints -o json \
  | jq '.items[] | {name: .metadata.name, totalViolations: (.status.totalViolations // 0)}'

# View specific violations
kubectl get k8sallowedrepos approved-registries \
  -o jsonpath='{.status.violations[*].message}'
```

## Conclusion

Cluster-level policies in Rancher enforce consistent security and governance across your entire cluster fleet. Using OPA Gatekeeper for admission control, Pod Security Standards for container security, Network Policies for traffic isolation, and Resource Quotas for fair resource allocation - all deployed via Fleet GitOps - you create a compliant, auditable platform where security is automated rather than manual. Start with `warn` enforcement mode and transition to `deny` once all existing workloads are compliant.
