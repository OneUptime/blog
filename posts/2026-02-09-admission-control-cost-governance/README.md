# How to Implement Admission Control for Cost Governance and Resource Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Management, Resource Limits, Admission Control, FinOps

Description: Learn how to use admission control policies to enforce cost governance, limit resource consumption, prevent expensive workloads, implement chargeback mechanisms, and optimize cloud spending through policy-based resource management.

---

Uncontrolled resource consumption drives up cloud costs. Admission control provides a enforcement point for cost governance, blocking expensive workloads before they consume resources. Policies can limit CPU and memory requests, enforce cost center tags for chargeback, restrict storage classes, and prevent high-cost configurations. This guide shows you how to implement cost governance through admission policies.

## Enforcing Resource Limits

Create policies that limit resource requests:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: enforce-resource-limits
  annotations:
    policies.kyverno.io/title: Enforce Resource Limits
    policies.kyverno.io/category: Cost Management
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-cpu-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Container CPU requests must not exceed 2 cores"
        foreach:
          - list: "request.object.spec.containers"
            deny:
              conditions:
                any:
                  - key: "{{ element.resources.requests.cpu || '0' }}"
                    operator: GreaterThan
                    value: "2000m"

    - name: check-memory-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Container memory requests must not exceed 8Gi"
        foreach:
          - list: "request.object.spec.containers"
            deny:
              conditions:
                any:
                  - key: "{{ element.resources.requests.memory || '0Mi' }}"
                    operator: GreaterThan
                    value: "8Gi"
```

This prevents individual containers from requesting excessive resources.

## Pod-Level Resource Caps

Limit total resources per pod:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pod-resource-caps
spec:
  validationFailureAction: Enforce
  rules:
    - name: total-pod-resources
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Total pod CPU requests must not exceed 4 cores"
        deny:
          conditions:
            any:
              - key: |
                  {{ sum(request.object.spec.containers[].resources.requests.cpu | [0] | map(&to_number(@), @) ) }}
                operator: GreaterThan
                value: 4000
```

## Enforcing Cost Center Labels

Require cost allocation tags for chargeback:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-cost-labels
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-cost-center
      match:
        any:
          - resources:
              kinds:
                - Pod
                - Deployment
                - StatefulSet
                - PersistentVolumeClaim
      validate:
        message: |
          Resources must have cost-center and owner labels for chargeback.
          Contact finance team for cost center codes.
        pattern:
          metadata:
            labels:
              cost-center: "?*"
              owner: "?*"
              project: "?*"
```

## Restricting Storage Classes

Limit use of expensive storage:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-storage-classes
spec:
  validationFailureAction: Enforce
  rules:
    - name: allowed-storage-classes
      match:
        any:
          - resources:
              kinds:
                - PersistentVolumeClaim
      validate:
        message: |
          Only gp3, standard, and ebs-sc storage classes allowed.
          Premium SSD requires approval - contact platform team.
        pattern:
          spec:
            storageClassName: "gp3 | standard | ebs-sc"

    - name: limit-volume-size
      match:
        any:
          - resources:
              kinds:
                - PersistentVolumeClaim
      validate:
        message: "PVC size must not exceed 500Gi"
        deny:
          conditions:
            any:
              - key: "{{ request.object.spec.resources.requests.storage }}"
                operator: GreaterThan
                value: "500Gi"
```

## Budget-Based Limits

