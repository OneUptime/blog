# Understanding ArgoCD argocd-cm ConfigMap: Every Key Explained

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration, Administration

Description: A comprehensive reference to every key in the ArgoCD argocd-cm ConfigMap, covering repository settings, SSO configuration, resource customizations, and operational tuning.

---

The `argocd-cm` ConfigMap is the central configuration hub for ArgoCD. It controls everything from user accounts and SSO settings to resource tracking, custom health checks, and UI behavior. Changes to this ConfigMap take effect almost immediately without requiring a restart in most cases. This guide documents every key you can set.

## Location and Basics

The ConfigMap lives in the ArgoCD namespace:

```bash
kubectl get configmap argocd-cm -n argocd -o yaml
```

To edit it:

```bash
kubectl edit configmap argocd-cm -n argocd
```

Or apply changes via patch:

```bash
kubectl patch configmap argocd-cm -n argocd --type merge -p '{"data":{"key":"value"}}'
```

## User Account Keys

### accounts.<username>

Defines a local user account with specified capabilities:

```yaml
data:
  # Create a user with both API and login access
  accounts.alice: "apiKey, login"

  # API-only account (for CI/CD)
  accounts.ci-bot: "apiKey"

  # Login-only account (UI access, no API tokens)
  accounts.viewer: "login"
```

### accounts.<username>.enabled

Enable or disable a user account:

```yaml
data:
  accounts.alice.enabled: "true"
  accounts.former-employee.enabled: "false"
```

## SSO and Authentication Keys

### url

The external-facing URL of the ArgoCD server. Required for SSO callbacks:

```yaml
data:
  url: "https://argocd.example.com"
```

### dex.config

Dex connector configuration for SSO. Supports OIDC, SAML, LDAP, GitHub, GitLab, and more:

```yaml
data:
  dex.config: |
    connectors:
      - type: github
        id: github
        name: GitHub
        config:
          clientID: $dex.github.clientID
          clientSecret: $dex.github.clientSecret
          orgs:
            - name: my-org
      - type: oidc
        id: okta
        name: Okta
        config:
          issuer: https://myorg.okta.com
          clientID: $dex.okta.clientID
          clientSecret: $dex.okta.clientSecret
          scopes:
            - openid
            - profile
            - email
            - groups
```

### oidc.config

Direct OIDC configuration without Dex:

```yaml
data:
  oidc.config: |
    name: Okta
    issuer: https://myorg.okta.com
    clientID: argocd-client
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
    requestedIDTokenClaims:
      groups:
        essential: true
```

### admin.enabled

Enable or disable the built-in admin account:

```yaml
data:
  admin.enabled: "false"    # Disable admin for production
```

## Repository Configuration Keys

### repositories

Define repository connections (legacy format - using Secrets is preferred):

```yaml
data:
  repositories: |
    - url: https://github.com/org/repo.git
      usernameSecret:
        name: repo-creds
        key: username
      passwordSecret:
        name: repo-creds
        key: password
    - url: git@github.com:org/private-repo.git
      sshPrivateKeySecret:
        name: repo-ssh-key
        key: sshPrivateKey
```

### repository.credentials

Credential templates for pattern-matching repository access:

```yaml
data:
  repository.credentials: |
    - url: https://github.com/org
      usernameSecret:
        name: github-creds
        key: username
      passwordSecret:
        name: github-creds
        key: password
```

## Resource Tracking and Behavior

### application.instanceLabelKey

The label ArgoCD uses to track which resources belong to which application:

```yaml
data:
  application.instanceLabelKey: "argocd.argoproj.io/instance"
```

Changing this in a running system can cause ArgoCD to lose track of existing resources.

### resource.exclusions

Exclude specific resources from ArgoCD management:

```yaml
data:
  resource.exclusions: |
    - apiGroups:
        - "events.k8s.io"
      kinds:
        - "Event"
      clusters:
        - "*"
    - apiGroups:
        - "cilium.io"
      kinds:
        - "CiliumIdentity"
      clusters:
        - "*"
```

### resource.inclusions

Only include specific resources (mutually exclusive with exclusions - do not use both):

```yaml
data:
  resource.inclusions: |
    - apiGroups:
        - "*"
      kinds:
        - "Deployment"
        - "Service"
        - "ConfigMap"
        - "Secret"
      clusters:
        - "*"
```

### resource.compareoptions

Configure how ArgoCD compares resources:

