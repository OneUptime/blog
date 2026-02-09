# How to Configure ValidatingAdmissionPolicy with Audit Annotations for Visibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ValidatingAdmissionPolicy, Audit, Observability, Compliance

Description: Learn how to use audit annotations in Kubernetes ValidatingAdmissionPolicy to capture policy decisions, enrich audit logs, and build compliance dashboards without blocking requests.

---

Audit annotations in ValidatingAdmissionPolicy let you record policy evaluation results in Kubernetes audit logs without blocking requests. This enables policy observability, compliance reporting, and gradual policy rollout. Instead of enforcing rules immediately, you can track violations and understand their impact before enforcement. This guide shows you how to use audit annotations effectively for policy visibility and compliance.

## Understanding Audit Annotations

Audit annotations add custom metadata to Kubernetes audit events. When a ValidatingAdmissionPolicy evaluates a request, it can attach annotations describing the evaluation results, matched rules, or calculated values. These annotations appear in the audit log alongside the standard request information.

Unlike validation actions that block non-compliant requests, audit annotations always allow requests to proceed. This makes them perfect for testing new policies, tracking compliance trends, and providing visibility without disrupting workloads.

## Configuring Basic Audit Annotations

Start with a policy that adds audit annotations for resource requests:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: audit-resource-limits
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  auditAnnotations:
    - key: "resource-limits-check.total-cpu"
      valueExpression: |
        string(object.spec.containers.map(c,
          int(c.?resources.?requests.?cpu.replace('m', '').orValue('0'))
        ).sum()) + 'm'
    - key: "resource-limits-check.total-memory"
      valueExpression: |
        string(object.spec.containers.map(c,
          int(c.?resources.?requests.?memory.replace('Mi', '').orValue('0'))
        ).sum()) + 'Mi'
    - key: "resource-limits-check.has-limits"
      valueExpression: |
        string(object.spec.containers.all(c,
          has(c.resources) && has(c.resources.limits)
        ))
```

Create a binding with Audit action:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: audit-resource-limits-binding
spec:
  policyName: audit-resource-limits
  validationActions: [Audit]
  matchResources:
    namespaceSelector:
      matchLabels:
        environment: production
```

The audit annotations calculate total CPU and memory requests, and check if limits are defined. These values appear in audit logs for every pod creation.

## Tracking Policy Violations

Create annotations that flag specific policy violations:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: audit-security-violations
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  auditAnnotations:
    - key: "security-check.runs-as-root"
      valueExpression: |
        string(!object.spec.containers.all(c,
          has(c.securityContext) &&
          has(c.securityContext.runAsNonRoot) &&
          c.securityContext.runAsNonRoot == true
        ))
    - key: "security-check.privileged-containers"
      valueExpression: |
        string(object.spec.containers.exists(c,
          has(c.securityContext) &&
          has(c.securityContext.privileged) &&
          c.securityContext.privileged == true
        ))
    - key: "security-check.host-network"
      valueExpression: |
        string(object.spec.?hostNetwork.orValue(false))
    - key: "security-check.violation-count"
      valueExpression: |
        string(
          int(!object.spec.containers.all(c,
            has(c.securityContext) && c.securityContext.runAsNonRoot == true
          )) +
          int(object.spec.containers.exists(c,
            c.?securityContext.?privileged.orValue(false)
          )) +
          int(object.spec.?hostNetwork.orValue(false))
        )
```

This policy annotates each request with boolean flags for common security violations and a total count, enabling dashboard creation without blocking pods.

## Capturing Resource Metadata

Record resource characteristics for compliance tracking:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: audit-resource-metadata
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  auditAnnotations:
    - key: "metadata.has-owner-label"
      valueExpression: |
        string(has(object.metadata.labels.owner))
    - key: "metadata.has-cost-center"
      valueExpression: |
        string(has(object.metadata.annotations['cost-center']))
    - key: "metadata.replica-count"
      valueExpression: |
        string(object.spec.replicas)
    - key: "metadata.update-strategy"
      valueExpression: |
        object.spec.?strategy.?type.orValue('RollingUpdate')
    - key: "metadata.container-count"
      valueExpression: |
        string(object.spec.template.spec.containers.size())
    - key: "metadata.uses-private-registry"
      valueExpression: |
        string(object.spec.template.spec.containers.all(c,
          c.image.startsWith('registry.company.com/')
        ))
```

These annotations create a metadata snapshot for each deployment, useful for capacity planning and compliance reporting.

## Recording Policy Decision Details

Capture detailed information about why policies passed or failed:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: audit-policy-decisions
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  auditAnnotations:
    - key: "decision.missing-labels"
      valueExpression: |
        ['team', 'environment', 'app'].filter(label,
          !(label in object.metadata.labels)
        ).join(',')
    - key: "decision.unapproved-capabilities"
      valueExpression: |
        object.spec.containers.map(c,
          c.?securityContext.?capabilities.?add.orValue([])
        ).flatten().filter(cap,
          !(cap in ['NET_BIND_SERVICE', 'CHOWN', 'SETUID', 'SETGID'])
        ).join(',')
    - key: "decision.container-images"
      valueExpression: |
        object.spec.containers.map(c, c.image).join(', ')
