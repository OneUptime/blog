# How to Implement Admission Control for Cost Governance and Resource Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Management, Resource Limit, Admission Control, FinOps

Description: Learn how to use admission control policies to enforce cost governance, limit resource consumption, prevent expensive workloads, implement chargeback mechanisms.

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
  background: true
  rules:
    - name: check-cpu-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Enforce
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
        failureAction: Enforce
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
  rules:
    - name: total-pod-resources
      match:
        any:
          - resources:
              kinds:
                - Pod
      context:
        - name: cpuRequests
          variable:
            jmesPath: request.object.spec.containers[].resources.requests.cpu
            default:
              - "0"
      validate:
        failureAction: Enforce
        message: "Total pod CPU requests must not exceed 4 cores"
        deny:
          conditions:
            any:
              - key: "{{ sum(cpuRequests) }}"
                operator: GreaterThan
                value: "4"
```

## Enforcing Cost Center Labels

Require cost allocation tags for chargeback:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-cost-labels
spec:
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
        failureAction: Enforce
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
  rules:
    - name: allowed-storage-classes
      match:
        any:
          - resources:
              kinds:
                - PersistentVolumeClaim
      validate:
        failureAction: Enforce
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
        failureAction: Enforce
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
        failureAction: Enforce
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
  rules:
    - name: max-replicas-limit
      match:
        any:
          - resources:
              kinds:
                - HorizontalPodAutoscaler
      validate:
        failureAction: Enforce
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
        failureAction: Enforce
        message: "HPA must define at least one Resource metric"
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
  rules:
    - name: block-expensive-instances
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Enforce
        message: |
          GPU and high-memory instances require approval.
          Blocked instance types: p3, p4, r6g, x2gd
        deny:
          conditions:
            any:
              - key: "{{ request.object.spec.nodeSelector.\"node.kubernetes.io/instance-type\" || '' }}"
                operator: Equals
                value: "p3*"
              - key: "{{ request.object.spec.nodeSelector.\"node.kubernetes.io/instance-type\" || '' }}"
                operator: Equals
                value: "p4*"
              - key: "{{ request.object.spec.nodeSelector.\"node.kubernetes.io/instance-type\" || '' }}"
                operator: Equals
                value: "r6g*"
              - key: "{{ request.object.spec.nodeSelector.\"node.kubernetes.io/instance-type\" || '' }}"
                operator: Equals
                value: "x2gd*"
```

## Idle Resource Detection

Flag pods with low utilization:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: warn-idle-resources
spec:
  background: true
  rules:
    - name: detect-overprovisioning
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit  # Warn but don't block
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

Surface externally calculated cost estimates in audit reports:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: annotate-estimated-cost
spec:
  rules:
    - name: calculate-monthly-cost
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Audit
        message: |
          Estimated monthly cost: ${{ request.object.metadata.annotations.\"estimated-monthly-cost\" }}
        deny:
          conditions:
            any:
              - key: "{{ to_number(request.object.metadata.annotations.\"estimated-monthly-cost\" || '0') }}"
                operator: GreaterThan
                value: 0
```

## Implementing Quota Policies

Enforce quotas before ResourceQuota limits:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: enforce-quotas
spec:
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
        failureAction: Enforce
        message: |
          Namespace CPU quota: {{quota.hard.\"requests.cpu\"}}
          Current usage: {{quota.used.\"requests.cpu\"}}
        deny:
          conditions:
            any:
              - key: "{{ quota.used.\"requests.cpu\" }}"
                operator: GreaterThan
                value: "{{ multiply('{{ quota.hard.\"requests.cpu\" }}', `0.9`) }}"
```

## Conclusion

Admission control enables proactive cost governance by enforcing resource limits, requiring cost allocation labels, restricting expensive storage and compute classes, and implementing namespace budgets. Block over-provisioned workloads, limit autoscaling ranges, and prevent use of expensive instance types. Track costs through required labels for chargeback, flag idle resources for optimization, and provide cost estimates during admission. Combine hard limits with audit policies to guide users toward cost-effective configurations while preventing egregious waste.

Cost governance through admission control turns policy into budget enforcement, preventing cost overruns before they happen.
