# How to Secure Dynamic Exporter Configuration in Cilium Hubble

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Hubble, Dynamic Exporter, Security, RBAC

Description: Learn how to secure the Cilium Hubble dynamic exporter by restricting ConfigMap access, validating export rules, and preventing unauthorized data collection.

---

## Introduction

The dynamic exporter ConfigMap is a powerful control point in Cilium. Anyone who can modify it can change what network flow data is collected and where it is written. An attacker with ConfigMap write access could silently add an exporter that captures all L7 traffic to a file they can later exfiltrate, or they could remove security-focused exporters to create monitoring blind spots.

Securing the dynamic exporter means controlling who can modify the ConfigMap, validating that export rules conform to your data governance policies, and auditing all changes to the exporter configuration.

This guide covers the security controls needed to use the dynamic exporter safely in production.

## Prerequisites

- Kubernetes cluster with Cilium and Hubble dynamic exporter enabled
- kubectl with cluster-admin access for RBAC configuration
- Understanding of Kubernetes RBAC
- Admission controller (Kyverno or OPA Gatekeeper) for policy enforcement
- yq for the local validation commands that inspect `flowlogs.yaml`

## Restricting ConfigMap Access with RBAC

The dynamic exporter ConfigMap should only be modifiable by authorized personnel:

```yaml
# dynamic-exporter-rbac.yaml

apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: hubble-export-manager
  namespace: kube-system
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["cilium-flowlog-config"]
    verbs: ["get", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: hubble-export-manager-binding
  namespace: kube-system
subjects:
  - kind: Group
    name: security-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: hubble-export-manager
  apiGroup: rbac.authorization.k8s.io
---
# Read-only access for auditors
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: hubble-export-viewer
  namespace: kube-system
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["cilium-flowlog-config"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: hubble-export-viewer-binding
  namespace: kube-system
subjects:
  - kind: Group
    name: auditors
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: hubble-export-viewer
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f dynamic-exporter-rbac.yaml

# Verify access restrictions
kubectl auth can-i update configmaps/cilium-flowlog-config \
  -n kube-system --as=system:serviceaccount:default:default
# Should return "no"
```

## Validating Export Rules with Admission Control

Use an admission webhook to validate export rules before they are applied:

```yaml
# kyverno-export-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: validate-hubble-export-config
spec:
  background: false
  rules:
    - name: validate-export-rules
      match:
        any:
          - resources:
              kinds:
                - ConfigMap
              namespaces:
                - kube-system
              names:
                - cilium-flowlog-config
      validate:
        failureAction: Enforce
        message: "Hubble export rules must include field masks, write to the approved path, and must not export L7 data"
        foreach:
          - list: "request.object.data.\"flowlogs.yaml\" | parse_yaml(@).flowLogs"
            deny:
              conditions:
                any:
                  # Every rule must have a field mask
                  - key: "{{ length(element.fieldMask || `[]`) }}"
                    operator: Equals
                    value: 0
                  # Every rule must write under the approved directory
                  - key: "{{ pattern_match('/var/run/cilium/hubble/*', element.filePath || '') }}"
                    operator: Equals
                    value: false
                  # Do not export full L7 records
                  - key: "{{ contains(element.fieldMask || `[]`, 'l7') }}"
                    operator: Equals
                    value: true
```

```bash
kubectl apply -f kyverno-export-policy.yaml
```

```mermaid
graph TD
    A[ConfigMap Update Request] --> B[Kyverno Admission Webhook]
    B --> C{Has field mask?}
    C -->|No| D[DENIED: Missing field mask]
    C -->|Yes| E{Exports to allowed path?}
    E -->|No| F[DENIED: Invalid file path]
    E -->|Yes| G{Filters meet policy?}
    G -->|No| H[DENIED: Policy violation]
    G -->|Yes| I[ALLOWED: ConfigMap updated]
    I --> J[Cilium picks up change]
```

## Auditing Dynamic Exporter Changes

Track all modifications to the exporter ConfigMap:

```yaml
# audit-policy-dynamic-export.yaml (kube-apiserver audit policy section)
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["configmaps"]
    namespaces: ["kube-system"]
    verbs: ["create", "update", "patch", "delete"]
    omitStages:
      - RequestReceived
```

