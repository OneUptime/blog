# How to Configure Kyverno Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kyverno, Kubernetes, Policy Management, Security

Description: A complete guide to deploying Kyverno on Talos Linux and writing policies to validate, mutate, and generate Kubernetes resources.

---

Kyverno is a Kubernetes-native policy engine that lets you validate, mutate, and generate resources using simple YAML policies. Unlike OPA Gatekeeper which requires learning the Rego language, Kyverno policies are written in plain Kubernetes YAML, making them more accessible to teams that are already comfortable with Kubernetes manifests.

On Talos Linux, Kyverno adds an important layer of governance at the Kubernetes API level. Since Talos handles OS-level security through its immutable design, Kyverno fills the gap by controlling what happens inside the cluster. In this guide, we will install Kyverno on a Talos Linux cluster and create policies for common use cases.

## Prerequisites

- A running Talos Linux cluster
- kubectl and Helm installed locally
- Cluster admin access

## Installing Kyverno

Install Kyverno using the official Helm chart.

```bash
# Add the Kyverno Helm repository
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update

# Install Kyverno in high availability mode
helm install kyverno kyverno/kyverno \
  --namespace kyverno \
  --create-namespace \
  --set replicaCount=3 \
  --set resources.requests.cpu=100m \
  --set resources.requests.memory=256Mi \
  --set resources.limits.cpu=500m \
  --set resources.limits.memory=512Mi
```

Verify the installation.

```bash
# Check that Kyverno pods are running
kubectl get pods -n kyverno

# Verify the webhook configurations
kubectl get validatingwebhookconfigurations | grep kyverno
kubectl get mutatingwebhookconfigurations | grep kyverno
```

## Understanding Kyverno Policy Types

Kyverno supports three types of policy actions:

1. **Validate**: Check resources against rules and reject those that do not comply
2. **Mutate**: Automatically modify resources as they are created or updated
3. **Generate**: Create new resources when specific conditions are met

Policies can be cluster-wide (ClusterPolicy) or namespace-scoped (Policy).

## Validation Policies

### Require Labels

```yaml
# require-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
  annotations:
    policies.kyverno.io/title: Require Labels
    policies.kyverno.io/description: Require team and environment labels on deployments
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: require-team-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
              namespaces:
                - "!kube-system"
                - "!kyverno"
      validate:
        message: "The label 'team' is required on all Deployments and StatefulSets"
        pattern:
          metadata:
            labels:
              team: "?*"
    - name: require-environment-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
              namespaces:
                - "!kube-system"
                - "!kyverno"
      validate:
        message: "The label 'environment' is required on all Deployments and StatefulSets"
        pattern:
          metadata:
            labels:
              environment: "production | staging | development"
```

```bash
kubectl apply -f require-labels.yaml

# Test - this will be rejected
kubectl create deployment test --image=nginx
# Error: The label 'team' is required on all Deployments and StatefulSets
```

### Block Latest Tag

```yaml
# disallow-latest-tag.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-image-tag
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
      validate:
        message: "Using 'latest' tag is not allowed. Specify an explicit image tag."
        pattern:
          spec:
            containers:
              - image: "!*:latest & *:*"
            =(initContainers):
              - image: "!*:latest & *:*"
```

### Restrict Privileged Containers

```yaml
# disallow-privileged.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged-containers
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: no-privileged
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
      validate:
        message: "Privileged containers are not allowed"
        pattern:
          spec:
            containers:
              - =(securityContext):
                  =(privileged): false
            =(initContainers):
              - =(securityContext):
                  =(privileged): false
```

## Mutation Policies

Mutation policies automatically modify resources. This is incredibly useful for setting defaults and injecting standard configurations.

### Add Default Resource Limits

```yaml
# add-default-resources.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-resources
spec:
  background: false
  rules:
    - name: add-default-requests
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
      mutate:
        patchStrategicMerge:
          spec:
            containers:
              - (name): "*"
                resources:
                  requests:
                    +(memory): "128Mi"
                    +(cpu): "100m"
                  limits:
                    +(memory): "256Mi"
                    +(cpu): "200m"
```

