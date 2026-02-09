# How to Implement RBAC Policies That Prevent Binding Cluster-Admin Role to Regular Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security, Cluster-Admin, Access Control

Description: Learn how to implement RBAC policies and admission controls that prevent binding the cluster-admin role to regular users, protecting against privilege escalation attacks.

---

The cluster-admin role grants unrestricted access to all cluster resources. A user with cluster-admin can read all secrets, delete all pods, modify RBAC policies, and compromise the entire cluster. Preventing unauthorized cluster-admin bindings is critical for cluster security.

Kubernetes includes automatic privilege escalation prevention, but defense in depth requires multiple layers. Combine RBAC restrictions, admission webhooks, and audit logging to ensure cluster-admin stays limited to platform administrators and emergency break-glass scenarios.

## Understanding Cluster-Admin Risk

A single cluster-admin binding can bypass all security controls. Common attack scenarios include:

**Malicious Insider**: User with ClusterRoleBinding creation permission grants themselves cluster-admin.

**Compromised Account**: Attacker gains access to an account with RBAC management privileges.

**Misconfiguration**: Administrator accidentally creates overly broad binding during troubleshooting.

**Service Account Compromise**: Pod with cluster-admin ServiceAccount is exploited.

Each scenario leads to full cluster compromise. Prevention requires limiting who can create bindings and what roles can be bound.

## Leveraging Built-In Privilege Escalation Prevention

Kubernetes prevents users from creating RoleBindings or ClusterRoleBindings that grant permissions they do not already have. This is automatic and does not require configuration.

Test the protection:

```bash
# As a user WITHOUT cluster-admin
kubectl create clusterrolebinding test-escalation \
  --clusterrole=cluster-admin \
  --user=myself@company.com \
  --as=limited-user@company.com

# Error: User cannot bind ClusterRole with permissions they do not have
```

The API server checks if the requesting user has all permissions in the target role before allowing the binding creation.

However, this protection only works if the initial RBAC configuration is correct. If a user already has a subset of dangerous permissions, they might still escalate.

## Restricting ClusterRoleBinding Creation

Ensure only platform administrators can create ClusterRoleBindings:

```bash
# Verify default protection
kubectl auth can-i create clusterrolebindings --as=developer@company.com
# Should return: no

kubectl auth can-i create clusterrolebindings --as=platform-admin@company.com
# Should return: yes (if platform-admin has proper role)
```

Review who has ClusterRoleBinding creation permission:

```bash
# Find all roles granting ClusterRoleBinding creation
kubectl get clusterroles -o json | \
  jq -r '.items[] |
  select(.rules[]? |
    select(.apiGroups[]? == "rbac.authorization.k8s.io" and
           .resources[]? == "clusterrolebindings" and
           (.verbs[]? == "create" or .verbs[]? == "*"))) |
  .metadata.name'
```

Expected results:
- `cluster-admin` (full access role)
- `system:*` roles (system components)

Any custom role in this output needs review.

## Implementing Admission Webhook to Block Cluster-Admin Bindings

Create a validating webhook that explicitly blocks cluster-admin bindings to non-admin users:

