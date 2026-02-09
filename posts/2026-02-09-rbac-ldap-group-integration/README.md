# How to Configure RBAC RoleBindings with Subject Groups for LDAP Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, LDAP, Authentication, Groups

Description: Learn how to configure Kubernetes RBAC RoleBindings that reference LDAP groups, enabling centralized access control managed through your existing identity provider.

---

Managing Kubernetes RBAC by individual users becomes unmanageable as teams grow. Every time someone joins or leaves, you need to update RoleBindings across multiple namespaces and clusters. Integrating Kubernetes RBAC with LDAP groups centralizes access management. Add a user to an LDAP group and they automatically get Kubernetes permissions. Remove them from the group and access is immediately revoked.

LDAP integration requires configuring the Kubernetes API server to authenticate against your LDAP directory and extract group memberships. Once configured, RoleBindings reference LDAP groups instead of individual users, making permissions management scalable and maintainable.

## Understanding Kubernetes LDAP Authentication

Kubernetes does not include built-in LDAP support. You need to configure an authentication webhook or use an authentication proxy that handles LDAP validation. Common approaches include:

**OIDC Integration**: Use an OIDC provider like Keycloak or Dex that federates with LDAP. The OIDC token includes group claims that Kubernetes recognizes.

**Webhook Token Authentication**: Deploy a webhook that validates tokens and returns user information including groups.

**Authentication Proxy**: Use a proxy like kube-oidc-proxy or Pinniped that sits in front of the API server.

This guide focuses on OIDC integration with LDAP, as it is the most common and maintainable approach.

## Setting Up Dex for LDAP Federation

Dex is an OIDC provider that federates with LDAP. Deploy Dex in your cluster:

```yaml
# dex-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dex
  namespace: auth
data:
  config.yaml: |
    issuer: https://dex.company.com

    storage:
      type: kubernetes
      config:
        inCluster: true

    web:
      http: 0.0.0.0:5556

    connectors:
    - type: ldap
      id: ldap
      name: LDAP
      config:
        host: ldap.company.com:636

        # Credentials for connecting to LDAP
        bindDN: cn=service-account,dc=company,dc=com
        bindPW: password123

        # User search configuration
        userSearch:
          baseDN: ou=users,dc=company,dc=com
          filter: "(objectClass=person)"
          username: uid
          idAttr: DN
          emailAttr: mail
          nameAttr: cn

        # Group search configuration
        groupSearch:
          baseDN: ou=groups,dc=company,dc=com
          filter: "(objectClass=groupOfNames)"
          userAttr: DN
          groupAttr: member
          nameAttr: cn

    oauth2:
      skipApprovalScreen: true

    staticClients:
    - id: kubernetes
      redirectURIs:
      - http://localhost:8000
      - http://localhost:18000
      name: 'Kubernetes'
      secret: kubernetes-client-secret
```

Deploy Dex:

```bash
kubectl create namespace auth
kubectl apply -f dex-config.yaml
kubectl apply -f dex-deployment.yaml  # Standard Dex deployment
```

## Configuring Kubernetes API Server for OIDC

Add OIDC flags to your Kubernetes API server configuration. For kubeadm clusters, edit `/etc/kubernetes/manifests/kube-apiserver.yaml`:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --oidc-issuer-url=https://dex.company.com
    - --oidc-client-id=kubernetes
    - --oidc-username-claim=email
    - --oidc-groups-claim=groups
    - --oidc-groups-prefix=ldap:  # Prefix for LDAP groups
    # ... other flags
```

For managed Kubernetes (EKS, GKE, AKS), use the platform-specific OIDC configuration options.

Restart the API server:

```bash
sudo systemctl restart kubelet
```

Verify OIDC configuration:

```bash
kubectl cluster-info dump | grep oidc
```

## Creating RoleBindings with LDAP Groups

Once OIDC is configured, create RoleBindings that reference LDAP groups:

```yaml
# developers-rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-edit
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: ldap:developers  # LDAP group with prefix
  apiGroup: rbac.authorization.k8s.io
```

Apply the binding:

```bash
kubectl apply -f developers-rolebinding.yaml
```

Users in the `developers` LDAP group now have edit permissions in the development namespace.

For cluster-wide access:

```yaml
# sre-clusterrolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sre-cluster-view
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: Group
  name: ldap:sre-team
  apiGroup: rbac.authorization.k8s.io
```

## Testing LDAP Group Authentication

Get an OIDC token from Dex using kubectl-oidc-login plugin:

```bash
# Install kubectl-oidc-login
kubectl krew install oidc-login

# Configure kubeconfig
kubectl config set-credentials oidc \
  --exec-api-version=client.authentication.k8s.io/v1beta1 \
  --exec-command=kubectl \
  --exec-arg=oidc-login \
  --exec-arg=get-token \
  --exec-arg=--oidc-issuer-url=https://dex.company.com \
  --exec-arg=--oidc-client-id=kubernetes \
  --exec-arg=--oidc-client-secret=kubernetes-client-secret

# Use the OIDC user
kubectl config set-context oidc --cluster=production --user=oidc
kubectl config use-context oidc
```

Test access:

```bash
# Should succeed if user is in developers group
kubectl get pods -n development

# Should fail if user is not in sre-team group
kubectl get nodes
```

## Mapping Multiple LDAP Groups to Kubernetes Roles

Create multiple RoleBindings for different access levels:

```yaml
# Team access patterns
---
# Junior developers - view only
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: junior-devs-view
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: Group
  name: ldap:junior-developers
  apiGroup: rbac.authorization.k8s.io
