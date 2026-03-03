# How to Configure LDAP Authentication for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, LDAP, Authentication, Kubernetes, Active Directory, Security

Description: Learn how to integrate LDAP authentication with your Talos Linux Kubernetes cluster using Dex or a webhook authenticator for centralized user management.

---

Many organizations already have their user directory in LDAP, whether it is OpenLDAP, FreeIPA, or Active Directory running in LDAP mode. Connecting your Talos Linux Kubernetes cluster to LDAP means users can authenticate with their existing corporate credentials instead of managing separate Kubernetes-specific accounts. Kubernetes does not natively support LDAP authentication, so you need an intermediary. This guide covers two approaches: using Dex as an OIDC bridge to LDAP, and using a webhook token authenticator.

## Why LDAP for Kubernetes?

If your organization uses LDAP, integrating it with Kubernetes gives you:

- Single source of truth for user accounts
- Automatic deprovisioning when employees leave
- Existing group memberships can map to Kubernetes RBAC
- Familiar credentials for users
- Centralized audit trail

## Approach 1: Dex as an OIDC-LDAP Bridge

The most common approach is to run Dex inside your cluster. Dex acts as an OIDC identity provider that authenticates users against LDAP. The Kubernetes API server is configured to trust Dex as an OIDC provider.

The flow looks like this:

1. User runs `kubectl` with kubelogin plugin
2. kubelogin redirects to Dex
3. Dex prompts for credentials
4. Dex validates credentials against LDAP
5. Dex issues an OIDC token
6. kubectl uses the token to authenticate with the API server

### Step 1: Deploy Dex

Create a namespace and deploy Dex:

```bash
kubectl create namespace dex
```

Create the Dex configuration:

```yaml
# dex-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dex-config
  namespace: dex
data:
  config.yaml: |
    issuer: https://dex.example.com
    storage:
      type: kubernetes
      config:
        inCluster: true
    web:
      http: 0.0.0.0:5556
    connectors:
    - type: ldap
      id: ldap
      name: "LDAP"
      config:
        host: ldap.example.com:636
        insecureNoSSL: false
        insecureSkipVerify: false
        rootCA: /etc/dex/ldap-ca.crt
        bindDN: cn=service-account,dc=example,dc=com
        bindPW: "${LDAP_BIND_PASSWORD}"
        userSearch:
          baseDN: ou=users,dc=example,dc=com
          filter: "(objectClass=person)"
          username: uid
          idAttr: uid
          emailAttr: mail
          nameAttr: cn
        groupSearch:
          baseDN: ou=groups,dc=example,dc=com
          filter: "(objectClass=groupOfNames)"
          userMatchers:
          - userAttr: DN
            groupAttr: member
          nameAttr: cn
    oauth2:
      skipApprovalScreen: true
    staticClients:
    - id: kubernetes
      redirectURIs:
      - http://localhost:8000
      - http://localhost:18000
      name: Kubernetes
      secret: kubernetes-client-secret
```

Deploy Dex:

```yaml
# dex-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dex
  namespace: dex
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dex
  template:
    metadata:
      labels:
        app: dex
    spec:
      containers:
      - name: dex
        image: ghcr.io/dexidp/dex:v2.39.0
        ports:
        - containerPort: 5556
        command:
        - /usr/local/bin/dex
        - serve
        - /etc/dex/config.yaml
        volumeMounts:
        - name: config
          mountPath: /etc/dex
        - name: ldap-ca
          mountPath: /etc/dex/ldap-ca.crt
          subPath: ca.crt
        env:
        - name: LDAP_BIND_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ldap-credentials
              key: password
      volumes:
      - name: config
        configMap:
          name: dex-config
      - name: ldap-ca
        secret:
          secretName: ldap-ca-cert
---
apiVersion: v1
kind: Service
metadata:
  name: dex
  namespace: dex
spec:
  type: ClusterIP
  ports:
  - port: 5556
    targetPort: 5556
  selector:
    app: dex
```

```bash
# Create the LDAP credentials secret
kubectl create secret generic ldap-credentials \
    -n dex \
    --from-literal=password=your-ldap-bind-password

# Create the LDAP CA certificate secret
kubectl create secret generic ldap-ca-cert \
    -n dex \
    --from-file=ca.crt=/path/to/ldap-ca.crt

# Deploy Dex
kubectl apply -f dex-config.yaml
kubectl apply -f dex-deployment.yaml
```

### Step 2: Expose Dex

Dex needs to be accessible to users for the login flow. Set up an Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dex
  namespace: dex
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - dex.example.com
    secretName: dex-tls
  rules:
  - host: dex.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dex
            port:
              number: 5556
