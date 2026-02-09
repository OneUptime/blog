# How to Build RBAC Policies That Enforce Service Account Usage Instead of User Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, ServiceAccount, Security, Authentication

Description: Learn how to implement RBAC policies and admission controls that enforce ServiceAccount usage for workloads instead of user credentials, improving security and auditability.

---

Applications running in Kubernetes should use ServiceAccount credentials, not user credentials. ServiceAccounts have well-defined scopes, can be easily rotated, and provide clear audit trails. User credentials in pods create security risks. If a pod is compromised, the attacker gains access with the user's full permissions across the cluster.

Enforcing ServiceAccount usage requires both technical controls and organizational policies. RBAC determines what ServiceAccounts can do. Admission controls prevent pods from using user credentials. Together, these mechanisms ensure all workloads use appropriate ServiceAccount identities.

## Understanding the Security Risk of User Credentials in Pods

Embedding user credentials in pods creates several problems:

**Excessive Permissions**: Users typically have broader permissions than a specific application needs. A compromised pod gains all user permissions.

**Credential Sprawl**: User credentials stored in secrets can be difficult to track and rotate. Multiple pods might reference the same user token.

**Poor Auditability**: Audit logs show the user, not which pod performed an action. This obscures the true source of API calls.

**No Namespace Isolation**: User permissions span multiple namespaces. A compromised pod in one namespace can access resources in others.

ServiceAccounts solve these issues by providing pod-specific, namespace-scoped identities with minimal required permissions.

## Creating ServiceAccounts for Applications

Each application should have its own ServiceAccount:

```bash
# Create ServiceAccount for an application
kubectl create serviceaccount my-app -n production
```

Define a role with minimal permissions:

```yaml
# my-app-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-app-role
  namespace: production
rules:
# Only permissions the app needs
- apiGroups: [""]
  resources:
    - configmaps
  verbs: ["get", "list"]
  resourceNames:
    - my-app-config

- apiGroups: [""]
  resources:
    - secrets
  verbs: ["get"]
  resourceNames:
    - my-app-secrets
```

Bind the role to the ServiceAccount:

```bash
kubectl apply -f my-app-role.yaml

kubectl create rolebinding my-app-binding \
  --role=my-app-role \
  --serviceaccount=production:my-app \
  --namespace=production
```

Use the ServiceAccount in deployments:

```yaml
# my-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app  # Use dedicated ServiceAccount
      containers:
      - name: app
        image: company/my-app:v1.0
```

The application automatically receives a ServiceAccount token mounted at `/var/run/secrets/kubernetes.io/serviceaccount/token`.

## Detecting Pods Using User Credentials

Scan for pods that might be using user credentials:

```bash
# Find pods with secret volumes not named serviceaccount
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
  select(.spec.volumes[]? |
    select(.secret? and .secret.secretName? and
           (.secret.secretName | startswith("default-token-") | not) and
           (.secret.secretName | endswith("-token") | not))) |
  "\(.metadata.namespace)/\(.metadata.name): \(.spec.volumes[] | select(.secret?) | .secret.secretName)"'
```

Check for environment variables referencing user tokens:

```bash
# Find pods with env vars from secrets
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
  select(.spec.containers[].env[]? | select(.valueFrom?.secretKeyRef?)) |
  "\(.metadata.namespace)/\(.metadata.name)"'
```

Review these pods to determine if they are using user credentials inappropriately.

## Implementing Admission Control to Block User Credentials

Create a validating webhook that enforces ServiceAccount usage:

```python
# serviceaccount-enforcer.py
from flask import Flask, request, jsonify

app = Flask(__name__)

EXEMPT_NAMESPACES = {"kube-system", "kube-public"}

@app.route('/validate-pod', methods=['POST'])
def validate_pod():
    admission_review = request.json
    req = admission_review['request']
    pod = req['object']

    namespace = pod['metadata']['namespace']

    # Exempt system namespaces
    if namespace in EXEMPT_NAMESPACES:
        return allow_response(req['uid'])

    # Check if pod uses default ServiceAccount
    sa_name = pod['spec'].get('serviceAccountName', 'default')

    if sa_name == 'default':
        return deny_response(
            req['uid'],
            "Pods must use a dedicated ServiceAccount, not 'default'. "
            "Create a ServiceAccount for your application."
        )

    # Check for suspicious secret mounts
    volumes = pod['spec'].get('volumes', [])
    for volume in volumes:
        if 'secret' in volume:
            secret_name = volume['secret'].get('secretName', '')

            # Allow ServiceAccount tokens
            if 'token' in secret_name:
                continue

            # Check if secret might be user credentials
            suspicious_keywords = ['kubeconfig', 'user', 'admin', 'credential']
            if any(keyword in secret_name.lower() for keyword in suspicious_keywords):
                return deny_response(
                    req['uid'],
                    f"Secret '{secret_name}' appears to contain user credentials. "
                    f"Use ServiceAccount tokens instead."
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

Deploy and register the webhook:

```yaml
# serviceaccount-enforcer-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: serviceaccount-enforcer
webhooks:
- name: serviceaccount.enforcer.example.com
  clientConfig:
    service:
      name: serviceaccount-enforcer
      namespace: kube-system
      path: "/validate-pod"
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  namespaceSelector:
    matchExpressions:
    - key: enforce-serviceaccount
      operator: In
      values: ["true"]
```

Enable enforcement in target namespaces:

```bash
kubectl label namespace production enforce-serviceaccount=true
kubectl label namespace staging enforce-serviceaccount=true
```

Now pods in these namespaces must use dedicated ServiceAccounts.

## Disabling ServiceAccount Token Auto-Mounting

For pods that do not need Kubernetes API access, disable auto-mounting:

```yaml
# pod-without-api-access.yaml
apiVersion: v1
kind: Pod
metadata:
  name: static-web
  namespace: production