```

The missing-labels annotation lists exactly which required labels are absent. The unapproved-capabilities annotation shows which dangerous capabilities are being added.

## Creating Compliance Scores

Calculate compliance scores based on multiple checks:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: audit-compliance-score
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  auditAnnotations:
    - key: "compliance.score"
      valueExpression: |
        string(
          int(has(object.metadata.labels.team)) * 10 +
          int(has(object.metadata.labels.owner)) * 10 +
          int(object.spec.containers.all(c,
            has(c.resources) && has(c.resources.limits)
          )) * 20 +
          int(object.spec.containers.all(c,
            has(c.securityContext) && c.securityContext.runAsNonRoot == true
          )) * 30 +
          int(object.spec.containers.all(c,
            has(c.securityContext) &&
            has(c.securityContext.readOnlyRootFilesystem) &&
            c.securityContext.readOnlyRootFilesystem == true
          )) * 30
        ) + '/100'
    - key: "compliance.level"
      valueExpression: |
        int(has(object.metadata.labels.team)) * 10 +
        int(object.spec.containers.all(c, has(c.resources.limits))) * 20 +
        int(object.spec.containers.all(c, c.securityContext.runAsNonRoot == true)) * 30 >= 50
        ? 'passing' : 'failing'
```

This calculates a weighted compliance score and level, enabling tracking of security posture over time.

## Annotating User Information

Capture who created or updated resources:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: audit-user-info
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  auditAnnotations:
    - key: "user.username"
      valueExpression: |
        request.userInfo.username
    - key: "user.groups"
      valueExpression: |
        request.userInfo.?groups.orValue([]).join(',')
    - key: "user.operation"
      valueExpression: |
        request.operation
    - key: "user.namespace"
      valueExpression: |
        object.metadata.namespace
```

These annotations link resource changes to specific users and operations, creating an audit trail for compliance reviews.

## Recording Validation Times

Track policy evaluation performance:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: audit-performance
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  auditAnnotations:
    - key: "performance.validation-timestamp"
      valueExpression: |
        string(request.requestReceivedTimestamp)
    - key: "performance.container-count"
      valueExpression: |
        string(object.spec.containers.size() +
               object.spec.?initContainers.orValue([]).size())
    - key: "performance.total-validations"
      valueExpression: |
        string(object.spec.containers.size() * 5)  # Estimate validations per container
```

Use these annotations to correlate policy complexity with admission latency.

## Querying Audit Logs

Access audit logs to view policy annotations:

```bash
# If using audit log file
sudo tail -f /var/log/kubernetes/audit/audit.log | \
  jq 'select(.annotations | has("resource-limits-check.total-cpu"))'

# If using audit webhook to Elasticsearch
curl -X GET "elasticsearch:9200/k8s-audit-*/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "exists": {
      "field": "annotations.security-check.violation-count"
    }
  }
}'

# Extract specific annotation values
kubectl logs -n kube-system kube-apiserver-* | \
  grep "audit-resource-metadata" | \
  jq '.annotations'
```

Parse audit logs to extract annotation data for dashboards and reports.

## Building Compliance Dashboards

Use audit annotations to create monitoring dashboards:

```yaml
# Prometheus query examples for metrics derived from audit logs
# Count pods with security violations
sum(kube_audit_annotation{key="security-check.violation-count", value!="0"})

# Track compliance scores over time
avg(kube_audit_annotation{key="compliance.score"})

# Monitor missing labels
count(kube_audit_annotation{key="decision.missing-labels", value!=""})
```

Export audit log annotations to your observability stack to visualize policy compliance trends.

## Combining Audit and Deny Actions

Use both audit annotations and enforcement together:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: combined-actions-binding
spec:
  policyName: audit-security-violations
  validationActions: [Audit, Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        environment: production
```

With both actions, the policy denies non-compliant requests but still logs audit annotations for compliant ones, providing full visibility into policy decisions.

## Testing Audit Annotations

Verify annotations appear in audit logs:

```bash
# Create a test pod
kubectl run test-pod --image=nginx:1.21 \
  --labels="team=platform,environment=dev"

# Check audit log for annotations
sudo tail -100 /var/log/kubernetes/audit/audit.log | \
  jq 'select(.verb=="create" and .objectRef.name=="test-pod") | .annotations'

# Expected output shows audit annotation keys and values
{
  "resource-limits-check.total-cpu": "0m",
  "resource-limits-check.total-memory": "0Mi",
  "resource-limits-check.has-limits": "false",
  "metadata.has-owner-label": "false"
}
```

Test policies in audit mode before enforcement to ensure annotations capture the expected data.

## Conclusion

Audit annotations in ValidatingAdmissionPolicy provide policy observability without blocking requests. Use them to track compliance metrics, record policy decisions, and calculate security scores. Capture resource metadata and user information for audit trails, and query audit logs to build compliance dashboards. Start with audit-only policies to understand violation patterns before enforcement, and combine audit annotations with deny actions for full visibility into both compliant and non-compliant requests.

Audit annotations transform admission policies from binary gatekeepers into sources of rich compliance data that drive continuous improvement in your Kubernetes security posture.