Implement namespace budgets:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: namespace-budget-enforcement
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-namespace-budget
      match:
        any:
          - resources:
              kinds:
                - Pod
      context:
        - name: namespaceAnnotations
          apiCall:
            urlPath: "/api/v1/namespaces/{{request.namespace}}"
            jmesPath: "metadata.annotations"
      validate:
        message: |
          Namespace monthly budget: ${{namespaceAnnotations.\"budget-monthly\"}}
          Current usage exceeds budget. Contact finance for increase.
        deny:
          conditions:
            any:
              - key: "{{ namespaceAnnotations.\"budget-exceeded\" }}"
                operator: Equals
                value: "true"
```

Query current costs and update namespace annotation:

```bash
#!/bin/bash
# update-budget-status.sh

NAMESPACE=$1
MONTHLY_BUDGET=$(kubectl get namespace $NAMESPACE -o jsonpath='{.metadata.annotations.budget-monthly}')
CURRENT_COST=$(query-cloud-costs --namespace=$NAMESPACE)

if (( $(echo "$CURRENT_COST > $MONTHLY_BUDGET" | bc -l) )); then
  kubectl annotate namespace $NAMESPACE budget-exceeded=true --overwrite
else
  kubectl annotate namespace $NAMESPACE budget-exceeded=false --overwrite
fi
```

## Preventing Autoscaling Abuse

Limit HPA configurations:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: limit-hpa-scale
spec:
  validationFailureAction: Enforce
  rules:
    - name: max-replicas-limit
      match:
        any:
          - resources:
              kinds:
                - HorizontalPodAutoscaler
      validate:
        message: "HPA maxReplicas must not exceed 20"
        pattern:
          spec:
            maxReplicas: "<=20"

    - name: require-resource-requests
      match:
        any:
          - resources:
              kinds:
                - HorizontalPodAutoscaler
      validate:
        message: "Target deployment must have resource requests defined"
        deny:
          conditions:
            all:
              - key: "{{ request.object.spec.metrics[?type=='Resource'] | length(@) }}"
                operator: Equals
                value: 0
```

## Blocking Expensive Instance Types

Prevent use of high-cost node selectors:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-node-selectors
spec:
  validationFailureAction: Enforce
  rules:
    - name: block-expensive-instances
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: |
          GPU and high-memory instances require approval.
          Blocked instance types: p3, p4, r6g, x2gd
        pattern:
          spec:
            =(nodeSelector):
              X(node.kubernetes.io/instance-type): "p3* | p4* | r6g* | x2gd*"
```

## Idle Resource Detection

Flag pods with low utilization:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: warn-idle-resources
spec:
  validationFailureAction: Audit  # Warn but don't block
  background: true
  rules:
    - name: detect-overprovisioning
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: |
          WARNING: This pod may be over-provisioned.
          Current requests are significantly higher than typical usage.
          Consider right-sizing to reduce costs.
        deny:
          conditions:
            any:
              - key: "{{ request.object.metadata.annotations.\"average-cpu-utilization\" || '100' }}"
                operator: LessThan
                value: "20"
```

## Cost Estimation in Admission

Add cost estimates to pod events:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: annotate-estimated-cost
spec:
  validationFailureAction: Audit
  rules:
    - name: calculate-monthly-cost
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: |
          Estimated monthly cost: ${{
            (to_number(request.object.spec.containers[0].resources.requests.cpu || '0') * 30 * 0.05) +
            (to_number(request.object.spec.containers[0].resources.requests.memory || '0') * 30 * 0.01)
          }}
```

## Implementing Quota Policies

Enforce quotas before ResourceQuota limits:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: enforce-quotas
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-namespace-quota
      match:
        any:
          - resources:
              kinds:
                - Pod
      context:
        - name: quota
          apiCall:
            urlPath: "/api/v1/namespaces/{{request.namespace}}/resourcequotas/compute-quota"
            jmesPath: "status"
      validate:
        message: |
          Namespace CPU quota: {{quota.hard.\"requests.cpu\"}}
          Current usage: {{quota.used.\"requests.cpu\"}}
        deny:
          conditions:
            any:
              - key: "{{ to_number(quota.used.\"requests.cpu\") }}"
                operator: GreaterThan
                value: "{{ to_number(quota.hard.\"requests.cpu\") * 0.9 }}"
```

## Conclusion

Admission control enables proactive cost governance by enforcing resource limits, requiring cost allocation labels, restricting expensive storage and compute classes, and implementing namespace budgets. Block over-provisioned workloads, limit autoscaling ranges, and prevent use of expensive instance types. Track costs through required labels for chargeback, flag idle resources for optimization, and provide cost estimates during admission. Combine hard limits with audit policies to guide users toward cost-effective configurations while preventing egregious waste.

Cost governance through admission control turns policy into budget enforcement, preventing cost overruns before they happen.
