# How to Enforce Resource Limits with ArgoCD Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Management, Policy Enforcement

Description: Learn how to enforce CPU and memory resource limits on all Kubernetes deployments managed by ArgoCD using LimitRanges, ResourceQuotas, and policy engines.

---

Running Kubernetes without resource limits is like driving without seatbelts. Everything is fine until one application consumes all available memory on a node and starts killing other pods through OOM events. When you manage dozens or hundreds of applications through ArgoCD, enforcing resource limits consistently becomes critical for cluster stability.

This guide covers multiple strategies for enforcing resource limits across your ArgoCD-managed deployments, from Kubernetes-native tools to policy engines.

## The Problem with Missing Resource Limits

Without resource limits, a single misbehaving pod can consume all CPU or memory on a node. This triggers the kubelet's eviction process, which starts killing pods based on QoS class. Pods without resource limits are in the BestEffort QoS class and get killed first, but the cascade can take down Guaranteed-class pods too when things get bad enough.

In an ArgoCD environment, this is particularly problematic because ArgoCD will keep trying to sync and recreate pods that keep getting evicted, potentially making things worse.

## Strategy 1: Kubernetes LimitRanges

LimitRanges provide default resource limits for containers that do not specify them. Deploy LimitRanges through ArgoCD to ensure every namespace has sensible defaults.

```yaml
# limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
      min:
        cpu: "50m"
        memory: "64Mi"
    - type: Pod
      max:
        cpu: "8"
        memory: "16Gi"
```

Deploy this across all namespaces using an ApplicationSet.

```yaml
# limitrange-appset.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: namespace-limitranges
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - namespace: production
            maxCpu: "4"
            maxMemory: "8Gi"
          - namespace: staging
            maxCpu: "2"
            maxMemory: "4Gi"
          - namespace: development
            maxCpu: "1"
            maxMemory: "2Gi"
  template:
    metadata:
      name: "limitrange-{{namespace}}"
    spec:
      project: platform
      source:
        repoURL: https://github.com/myorg/cluster-config.git
        path: "limitranges/{{namespace}}"
        targetRevision: main
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          selfHeal: true
```

## Strategy 2: ResourceQuotas

ResourceQuotas limit the total resource consumption per namespace. This prevents one team from monopolizing cluster resources.

```yaml
# resourcequota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "100"
    services: "20"
    persistentvolumeclaims: "30"
    # This forces every pod to have resource limits
    count/deployments.apps: "50"
```

The key detail here is that when a ResourceQuota is active in a namespace, Kubernetes requires all pods to specify resource requests and limits. If a developer pushes a Deployment without limits, the pod creation will fail. ArgoCD will show the Application as Degraded because the pods cannot be scheduled.

## Strategy 3: Kyverno Validation Policies

For more granular control, use Kyverno to validate that resource limits fall within acceptable ranges.

```yaml
# validate-resource-limits.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: validate-resource-limits
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-resource-limits-exist
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      validate:
        message: "All containers must have CPU and memory limits defined."
        pattern:
          spec:
            template:
              spec:
                containers:
                  - resources:
                      limits:
                        memory: "?*"
                        cpu: "?*"
                      requests:
                        memory: "?*"
                        cpu: "?*"
    - name: check-memory-limit-range
      match:
        any:
          - resources:
              kinds:
                - Deployment
      validate:
        message: >-
          Memory limit must be between 64Mi and 8Gi.
          Current value: {{request.object.spec.template.spec.containers[0].resources.limits.memory}}
        deny:
          conditions:
            any:
              - key: "{{request.object.spec.template.spec.containers[0].resources.limits.memory}}"
                operator: GreaterThan
                value: "8Gi"
    - name: check-cpu-to-memory-ratio
      match:
        any:
          - resources:
              kinds:
                - Deployment
      validate:
        message: "CPU to memory ratio must be reasonable. Do not request 4 CPUs with 128Mi memory."
        deny:
          conditions:
            any:
              - key: "{{request.object.spec.template.spec.containers[0].resources.limits.cpu}}"
                operator: GreaterThan
                value: "4"
```

## Strategy 4: ArgoCD Sync Hook for Validation

Add a pre-sync validation step that checks resource limits before ArgoCD applies manifests.

```yaml
# pre-sync-resource-check.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-resources
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: validator
          image: bitnami/kubectl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Check all deployment manifests for resource limits
              echo "Validating resource limits..."
              VIOLATIONS=0

              for file in /manifests/*.yaml; do
                # Check if it's a Deployment
                KIND=$(kubectl apply --dry-run=client -f "$file" -o jsonpath='{.kind}' 2>/dev/null)
                if [ "$KIND" = "Deployment" ]; then
                  # Check for resource limits
                  LIMITS=$(kubectl apply --dry-run=client -f "$file" \
                    -o jsonpath='{.spec.template.spec.containers[*].resources.limits}' 2>/dev/null)
                  if [ -z "$LIMITS" ]; then
                    echo "VIOLATION: $file has no resource limits"
                    VIOLATIONS=$((VIOLATIONS + 1))
                  fi
                fi
              done

              if [ $VIOLATIONS -gt 0 ]; then
                echo "Found $VIOLATIONS resources without limits. Failing sync."
                exit 1
              fi
              echo "All resources have limits defined."
      restartPolicy: Never
```

## Monitoring Resource Limit Compliance

Set up monitoring to track which applications are approaching their limits. This helps you right-size limits over time.

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: resource-limit-alerts
spec:
  groups:
    - name: resource-limits
      rules:
        - alert: ContainerNearMemoryLimit
          expr: |
            (container_memory_working_set_bytes / container_spec_memory_limit_bytes) > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Container {{ $labels.container }} in {{ $labels.namespace }} is using over 90% of memory limit"
        - alert: ContainerNearCPULimit
          expr: |
            (rate(container_cpu_usage_seconds_total[5m]) / container_spec_cpu_quota * container_spec_cpu_period) > 0.9
          for: 10m
          labels:
            severity: warning
```

## Handling Existing Applications Without Limits

If you are introducing resource limit enforcement on an existing cluster with many ArgoCD applications, you need a migration plan. Start by auditing which applications lack limits.

```bash
# Find all deployments without resource limits
kubectl get deployments --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.template.spec.containers[].resources.limits == null) | "\(.metadata.namespace)/\(.metadata.name)"'
```

Then use Kyverno in Audit mode to track progress without blocking deployments.

```yaml
spec:
  validationFailureAction: Audit
```

Review the policy reports to identify violations and work with each team to add appropriate limits. Once all existing applications are compliant, switch to Enforce mode.

## Best Practices for Resource Limits with ArgoCD

Set requests based on actual usage and limits with a reasonable buffer - typically 1.5x to 2x the request. Use Vertical Pod Autoscaler (VPA) in recommendation mode to get data-driven suggestions.

Always set both CPU and memory limits. Missing one but having the other creates unpredictable behavior. Memory limits are especially critical because memory is an incompressible resource - when a container exceeds its memory limit, it gets OOM-killed immediately.

Document your limit policies in your Git repository alongside the enforcement rules. This gives your developers clear guidance on what is expected and why.

For more on managing ArgoCD at scale, see our guide on [configuring multi-tenancy in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-multi-tenancy-argocd/view).

## Conclusion

Enforcing resource limits through ArgoCD is a multi-layered approach. LimitRanges provide defaults, ResourceQuotas cap total usage, and policy engines like Kyverno give you fine-grained validation. Together with ArgoCD's GitOps workflow, you get a system where resource governance is automated, auditable, and consistently applied across your entire cluster fleet.