```python
# cluster-admin-protector.py
from flask import Flask, request, jsonify

app = Flask(__name__)

ALLOWED_CLUSTER_ADMIN_USERS = {
    "admin@company.com",
    "platform-admin@company.com",
}

ALLOWED_CLUSTER_ADMIN_GROUPS = {
    "platform-admins",
    "system:masters",
}

@app.route('/validate-binding', methods=['POST'])
def validate_binding():
    admission_review = request.json
    req = admission_review['request']

    # Only validate ClusterRoleBindings
    if req['resource']['resource'] != 'clusterrolebindings':
        return allow_response(req['uid'])

    binding = req['object']
    role_ref = binding.get('roleRef', {})

    # Check if binding cluster-admin role
    if role_ref.get('name') != 'cluster-admin':
        return allow_response(req['uid'])

    # Check subjects
    subjects = binding.get('subjects', [])
    for subject in subjects:
        if subject.get('kind') == 'User':
            if subject.get('name') not in ALLOWED_CLUSTER_ADMIN_USERS:
                return deny_response(
                    req['uid'],
                    f"User {subject.get('name')} is not authorized for cluster-admin role"
                )

        if subject.get('kind') == 'Group':
            if subject.get('name') not in ALLOWED_CLUSTER_ADMIN_GROUPS:
                return deny_response(
                    req['uid'],
                    f"Group {subject.get('name')} is not authorized for cluster-admin role"
                )

        if subject.get('kind') == 'ServiceAccount':
            # Generally prohibit cluster-admin for ServiceAccounts
            return deny_response(
                req['uid'],
                f"ServiceAccounts cannot be bound to cluster-admin role"
            )

    return allow_response(req['uid'])

def allow_response(uid):
    return jsonify({
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": uid,
            "allowed": True
        }
    })

def deny_response(uid, message):
    return jsonify({
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": uid,
            "allowed": False,
            "status": {
                "message": message
            }
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8443, ssl_context='adhoc')
```

Deploy the webhook:

```yaml
# cluster-admin-protector-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: cluster-admin-protector
webhooks:
- name: cluster-admin.protector.example.com
  clientConfig:
    service:
      name: cluster-admin-protector
      namespace: kube-system
      path: "/validate-binding"
    caBundle: <BASE64_ENCODED_CA_CERT>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["rbac.authorization.k8s.io"]
    apiVersions: ["v1"]
    resources: ["clusterrolebindings"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail  # Block on webhook failure for security
```

Apply the webhook configuration:

```bash
kubectl apply -f cluster-admin-protector-webhook.yaml
```

Now attempts to bind cluster-admin to unauthorized users are blocked at admission time, regardless of RBAC permissions.

## Monitoring Cluster-Admin Binding Attempts

Enable audit logging for ClusterRoleBinding operations:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all ClusterRoleBinding changes at RequestResponse level
- level: RequestResponse
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["clusterrolebindings"]
  verbs: ["create", "update", "patch", "delete"]

# Log failed attempts specifically
- level: Metadata
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["clusterrolebindings"]
  omitStages:
  - RequestReceived
  responseStatus:
    code: 403
```

Query for unauthorized attempts:

```bash
# Find failed ClusterRoleBinding creations
jq 'select(.objectRef.resource=="clusterrolebindings" and
           .verb=="create" and
           .responseStatus.code==403)' \
  /var/log/kubernetes/audit.log

# Find cluster-admin binding attempts
jq 'select(.objectRef.resource=="clusterrolebindings" and
           .requestObject.roleRef.name=="cluster-admin")' \
  /var/log/kubernetes/audit.log
```

Alert on suspicious activity:

```yaml
# Prometheus alert
- alert: ClusterAdminBindingAttempt
  expr: |
    apiserver_audit_event_total{
      objectRef_resource="clusterrolebindings",
      verb="create",
      requestObject_roleRef_name="cluster-admin",
      responseStatus_code="403"
    } > 0
  annotations:
    summary: "Unauthorized cluster-admin binding attempt detected"
```

## Restricting ServiceAccount Cluster-Admin Bindings

ServiceAccounts with cluster-admin create major security risks. If a pod is compromised, the attacker gains full cluster access.

Audit existing ServiceAccount cluster-admin bindings:

```bash
# Find ServiceAccounts with cluster-admin
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.roleRef.name=="cluster-admin") |
  select(.subjects[]?.kind=="ServiceAccount") |
  {binding: .metadata.name, sa: .subjects[]?}'
```

Review each binding. Common legitimate uses:

- Cluster operators (e.g., cluster-autoscaler)
- Installation tools (Helm, Terraform operators)

Remediate unnecessary bindings:

```bash
# Replace cluster-admin with narrower permissions
kubectl delete clusterrolebinding problematic-sa-binding

# Create custom role with required permissions only
kubectl create clusterrole sa-custom-role --verb=get,list --resource=pods,services

kubectl create clusterrolebinding sa-custom-binding \
  --clusterrole=sa-custom-role \
  --serviceaccount=default:my-sa