```bash
# Check recent audit events for the ConfigMap
grep "cilium-flowlog-config" /var/log/kubernetes/audit/audit.log | tail -10

# Create a Prometheus alert for ConfigMap changes
```

```yaml
# export-config-change-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hubble-export-config-alerts
  namespace: monitoring
spec:
  groups:
    - name: hubble-dynamic-export
      rules:
        - alert: HubbleExportConfigChanged
          expr: |
            changes(kube_configmap_metadata_resource_version{namespace="kube-system",configmap="cilium-flowlog-config"}[5m]) > 0
          for: 0m
          labels:
            severity: info
          annotations:
            summary: "Hubble dynamic export configuration was modified"
```

## Preventing Unauthorized Data Collection

Ensure dynamic exporters cannot be used to capture data outside approved boundaries:

```bash
# Regular audit: check all active export rules
kubectl -n kube-system get configmap cilium-flowlog-config -o jsonpath='{.data.flowlogs\.yaml}' | yq -o=json '.flowLogs[]' - | python3 -c "
import json, sys

ALLOWED_PATHS_PREFIX = '/var/run/cilium/hubble/'
FORBIDDEN_FIELDS = {'l7'}

for line in sys.stdin:
    try:
        cfg = json.loads(line)
        name = cfg.get('name', '<unnamed>')

        # Check file path
        path = cfg.get('filePath', '')
        if not path.startswith(ALLOWED_PATHS_PREFIX):
            print(f'VIOLATION {name}: file path outside allowed directory: {path}')

        # Check field mask for sensitive fields
        mask = set(cfg.get('fieldMask', []))
        forbidden = mask.intersection(FORBIDDEN_FIELDS)
        if forbidden:
            print(f'VIOLATION {name}: exports sensitive fields: {forbidden}')

        # Check if there is no field mask (exports everything)
        if not mask:
            print(f'WARNING {name}: no field mask - exports all fields')

        # Check for missing expiration
        if 'end' not in cfg:
            print(f'WARNING {name}: no expiration set')

    except json.JSONDecodeError:
        print('ERROR: invalid flow log entry')
"
```

## Verification

Confirm security controls are in place:

```bash
# 1. RBAC prevents unauthorized access
kubectl auth can-i update configmaps -n kube-system \
  --as=system:serviceaccount:default:default
# Should return "no"

# 2. Admission policy is active
kubectl get clusterpolicy validate-hubble-export-config -o jsonpath='{.status.conditions}' 2>/dev/null | python3 -m json.tool

# 3. All current rules pass validation
kubectl -n kube-system get configmap cilium-flowlog-config -o jsonpath='{.data.flowlogs\.yaml}' | yq -o=json '.flowLogs[]' - | python3 -c "
import json, sys
for line in sys.stdin:
    cfg = json.loads(line)
    name = cfg.get('name', '<unnamed>')
    has_mask = bool(cfg.get('fieldMask'))
    has_path = cfg.get('filePath','').startswith('/var/run/cilium/hubble/')
    print(f'{name}: mask={has_mask}, valid_path={has_path}')
"

# 4. Audit trail exists
echo "Check your audit log system for recent changes to cilium-flowlog-config"
```

## Troubleshooting

- **Admission webhook blocks legitimate updates**: Check the policy rules carefully. You may need to adjust the validation conditions. Test changes in a staging cluster first.

- **Cilium does not pick up ConfigMap changes**: The Helm chart mounts `cilium-flowlog-config` into the Cilium agent pods when `hubble.export.dynamic.enabled=true`. Confirm that the ConfigMap exists, is mounted in the DaemonSet, and that the updated `flowlogs.yaml` is present in the agent pod.

- **Audit logs not showing ConfigMap changes**: Ensure the audit policy is loaded by the kube-apiserver. Check the apiserver flags for `--audit-policy-file` and `--audit-log-path` or `--audit-webhook-config-file`.

- **Unauthorized exporter found**: Remove it immediately from the ConfigMap and investigate who created it through audit logs. Tighten RBAC if needed.

## Conclusion

The dynamic exporter ConfigMap is a sensitive control point that requires proper security governance. RBAC restricts who can modify export rules, admission webhooks validate that rules conform to policy, and audit logging tracks all changes. Together, these controls allow you to use the dynamic exporter's flexibility while preventing unauthorized data collection. Regular audits of active export rules should be part of your security operations routine.