spec:
  serviceAccountName: static-web-sa
  automountServiceAccountToken: false  # Disable token mount
  containers:
  - name: nginx
    image: nginx
```

Or disable at ServiceAccount level:

```yaml
# no-automount-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: static-web-sa
  namespace: production
automountServiceAccountToken: false
```

This prevents pods from accessing the Kubernetes API even if they try.

## Auditing ServiceAccount Usage

Track which ServiceAccounts are making API calls:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all ServiceAccount API access
- level: Metadata
  users:
    - "system:serviceaccount:*"
  omitStages:
  - RequestReceived

# Log pod creation to see ServiceAccount assignments
- level: Metadata
  resources:
  - group: ""
    resources: ["pods"]
  verbs: ["create"]
```

Query for user credential usage:

```bash
# Find API calls NOT from ServiceAccounts or system components
jq 'select(.user.username | startswith("system:serviceaccount:") | not) |
    select(.user.username | startswith("system:") | not) |
    {user: .user.username, verb: .verb, resource: .objectRef.resource}' \
  /var/log/kubernetes/audit.log
```

This reveals users making direct API calls instead of using ServiceAccounts.

## Creating ServiceAccount Management Policies

Document ServiceAccount best practices:

```markdown
# ServiceAccount Guidelines

## Creating ServiceAccounts

1. **One ServiceAccount per Application**: Do not share ServiceAccounts between applications
2. **Descriptive Names**: Use format `<app-name>-<purpose>`, e.g., `payment-api-app`
3. **Namespace Scoped**: Create ServiceAccounts in application namespaces
4. **Minimal Permissions**: Grant only required permissions via Roles

## RBAC Configuration

```yaml
# Create ServiceAccount
kubectl create sa my-app -n production

# Create Role with minimal permissions
kubectl create role my-app-role \
  --verb=get,list \
  --resource=configmaps \
  --namespace=production

# Bind Role to ServiceAccount
kubectl create rolebinding my-app-binding \
  --role=my-app-role \
  --serviceaccount=production:my-app \
  --namespace=production
```

## Using in Deployments

```yaml
spec:
  serviceAccountName: my-app
  containers:
  - name: app
    image: my-app:v1
```

## ❌ Do NOT

- Use user credentials in pods
- Mount kubeconfig files as secrets
- Share ServiceAccounts across teams
- Use the `default` ServiceAccount for applications
```

## Rotating ServiceAccount Tokens

Kubernetes 1.24+ uses time-bound tokens that rotate automatically. For older clusters or long-lived tokens:

```bash
# Create a time-bound token (expires after 1 hour)
kubectl create token my-app -n production --duration=1h

# For long-lived tokens (not recommended), create a Secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: my-app-token
  namespace: production
  annotations:
    kubernetes.io/service-account.name: my-app
type: kubernetes.io/service-account-token
EOF
```

Rotate regularly:

```bash
# Delete old token secret
kubectl delete secret my-app-token -n production

# Create new one
kubectl create secret generic my-app-token \
  --from-literal=token=$(kubectl create token my-app -n production --duration=8760h) \
  -n production
```

## Monitoring ServiceAccount Permissions

Create alerts for suspicious ServiceAccount activity:

```yaml
# Prometheus alert
- alert: ServiceAccountEscalation
  expr: |
    apiserver_audit_event_total{
      user=~"system:serviceaccount:.*",
      verb="create",
      objectRef_resource=~"roles|rolebindings|clusterroles|clusterrolebindings"
    } > 0
  annotations:
    summary: "ServiceAccount attempting RBAC modifications"

- alert: ServiceAccountSecretAccess
  expr: |
    rate(apiserver_audit_event_total{
      user=~"system:serviceaccount:.*",
      objectRef_resource="secrets",
      verb="get"
    }[5m]) > 10
  annotations:
    summary: "ServiceAccount accessing secrets frequently"
```

## Transitioning from User Credentials to ServiceAccounts

Migrate existing workloads:

```bash
#!/bin/bash
# migrate-to-serviceaccounts.sh

NAMESPACE=$1

if [ -z "$NAMESPACE" ]; then
  echo "Usage: $0 <namespace>"
  exit 1
fi

echo "Analyzing pods in $NAMESPACE..."

# Find pods using default ServiceAccount
DEFAULT_SA_PODS=$(kubectl get pods -n $NAMESPACE -o json | \
  jq -r '.items[] |
  select(.spec.serviceAccountName == "default" or .spec.serviceAccountName == null) |
  .metadata.name')

if [ -z "$DEFAULT_SA_PODS" ]; then
  echo "No pods using default ServiceAccount"
  exit 0
fi

echo "Pods using default ServiceAccount:"
echo "$DEFAULT_SA_PODS"

# For each unique deployment
kubectl get deployments -n $NAMESPACE -o json | \
  jq -r '.items[] | .metadata.name' | while read deployment; do

  echo "Processing deployment: $deployment"

  # Create dedicated ServiceAccount
  kubectl create sa $deployment -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

  # Update deployment to use new ServiceAccount
  kubectl patch deployment $deployment -n $NAMESPACE \
    -p "{\"spec\":{\"template\":{\"spec\":{\"serviceAccountName\":\"$deployment\"}}}}"

  echo "Updated $deployment to use ServiceAccount: $deployment"
done
```

Run the migration:

```bash
./migrate-to-serviceaccounts.sh production
```

Enforcing ServiceAccount usage for workloads improves security through least-privilege access, better auditability, and reduced credential sprawl. Admission webhooks prevent pods from using user credentials, while automated audits ensure compliance. By making ServiceAccounts the standard for pod authentication, you create a more secure and maintainable Kubernetes environment.
