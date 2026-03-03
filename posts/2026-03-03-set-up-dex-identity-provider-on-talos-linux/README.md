# How to Set Up Dex Identity Provider on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Dex, Identity Provider, OIDC, Authentication, Kubernetes

Description: A complete guide to deploying and configuring Dex as an identity provider on Talos Linux for federated authentication with multiple backends.

---

Dex is a lightweight, open-source identity service that speaks OIDC and can federate authentication across multiple identity providers. It sits between the Kubernetes API server and your upstream identity sources like LDAP, SAML providers, GitHub, GitLab, or Google. Instead of configuring the API server to talk to each provider directly, you configure it to talk to Dex, and Dex handles everything else. This makes it the Swiss Army knife of Kubernetes authentication, and it works particularly well on Talos Linux clusters.

## Why Dex?

Kubernetes API server can only be configured with a single OIDC provider. That is a hard limitation. If you want users to authenticate through different methods, you need a broker. Dex fills that role by presenting a single OIDC interface while supporting multiple upstream connectors.

Common use cases:

- Merge LDAP and GitHub authentication into one system
- Support SAML-based SSO alongside local accounts
- Provide a consistent authentication experience across multiple clusters
- Add a layer of abstraction between Kubernetes and your identity infrastructure

## Prerequisites

- A running Talos Linux cluster with at least 3 nodes
- DNS configured for Dex (e.g., `dex.example.com`)
- TLS certificates (cert-manager or manual)
- Helm installed (optional, but recommended)
- `talosctl` and `kubectl` configured

## Step 1: Create Namespace and Secrets

```bash
# Create the dex namespace
kubectl create namespace dex

# If using LDAP connector, create the bind credentials secret
kubectl create secret generic dex-ldap-credentials \
    -n dex \
    --from-literal=bindDN="cn=service-account,ou=services,dc=example,dc=com" \
    --from-literal=bindPW="your-ldap-password"

# If using GitHub connector, create the OAuth app credentials
kubectl create secret generic dex-github-credentials \
    -n dex \
    --from-literal=clientID="your-github-client-id" \
    --from-literal=clientSecret="your-github-client-secret"
```

## Step 2: Deploy Dex with Helm

The Helm chart is the easiest way to deploy Dex:

```bash
# Add the Dex Helm repository
helm repo add dex https://charts.dexidp.io
helm repo update
```

Create a values file for your deployment:

```yaml
# dex-values.yaml
replicaCount: 2

image:
  repository: ghcr.io/dexidp/dex
  tag: v2.39.0

config:
  issuer: https://dex.example.com

  storage:
    type: kubernetes
    config:
      inCluster: true

  web:
    http: 0.0.0.0:5556

  oauth2:
    skipApprovalScreen: true
    responseTypes:
      - code
      - token
      - id_token

  connectors:
    # GitHub connector
    - type: github
      id: github
      name: GitHub
      config:
        clientID: $GITHUB_CLIENT_ID
        clientSecret: $GITHUB_CLIENT_SECRET
        redirectURI: https://dex.example.com/callback
        orgs:
          - name: my-organization
            teams:
              - platform-team
              - developers

    # LDAP connector
    - type: ldap
      id: ldap
      name: Corporate LDAP
      config:
        host: ldap.example.com:636
        insecureNoSSL: false
        insecureSkipVerify: false
        rootCA: /etc/dex/tls/ldap-ca.crt
        bindDN: cn=service-account,ou=services,dc=example,dc=com
        bindPW: $LDAP_BIND_PASSWORD
        userSearch:
          baseDN: ou=people,dc=example,dc=com
          filter: "(objectClass=inetOrgPerson)"
          username: uid
          idAttr: uid
          emailAttr: mail
          nameAttr: displayName
        groupSearch:
          baseDN: ou=groups,dc=example,dc=com
          filter: "(objectClass=groupOfUniqueNames)"
          userMatchers:
            - userAttr: DN
              groupAttr: uniqueMember
          nameAttr: cn

  staticClients:
    - id: kubernetes
      name: Kubernetes
      secret: kubernetes-dex-client-secret
      redirectURIs:
        - http://localhost:8000
        - http://localhost:18000

    - id: argocd
      name: ArgoCD
      secret: argocd-dex-client-secret
      redirectURIs:
        - https://argocd.example.com/auth/callback

envVars:
  - name: GITHUB_CLIENT_ID
    valueFrom:
      secretKeyRef:
        name: dex-github-credentials
        key: clientID
  - name: GITHUB_CLIENT_SECRET
    valueFrom:
      secretKeyRef:
        name: dex-github-credentials
        key: clientSecret
  - name: LDAP_BIND_PASSWORD
    valueFrom:
      secretKeyRef:
        name: dex-ldap-credentials
        key: bindPW

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: dex.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: dex-tls
      hosts:
        - dex.example.com
```

