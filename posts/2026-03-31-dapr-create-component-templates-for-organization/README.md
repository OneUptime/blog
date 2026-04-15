# How to Create Dapr Component Templates for Your Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Template, Helm, Organization

Description: Learn how to create reusable Dapr component templates using Helm or Kustomize to standardize infrastructure configuration across all teams and environments.

---

When multiple teams adopt Dapr, each team should not be writing component YAML from scratch. Shared templates enforce organizational standards and reduce configuration errors.

## Why Templates Matter

Without templates, teams produce inconsistent configurations:

```yaml
# Team A's statestore - missing scopes, no secret ref
spec:
  metadata:
    - name: redisPassword
      value: "hardcoded-password"   # security violation

# Team B's statestore - correct pattern
spec:
  metadata:
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
scopes:
  - payments-processor
```

Templates codify the correct pattern once and eliminate the wrong one.

## Helm-Based Component Templates

Create a Helm chart for your organization's standard Dapr components:

```text
dapr-components/
  Chart.yaml
  values.yaml
  templates/
    statestore.yaml
    pubsub.yaml
    secretstore.yaml
    resiliency.yaml
```

`templates/statestore.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: {{ .Release.Namespace }}
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "{{ .Values.redis.host }}:{{ .Values.redis.port }}"
    - name: redisPassword
      secretKeyRef:
        name: {{ .Values.redis.secretName }}
        key: password
    - name: enableTLS
      value: "{{ .Values.redis.tls }}"
{{- if .Values.scopes }}
scopes:
  {{- toYaml .Values.scopes | nindent 2 }}
{{- end }}
```

`values.yaml`:

```yaml
redis:
  host: "redis-master.infra.svc.cluster.local"
  port: 6379
  secretName: "redis-credentials"
  tls: "false"

scopes: []
```

Teams override values per environment:

```bash
# Deploy for payments team in production
helm upgrade --install dapr-components ./dapr-components \
  -n payments-prod \
  -f values-prod.yaml \
  --set scopes[0]=payments-processor \
  --set scopes[1]=payments-worker
```

## Kustomize-Based Templates

For teams using Kustomize, provide a base layer:

```text
base/
  statestore.yaml
  pubsub.yaml
  kustomization.yaml

overlays/
  team-payments/
    kustomization.yaml
    patches/
      statestore-patch.yaml
```

`base/kustomization.yaml`:

```yaml
resources:
  - statestore.yaml
  - pubsub.yaml
```

`overlays/team-payments/statestore-patch.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  metadata:
    - name: redisHost
      value: "redis-payments:6379"
scopes:
  - payments-processor
```

Apply the overlay:

```bash
kubectl apply -k overlays/team-payments/ -n payments-prod
```

## Template Validation

Add a CI step to validate component YAML before merging:

```bash
# Validate Helm rendering
helm template dapr-components ./dapr-components -f values-prod.yaml | kubeval

# Check for prohibited patterns
helm template ... | grep -E "value:.*password" && echo "ERROR: Plaintext password found" && exit 1
```

## Distributing Templates

Host templates in a shared Git repository and reference them as submodules or a Helm repository:

```bash
# Add organization Helm chart repo
helm repo add org-charts https://charts.example.com
helm repo update

# Install standard components
helm install dapr-infra org-charts/dapr-components -n my-team
```

## Summary

Dapr component templates using Helm or Kustomize let organizations codify correct configuration patterns once and distribute them to all teams. Templates enforce security best practices like secret references, enable per-environment overrides, and can be validated in CI to prevent misconfiguration from reaching production.