The `+()` notation means "add only if not already set." This ensures that containers without resource definitions get sensible defaults, while containers that already have explicit values are left unchanged.

### Add Standard Labels

```yaml
# add-standard-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-standard-labels
spec:
  background: false
  rules:
    - name: add-managed-by-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(app.kubernetes.io/managed-by): "kyverno"
              +(platform): "talos-linux"
```

### Inject Sidecar Containers

```yaml
# inject-logging-sidecar.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-logging-sidecar
spec:
  background: false
  rules:
    - name: inject-fluentbit
      match:
        any:
          - resources:
              kinds:
                - Deployment
              selector:
                matchLabels:
                  logging: "enabled"
      mutate:
        patchesJson6902: |-
          - op: add
            path: /spec/template/spec/containers/-
            value:
              name: fluentbit
              image: fluent/fluent-bit:latest
              resources:
                requests:
                  cpu: 50m
                  memory: 64Mi
                limits:
                  cpu: 100m
                  memory: 128Mi
              volumeMounts:
                - name: app-logs
                  mountPath: /var/log/app
```

## Generation Policies

Generate policies automatically create resources in response to events.

### Auto-Create Network Policies

```yaml
# generate-default-networkpolicy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-default-network-policy
spec:
  background: false
  rules:
    - name: default-deny-ingress
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              names:
                - kube-system
                - kyverno
                - default
      generate:
        kind: NetworkPolicy
        apiVersion: networking.k8s.io/v1
        name: default-deny-ingress
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
```

When a new namespace is created, Kyverno will automatically create a default deny network policy in that namespace.

### Auto-Create Resource Quotas

```yaml
# generate-resource-quota.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-resource-quota
spec:
  background: false
  rules:
    - name: create-default-quota
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchLabels:
                  quota: "standard"
      generate:
        kind: ResourceQuota
        apiVersion: v1
        name: default-quota
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            hard:
              requests.cpu: "4"
              requests.memory: "8Gi"
              limits.cpu: "8"
              limits.memory: "16Gi"
              pods: "50"
```

## Policy Reports

Kyverno generates Policy Reports that show the compliance status of existing resources.

```bash
# View cluster-wide policy reports
kubectl get clusterpolicyreport -o wide

# View namespace-specific reports
kubectl get policyreport --all-namespaces

# Get detailed violation information
kubectl get clusterpolicyreport -o json | \
  jq '.items[] | .results[] | select(.result == "fail") | {policy: .policy, resource: .resources[0].name, message: .message}'
```

## Audit Mode vs Enforce Mode

Start with audit mode to understand the impact before enforcing.

```yaml
spec:
  # Start with Audit to see what would be blocked
  validationFailureAction: Audit

  # Switch to Enforce when ready
  # validationFailureAction: Enforce
```

In Audit mode, violations are recorded in Policy Reports but resources are not blocked. This lets you roll out policies gradually without disrupting existing workloads.

## Talos Linux Specific Policies

Here are some policies particularly relevant for Talos Linux clusters.

```yaml
# talos-security-policies.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: talos-security-baseline
spec:
  validationFailureAction: Enforce
  rules:
    # Prevent host namespace sharing
    - name: no-host-namespaces
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
      validate:
        message: "Sharing host namespaces is not allowed on Talos Linux clusters"
        pattern:
          spec:
            =(hostNetwork): false
            =(hostPID): false
            =(hostIPC): false
    # Require read-only root filesystem
    - name: require-readonly-rootfs
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
      validate:
        message: "Root filesystem must be read-only"
        pattern:
          spec:
            containers:
              - securityContext:
                  readOnlyRootFilesystem: true
```

## Wrapping Up

Kyverno on Talos Linux provides a powerful and approachable policy management layer. Its YAML-based policies are easier for Kubernetes-experienced teams to adopt compared to Rego-based alternatives. The combination of validation, mutation, and generation capabilities means you can enforce standards, set sensible defaults, and automate resource creation all from a single tool. Start with audit mode, review the policy reports, and gradually move to enforcement as your team builds confidence with the policies. On Talos Linux, where the OS is already hardened, Kyverno completes the security posture by governing what runs inside the cluster.