```yaml
data:
  resource.compareoptions: |
    ignoreAggregatedRoles: true
    ignoreResourceStatusField: all
```

### resource.customizations

Define custom health checks, actions, and ignore differences for specific resources:

```yaml
data:
  # Custom health check for a CRD
  resource.customizations.health.mycrd.example.com_MyResource: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Ready" then
        hs.status = "Healthy"
        hs.message = "Resource is ready"
      elseif obj.status.phase == "Failed" then
        hs.status = "Degraded"
        hs.message = obj.status.message or "Resource failed"
      else
        hs.status = "Progressing"
        hs.message = "Resource is being processed"
      end
    end
    return hs

  # Ignore differences for specific fields
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
      - kube-scheduler
    jsonPointers:
      - /metadata/managedFields

  # Custom actions
  resource.customizations.actions.apps_Deployment: |
    discovery.lua: |
      actions = {}
      actions["restart"] = {}
      return actions
    definitions:
      - name: restart
        action.lua: |
          local os = require("os")
          if obj.spec.template.metadata == nil then
            obj.spec.template.metadata = {}
          end
          if obj.spec.template.metadata.annotations == nil then
            obj.spec.template.metadata.annotations = {}
          end
          obj.spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"] = os.date("!%Y-%m-%dT%H:%M:%SZ")
          return obj
```

### resource.customizations.knownTypeFields

Specify known type fields for better diffing:

```yaml
data:
  resource.customizations.knownTypeFields.apps_Deployment: |
    - field: spec.template.spec.containers
      type: core/v1/Container
```

## Tracking Method

### application.resourceTrackingMethod

Controls how ArgoCD tracks resources it manages:

```yaml
data:
  # Options: label, annotation, annotation+label (default)
  application.resourceTrackingMethod: "annotation"
```

- `label` - uses the instance label only (legacy, limited by label length)
- `annotation` - uses an annotation (supports longer values)
- `annotation+label` - uses both (recommended default)

## UI and Server Configuration

### statusbadge.enabled

Enable status badge endpoints for embedding in README files:

```yaml
data:
  statusbadge.enabled: "true"
```

### users.anonymous.enabled

Allow anonymous (unauthenticated) read-only access:

```yaml
data:
  users.anonymous.enabled: "true"
```

### kustomize.buildOptions

Global Kustomize build options:

```yaml
data:
  kustomize.buildOptions: "--enable-helm --enable-alpha-plugins"
```

### kustomize.path.<version>

Custom Kustomize binary paths for specific versions:

```yaml
data:
  kustomize.path.v4.5.7: /custom/kustomize-4.5.7
  kustomize.path.v5.0.0: /custom/kustomize-5.0.0
```

### helm.valuesFileSchemes

Allowed URL schemes for Helm values files:

```yaml
data:
  helm.valuesFileSchemes: "https, http, s3"
```

## Exec and Terminal

### exec.enabled

Enable the web terminal feature for exec into pods:

```yaml
data:
  exec.enabled: "true"
```

### exec.shells

Allowed shells for web terminal:

```yaml
data:
  exec.shells: "bash,sh,zsh"
```

## Timeout and Performance

### timeout.reconciliation

How often ArgoCD checks for changes (default 180s):

```yaml
data:
  timeout.reconciliation: "300s"    # Check every 5 minutes
```

### timeout.hard.reconciliation

Maximum time between reconciliation, regardless of other settings:

```yaml
data:
  timeout.hard.reconciliation: "0s"    # 0 = disabled
```

## Extension and Plugin Keys

### configManagementPlugins

Define config management plugins (legacy - CMP v2 sidecar model is preferred):

```yaml
data:
  configManagementPlugins: |
    - name: kustomize-with-sops
      generate:
        command: ["sh", "-c"]
        args: ["kustomize build . | sops --decrypt /dev/stdin"]
```

## Summary

The `argocd-cm` ConfigMap is where most of ArgoCD's runtime behavior is configured. From user accounts and SSO to resource tracking and custom health checks, this single ConfigMap controls the personality of your ArgoCD installation. Always test changes in a staging environment first, and remember that some changes (like the resource tracking method) can have significant impact on existing deployments. For related configuration, see the [argocd-rbac-cm](https://oneuptime.com/blog/post/2026-02-26-understanding-argocd-rbac-cm-configmap-every-key-explained/view) and [argocd-cmd-params-cm](https://oneuptime.com/blog/post/2026-02-26-understanding-argocd-cmd-params-cm-every-key-explained/view) guides.
