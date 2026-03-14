# How to Use Azure Policy for Kubernetes with Flux on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Azure Policy, Governance, Compliance, OPA, Gatekeeper

Description: Learn how to use Azure Policy for Kubernetes alongside Flux CD on AKS to enforce governance and compliance policies on GitOps-managed workloads.

---

## Introduction

Azure Policy for Kubernetes extends Azure Policy to your AKS clusters, enforcing governance rules on Kubernetes resources. It uses Open Policy Agent (OPA) Gatekeeper under the hood to evaluate policies on resource creation and updates. When combined with Flux, you get a powerful combination: Flux manages what gets deployed, and Azure Policy controls what is allowed.

This guide covers enabling Azure Policy on AKS, assigning built-in policies, creating custom policies, and ensuring your Flux-managed resources comply with organizational standards.

## Prerequisites

- An Azure subscription with permissions to assign policies
- An AKS cluster running Kubernetes 1.24 or later
- Flux CLI version 2.0 or later bootstrapped on the cluster
- Azure CLI version 2.40 or later

## Step 1: Enable Azure Policy Add-on

Enable the Azure Policy add-on on your AKS cluster:

```bash
az aks enable-addons \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --addons azure-policy
```

Verify the add-on is running:

```bash
kubectl get pods -n gatekeeper-system
kubectl get pods -n kube-system -l app=azure-policy
```

## Step 2: Assign Built-in Policies

Azure provides many built-in Kubernetes policies. Assign them at the resource group or subscription level:

```bash
# Do not allow privileged containers
az policy assignment create \
  --name "no-privileged-containers" \
  --display-name "Do not allow privileged containers in AKS" \
  --policy "95edb821-ddaf-4404-9732-666045e056b4" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-resource-group" \
  --params '{"effect": {"value": "deny"}}'

# Require resource limits on containers
az policy assignment create \
  --name "require-resource-limits" \
  --display-name "Ensure containers have resource limits" \
  --policy "e345eecc-fa47-480f-9e88-67dcc122b164" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-resource-group" \
  --params '{"effect": {"value": "deny"}, "cpuLimit": {"value": "2"}, "memoryLimit": {"value": "4Gi"}}'

# Require specific labels
az policy assignment create \
  --name "require-team-label" \
  --display-name "Require team label on namespaces" \
  --policy "96670d01-0a4d-4649-9c89-2d3abc0a5025" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-resource-group" \
  --params '{"effect": {"value": "deny"}, "labelsList": {"value": ["team"]}}'
```

## Step 3: Update Flux Resources for Policy Compliance

Once policies are enforced, your Flux-managed resources must comply. Update deployments to include resource limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  labels:
    team: platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        team: platform
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: my-app
          image: myapp:latest
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            readOnlyRootFilesystem: true
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Step 4: Create Custom Policies with Flux

Deploy custom Gatekeeper constraint templates through Flux for policies not covered by built-in options:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredannotations
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredAnnotations
      validation:
        openAPIV3Schema:
          type: object
          properties:
            annotations:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredannotations

        violation[{"msg": msg}] {
          provided := {a | input.review.object.metadata.annotations[a]}
          required := {a | a := input.parameters.annotations[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required annotations: %v", [missing])
        }
```

Then create a constraint that uses the template:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredAnnotations
metadata:
  name: require-oncall-annotation
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces:
      - default
      - production
  parameters:
    annotations:
      - "oncall-team"
      - "runbook-url"
```

## Step 5: Exempt Flux System Namespaces

Flux system components may not conform to all policies. Create policy exemptions:

```bash
az policy exemption create \
  --name "flux-system-exemption" \
  --policy-assignment "no-privileged-containers" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-resource-group" \
  --exemption-category Waiver \
  --description "Flux system controllers require elevated permissions"
```

Alternatively, exclude the flux-system namespace in the constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredAnnotations
metadata:
  name: require-oncall-annotation
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    excludedNamespaces:
      - flux-system
      - kube-system
      - gatekeeper-system
```

## Step 6: Manage Policies Through Flux Kustomization

Organize constraint templates and constraints in your Git repository:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./policies/constraints
  prune: true
  dependsOn:
    - name: gatekeeper-templates
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper-templates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./policies/templates
  prune: true
```

## Step 7: Monitor Policy Compliance

Check policy compliance from the Azure CLI:

```bash
az policy state list \
  --resource-group my-resource-group \
  --filter "complianceState eq 'NonCompliant'" \
  --output table
```

Check Gatekeeper violations from within the cluster:

```bash
kubectl get constraints -A
kubectl describe k8srequiredannotations require-oncall-annotation
```

## Step 8: Set Up Flux Alerts for Policy Violations

Configure notifications when Flux reconciliation fails due to policy violations:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: policy-violations
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
  summary: "Policy violation detected in Flux reconciliation"
```

## Verifying the Setup

Test that policies are enforced by trying to create a non-compliant resource:

```bash
kubectl run test-privileged --image=nginx --privileged=true
```

This should be denied if the no-privileged-containers policy is active. Check Flux reconciliation:

```bash
flux get kustomizations
flux logs --level=error
```

## Troubleshooting

**Flux reconciliation fails with admission webhook errors**: This means a policy is blocking the resource. Check the error message for the specific constraint that was violated, then update the manifest in Git.

**Policies not enforcing**: Allow up to 15 minutes for Azure Policy assignments to propagate to the cluster. Check that the azure-policy pod and gatekeeper pods are running.

**Constraint template conflicts**: If deploying custom templates through both Azure Policy and Flux, you may encounter conflicts. Use one method consistently to avoid duplicate templates.

## Conclusion

Azure Policy for Kubernetes and Flux complement each other well on AKS. Flux handles the desired state of your workloads through GitOps, while Azure Policy enforces guardrails on what that desired state can include. By managing both policies and workloads through Git, you create a complete governance pipeline where compliance is automated, auditable, and enforced at every deployment.