```

## Implementing Break-Glass Emergency Access

For emergencies, implement controlled cluster-admin access:

```bash
#!/bin/bash
# grant-emergency-cluster-admin.sh

INCIDENT_ID=$1
USER_EMAIL=$2
APPROVER=$3

if [ -z "$INCIDENT_ID" ] || [ -z "$USER_EMAIL" ] || [ -z "$APPROVER" ]; then
  echo "Usage: $0 <incident-id> <user-email> <approver-email>"
  exit 1
fi

echo "Creating emergency cluster-admin access"
echo "Incident: $INCIDENT_ID"
echo "User: $USER_EMAIL"
echo "Approved by: $APPROVER"

# Create binding with audit annotations
kubectl create clusterrolebinding "emergency-${INCIDENT_ID}" \
  --clusterrole=cluster-admin \
  --user="$USER_EMAIL" \
  --dry-run=client -o yaml | \
  kubectl annotate -f - \
    incident-id="$INCIDENT_ID" \
    approved-by="$APPROVER" \
    granted-at="$(date -Iseconds)" \
    --local -o yaml | \
  kubectl apply -f -

# Log to audit trail
echo "$(date) | GRANT | $INCIDENT_ID | $USER_EMAIL | $APPROVER" >> /var/log/emergency-access.log

echo "Access granted. Auto-revoke in 4 hours."

# Auto-revoke after 4 hours
(sleep 14400 && \
  kubectl delete clusterrolebinding "emergency-${INCIDENT_ID}" && \
  echo "$(date) | REVOKE | $INCIDENT_ID | AUTO" >> /var/log/emergency-access.log) &
```

Use during critical incidents:

```bash
./grant-emergency-cluster-admin.sh INC-12345 oncall@company.com manager@company.com
```

Manual revocation:

```bash
kubectl delete clusterrolebinding emergency-INC-12345
echo "$(date) | REVOKE | INC-12345 | MANUAL" >> /var/log/emergency-access.log
```

## Regular RBAC Audits

Schedule periodic reviews of cluster-admin bindings:

```bash
#!/bin/bash
# audit-cluster-admin-bindings.sh

echo "=== Cluster-Admin Audit Report ==="
echo "Generated: $(date)"
echo ""

echo "### Current Cluster-Admin Bindings ###"
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.roleRef.name=="cluster-admin") |
  "\(.metadata.name) | \(.subjects[]?.kind) | \(.subjects[]?.name // .subjects[]?.namespace + "/" + .subjects[]?.name)"'

echo ""
echo "### Emergency Bindings ###"
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
  select(.metadata.name | startswith("emergency-")) |
  "\(.metadata.name) | Created: \(.metadata.creationTimestamp) | User: \(.subjects[]?.name)"'

echo ""
echo "### Action Required ###"
echo "1. Verify each binding is still necessary"
echo "2. Revoke any temporary emergency bindings"
echo "3. Investigate unknown bindings"
```

Run monthly:

```bash
./audit-cluster-admin-bindings.sh > cluster-admin-audit-$(date +%Y%m).txt
```

## Educating Teams on Least Privilege

Document approved alternative patterns:

```markdown
# RBAC Best Practices

## ❌ Never Use Cluster-Admin
```bash
kubectl create clusterrolebinding dev-admin \
  --clusterrole=cluster-admin \
  --user=developer@company.com
```

## ✅ Use Namespace-Scoped Roles
```bash
kubectl create rolebinding dev-admin \
  --clusterrole=admin \
  --user=developer@company.com \
  --namespace=development
```

## ✅ Create Custom Roles with Minimal Permissions
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployment-manager
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]
```
```

Train teams during onboarding to avoid requesting cluster-admin.

Preventing cluster-admin bindings requires multiple defensive layers. Built-in privilege escalation prevention provides baseline protection. Admission webhooks enforce policy at admission time. Audit logging and monitoring detect unauthorized attempts. Break-glass procedures handle emergencies without permanent excessive permissions. Together, these controls ensure cluster-admin remains restricted to legitimate platform administrators.