---
# Senior developers - edit access
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: senior-devs-edit
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: ldap:senior-developers
  apiGroup: rbac.authorization.k8s.io
---
# Team leads - admin access
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: leads-admin
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admin
subjects:
- kind: Group
  name: ldap:team-leads
  apiGroup: rbac.authorization.k8s.io
```

Apply all bindings:

```bash
kubectl apply -f team-access-patterns.yaml
```

## Handling Nested LDAP Groups

Some LDAP directories use nested groups (groups within groups). Ensure your LDAP connector flattens group memberships:

```yaml
# dex-config.yaml with nested group support
connectors:
- type: ldap
  config:
    # ... other config
    groupSearch:
      baseDN: ou=groups,dc=company,dc=com
      filter: "(objectClass=groupOfNames)"
      userAttr: DN
      groupAttr: member
      nameAttr: cn
      # Enable nested group lookups (Dex-specific feature)
      # Note: This may require LDAP server support
```

Test nested groups:

```bash
# LDAP structure:
# - all-developers (parent)
#   - frontend-developers (child)
#   - backend-developers (child)

# User in frontend-developers should match RoleBindings for both groups
```

## Automating RoleBinding Creation for New Teams

Create a script that generates RoleBindings when new LDAP groups are created:

```bash
#!/bin/bash
# create-team-rbac.sh

LDAP_GROUP=$1
NAMESPACE=$2

if [ -z "$LDAP_GROUP" ] || [ -z "$NAMESPACE" ]; then
  echo "Usage: $0 <ldap-group> <namespace>"
  exit 1
fi

# Create namespace if it doesn't exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Create RoleBinding
kubectl create rolebinding "${LDAP_GROUP}-edit" \
  --clusterrole=edit \
  --group="ldap:${LDAP_GROUP}" \
  --namespace="$NAMESPACE"

echo "Created RoleBinding for LDAP group ldap:${LDAP_GROUP} in namespace ${NAMESPACE}"
```

Use it when onboarding teams:

```bash
./create-team-rbac.sh team-charlie team-charlie-namespace
```

## Syncing LDAP Groups to Kubernetes

For better visibility, periodically sync LDAP groups to Kubernetes:

```python
# ldap-group-sync.py
import ldap
import kubernetes

def get_ldap_groups():
    """Fetch all groups from LDAP"""
    conn = ldap.initialize('ldap://ldap.company.com')
    conn.simple_bind_s('cn=service-account,dc=company,dc=com', 'password')

    result = conn.search_s(
        'ou=groups,dc=company,dc=com',
        ldap.SCOPE_SUBTREE,
        '(objectClass=groupOfNames)',
        ['cn']
    )

    groups = [entry[1]['cn'][0].decode('utf-8') for entry in result]
    return groups

def sync_to_kubernetes():
    """Create ConfigMap with LDAP groups"""
    groups = get_ldap_groups()

    # Store in ConfigMap for reference
    configmap = {
        'apiVersion': 'v1',
        'kind': 'ConfigMap',
        'metadata': {
            'name': 'ldap-groups',
            'namespace': 'auth'
        },
        'data': {
            'groups': '\n'.join(groups)
        }
    }

    # Apply to cluster
    k8s_client = kubernetes.client.ApiClient()
    kubernetes.client.CoreV1Api(k8s_client).create_namespaced_config_map(
        namespace='auth',
        body=configmap
    )

if __name__ == '__main__':
    sync_to_kubernetes()
```

Run periodically as a CronJob:

```yaml
# ldap-sync-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ldap-group-sync
  namespace: auth
spec:
  schedule: "0 * * * *"  # Every hour
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: sync
            image: company/ldap-sync:latest
            command: ["python", "ldap-group-sync.py"]
          restartPolicy: OnFailure
```

## Troubleshooting LDAP Group Authentication

Common issues and solutions:

**Groups not appearing in token**:
```bash
# Verify Dex is extracting groups
kubectl logs -n auth -l app=dex | grep groups

# Check OIDC token claims
kubectl oidc-login get-token --oidc-issuer-url=https://dex.company.com | \
  jq -R 'split(".") | .[1] | @base64d | fromjson'
```

**Wrong group prefix**:
```bash
# Check API server configuration
kubectl cluster-info dump | grep oidc-groups-prefix

# Ensure RoleBindings use matching prefix
kubectl get rolebindings -A -o yaml | grep "name: ldap:"
```

**User not in expected group**:
```bash
# Verify LDAP membership
ldapsearch -x -H ldap://ldap.company.com \
  -D "cn=service-account,dc=company,dc=com" \
  -w password \
  -b "ou=groups,dc=company,dc=com" \
  "(member=uid=user,ou=users,dc=company,dc=com)"
```

## Auditing LDAP Group Access

Track which LDAP groups are accessing resources:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  omitStages:
  - RequestReceived
  userGroups:
  - "ldap:*"  # All LDAP groups
```

Analyze group usage:

```bash
# Find most active LDAP groups
jq 'select(.user.groups[]? | startswith("ldap:")) |
    .user.groups[]' \
    /var/log/kubernetes/audit.log | \
  sort | uniq -c | sort -rn
```

Integrating Kubernetes RBAC with LDAP groups provides centralized, scalable access management. Users get automatic Kubernetes permissions based on their LDAP group memberships, eliminating manual RoleBinding updates for every personnel change. This approach works well for organizations with established LDAP infrastructure and reduces the operational burden of managing Kubernetes access control.