```

### Step 3: Configure the API Server

Apply the OIDC configuration to point at Dex:

```yaml
# api-server-oidc-patch.yaml
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://dex.example.com"
      oidc-client-id: "kubernetes"
      oidc-username-claim: "email"
      oidc-username-prefix: "ldap:"
      oidc-groups-claim: "groups"
      oidc-groups-prefix: "ldap:"
      oidc-ca-file: "/etc/kubernetes/dex-ca.crt"
```

```bash
# Apply to control plane nodes
talosctl patch machineconfig \
    --patch @api-server-oidc-patch.yaml \
    -n 10.0.0.1
```

### Step 4: Set Up User kubectl Configuration

```yaml
# kubeconfig-ldap.yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://10.0.0.1:6443
    certificate-authority-data: <base64-ca>
  name: my-cluster
contexts:
- context:
    cluster: my-cluster
    user: ldap-user
  name: my-cluster-ldap
current-context: my-cluster-ldap
users:
- name: ldap-user
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: kubectl
      args:
      - oidc-login
      - get-token
      - --oidc-issuer-url=https://dex.example.com
      - --oidc-client-id=kubernetes
      - --oidc-client-secret=kubernetes-client-secret
```

## Approach 2: Webhook Token Authentication

If you prefer not to run Dex, you can use a webhook token authenticator that validates tokens directly against LDAP.

### Step 1: Deploy the Webhook Authenticator

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ldap-authn-webhook
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ldap-authn-webhook
  template:
    metadata:
      labels:
        app: ldap-authn-webhook
    spec:
      containers:
      - name: webhook
        image: your-registry/ldap-authn-webhook:latest
        ports:
        - containerPort: 8443
        env:
        - name: LDAP_HOST
          value: "ldap.example.com:636"
        - name: LDAP_BASE_DN
          value: "dc=example,dc=com"
        - name: LDAP_BIND_DN
          value: "cn=service-account,dc=example,dc=com"
        - name: LDAP_BIND_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ldap-credentials
              key: password
```

### Step 2: Configure the API Server for Webhook Auth

```yaml
# webhook-auth-patch.yaml
cluster:
  apiServer:
    extraArgs:
      authentication-token-webhook-config-file: "/etc/kubernetes/webhook-config.yaml"
    extraVolumes:
      - hostPath: /etc/kubernetes/webhook-config.yaml
        mountPath: /etc/kubernetes/webhook-config.yaml
        readonly: true
```

## Setting Up RBAC for LDAP Groups

Map LDAP groups to Kubernetes roles:

```yaml
# ldap-rbac.yaml

# Ops team gets cluster admin
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ldap-ops-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  name: "ldap:ops-team"
  apiGroup: rbac.authorization.k8s.io
---
# Developers get namespace-scoped access
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ldap-dev-edit
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: "ldap:developers"
  apiGroup: rbac.authorization.k8s.io
---
# QA team gets read-only
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ldap-qa-view
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: Group
  name: "ldap:qa-team"
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f ldap-rbac.yaml
```

## Testing the Integration

```bash
# Test with LDAP credentials
export KUBECONFIG=kubeconfig-ldap.yaml

# This should trigger the LDAP login flow
kubectl get pods

# Verify the authenticated user
kubectl auth whoami

# Test RBAC permissions
kubectl auth can-i create pods
kubectl auth can-i delete nodes
```

## Troubleshooting LDAP Integration

Common issues and diagnostics:

```bash
# Check Dex logs for LDAP connection issues
kubectl logs -n dex -l app=dex

# Test LDAP connectivity from the cluster
kubectl run ldap-test --image=bitnami/openldap --restart=Never -- \
    ldapsearch -x -H ldaps://ldap.example.com:636 \
    -D "cn=service-account,dc=example,dc=com" \
    -w "$PASSWORD" \
    -b "ou=users,dc=example,dc=com" "(uid=testuser)"

# Check API server logs for auth failures
talosctl logs kube-apiserver -n 10.0.0.1 | grep -i "auth\|oidc\|token"
```

## Conclusion

LDAP authentication for Talos Linux clusters bridges the gap between your existing corporate directory and Kubernetes access control. The Dex-based approach is the most common and well-supported method, turning LDAP authentication into standard OIDC that the API server understands natively. Once set up, users authenticate with their existing credentials, group memberships map to RBAC roles automatically, and offboarding happens through your existing HR/IT processes. The initial setup takes some effort, but the operational benefits are significant for any organization that already runs LDAP.