Install Dex:

```bash
helm install dex dex/dex \
    --namespace dex \
    --values dex-values.yaml
```

## Step 3: Verify Dex is Running

```bash
# Check the pods
kubectl get pods -n dex

# Check the service
kubectl get svc -n dex

# Test the discovery endpoint
curl -s https://dex.example.com/.well-known/openid-configuration | jq .
```

The discovery endpoint should return a JSON document with the issuer URL, token endpoint, authorization endpoint, and supported scopes.

## Step 4: Configure the Talos API Server

Create a machine config patch to point the Kubernetes API server at Dex:

```yaml
# dex-apiserver-patch.yaml
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://dex.example.com"
      oidc-client-id: "kubernetes"
      oidc-username-claim: "email"
      oidc-username-prefix: "dex:"
      oidc-groups-claim: "groups"
      oidc-groups-prefix: "dex:"
```

Apply to all control plane nodes:

```bash
for cp_ip in 10.0.0.1 10.0.0.2 10.0.0.3; do
    talosctl patch machineconfig \
        --patch @dex-apiserver-patch.yaml \
        -n "$cp_ip"
    echo "Patched $cp_ip"
done
```

Wait for the API server to restart and verify:

```bash
# Check API server logs for OIDC initialization
talosctl logs kube-apiserver -n 10.0.0.1 | grep -i oidc

# Verify the API server is healthy
kubectl get --raw /healthz
```

## Step 5: Create RBAC Bindings

Map Dex groups to Kubernetes roles:

```yaml
# dex-rbac.yaml

# GitHub platform-team gets cluster admin
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dex-platform-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  name: "dex:my-organization:platform-team"
  apiGroup: rbac.authorization.k8s.io

---
# LDAP engineering group gets edit access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dex-engineers-edit
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: "dex:engineering"
  apiGroup: rbac.authorization.k8s.io

---
# GitHub developers team gets view access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dex-developers-view
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: Group
  name: "dex:my-organization:developers"
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f dex-rbac.yaml
```

## Step 6: Configure kubectl for Users

Distribute kubeconfig files that use kubelogin with Dex:

```yaml
# kubeconfig-dex.yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://kubernetes.example.com:6443
    certificate-authority-data: <base64-ca>
  name: production
contexts:
- context:
    cluster: production
    user: dex-user
  name: production
current-context: production
users:
- name: dex-user
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: kubectl
      args:
      - oidc-login
      - get-token
      - --oidc-issuer-url=https://dex.example.com
      - --oidc-client-id=kubernetes
      - --oidc-client-secret=kubernetes-dex-client-secret
      - --oidc-extra-scope=groups
      - --oidc-extra-scope=email
      - --oidc-extra-scope=profile
```

## Step 7: Adding More Connectors

One of Dex's strengths is that you can add new identity sources without changing the API server configuration. Just update the Dex config:

```yaml
# Add a SAML connector for enterprise SSO
connectors:
  - type: saml
    id: okta
    name: Okta SSO
    config:
      ssoURL: https://company.okta.com/app/xxxxx/sso/saml
      ca: /etc/dex/tls/okta-ca.crt
      redirectURI: https://dex.example.com/callback
      usernameAttr: name
      emailAttr: email
      groupsAttr: groups

  # Add a GitLab connector
  - type: gitlab
    id: gitlab
    name: GitLab
    config:
      clientID: gitlab-client-id
      clientSecret: gitlab-client-secret
      redirectURI: https://dex.example.com/callback
      baseURL: https://gitlab.example.com
      groups:
        - my-group
```

Update the Helm release:

```bash
helm upgrade dex dex/dex \
    --namespace dex \
    --values dex-values-updated.yaml
```

## Monitoring Dex

Set up monitoring for Dex to catch authentication issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dex
  namespace: dex
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: dex
  endpoints:
  - port: telemetry
    interval: 30s
```

## Troubleshooting

```bash
# Check Dex pod logs
kubectl logs -n dex -l app.kubernetes.io/name=dex -f

# Test the OIDC discovery endpoint
curl -v https://dex.example.com/.well-known/openid-configuration

# Check for connector errors
kubectl logs -n dex -l app.kubernetes.io/name=dex | grep -i "error\|failed\|connector"

# Verify TLS certificates
openssl s_client -connect dex.example.com:443 -showcerts < /dev/null
```

## Conclusion

Dex is the go-to solution for federated authentication on Kubernetes, and it works seamlessly with Talos Linux. By deploying Dex, you get a single OIDC endpoint that can federate across LDAP, SAML, GitHub, GitLab, and many other identity providers. The Kubernetes API server only needs to know about Dex, and Dex handles the complexity of talking to multiple backends. For organizations that need flexible, multi-source authentication, Dex is the right tool for the job.
