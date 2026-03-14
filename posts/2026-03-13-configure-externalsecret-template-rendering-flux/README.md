# How to Configure ExternalSecret with Template Rendering with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, Template Rendering, Secret Transformation

Description: Use ESO secret templates to transform and combine external secret data into custom formats with Flux CD, enabling construction of connection strings and config files from raw secret values.

---

## Introduction

Real applications often need secrets in specific formats that differ from how they are stored in the external secret store. A database connection string must combine a host, port, username, and password into a single URL. A configuration file must embed multiple secrets in a specific format. The External Secrets Operator's template rendering feature allows you to transform and combine external secret values using Go templates before they are written to Kubernetes Secrets.

Template rendering in `ExternalSecret` is particularly powerful when combined with Flux CD: you can evolve the transformation logic alongside the application code through pull requests, making the connection string format or config file structure a reviewable, version-controlled decision.

This guide covers ESO template rendering for constructing connection strings, generating config files, and creating typed Secrets (TLS, Docker config).

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- A `SecretStore` or `ClusterSecretStore` configured and validated
- Familiarity with Go template syntax

## Step 1: Construct a Database Connection String

Use templates to combine individual secret fields into a PostgreSQL connection string:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-template-connstr.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-db-connection
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-db-connection
    creationPolicy: Owner
    # Template transforms external values before writing to the Secret
    template:
      engineVersion: v2
      data:
        # Construct a PostgreSQL URL from individual fields
        DATABASE_URL: |
          postgres://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/{{ .dbname }}?sslmode={{ .ssl_mode }}
        # Create a JDBC-style connection string for JVM applications
        JDBC_URL: |
          jdbc:postgresql://{{ .host }}:{{ .port }}/{{ .dbname }}
  data:
    - secretKey: host
      remoteRef:
        key: myapp/database
        property: host
    - secretKey: port
      remoteRef:
        key: myapp/database
        property: port
    - secretKey: username
      remoteRef:
        key: myapp/database
        property: username
    - secretKey: password
      remoteRef:
        key: myapp/database
        property: password
    - secretKey: dbname
      remoteRef:
        key: myapp/database
        property: dbname
    - secretKey: ssl_mode
      remoteRef:
        key: myapp/database
        property: ssl_mode
```

## Step 2: Generate an Application Config File

Use templates to render a complete application config file from multiple secret values:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-template-configfile.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-config-file
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-config-file
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # Render a complete YAML config file
        config.yaml: |
          database:
            url: postgres://{{ .db_user }}:{{ .db_password }}@{{ .db_host }}/mydb
            pool_size: 10
          redis:
            url: redis://:{{ .redis_password }}@{{ .redis_host }}:6379
          auth:
            jwt_secret: {{ .jwt_secret }}
            token_expiry: 3600
  data:
    - secretKey: db_user
      remoteRef:
        key: myapp/database
        property: username
    - secretKey: db_password
      remoteRef:
        key: myapp/database
        property: password
    - secretKey: db_host
      remoteRef:
        key: myapp/database
        property: host
    - secretKey: redis_password
      remoteRef:
        key: myapp/redis
        property: password
    - secretKey: redis_host
      remoteRef:
        key: myapp/redis
        property: host
    - secretKey: jwt_secret
      remoteRef:
        key: myapp/auth
        property: jwt_secret
```

## Step 3: Create a TLS-Typed Secret with Templates

Use the `type` field in the template to create typed Kubernetes Secrets for TLS:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-template-tls.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-tls-cert
  namespace: default
spec:
  refreshInterval: 24h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-tls
    creationPolicy: Owner
    template:
      engineVersion: v2
      # Set the Secret type to kubernetes.io/tls
      type: kubernetes.io/tls
      data:
        tls.crt: "{{ .certificate }}"
        tls.key: "{{ .private_key }}"
  data:
    - secretKey: certificate
      remoteRef:
        key: myapp/tls
        property: certificate
    - secretKey: private_key
      remoteRef:
        key: myapp/tls
        property: private_key
```

## Step 4: Apply Conditional Logic in Templates

Use Go template conditionals to handle optional fields:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-template-conditional.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-smtp-config
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-smtp
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        SMTP_URL: |
          {{ if .smtp_password -}}
          smtp://{{ .smtp_user }}:{{ .smtp_password }}@{{ .smtp_host }}:587
          {{- else -}}
          smtp://{{ .smtp_host }}:25
          {{- end }}
  data:
    - secretKey: smtp_host
      remoteRef:
        key: myapp/smtp
        property: host
    - secretKey: smtp_user
      remoteRef:
        key: myapp/smtp
        property: username
    - secretKey: smtp_password
      remoteRef:
        key: myapp/smtp
        property: password
```

## Step 5: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/apps/myapp/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-templated-secrets
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: secret-stores
```

## Best Practices

- Always use `engineVersion: v2` for new templates; v2 uses Sprig functions and is the current stable template engine.
- Keep template logic minimal; templates in `ExternalSecret` are not unit-testable, so prefer transforming data in the external store when possible.
- Use `type: kubernetes.io/tls` or `type: kubernetes.io/dockerconfigjson` in the template when the consuming resource (Ingress, Pod) expects a typed Secret.
- Avoid storing sensitive values in the template body itself; only reference `{{ .key }}` variables that come from external store values.
- Document non-obvious template expressions with comments in the `ExternalSecret` manifest.

## Conclusion

Template rendering in `ExternalSecret` resources bridges the gap between how secrets are stored externally and how applications need to consume them. Managed through Flux CD, template transformations are version-controlled, making format changes reviewable. This approach eliminates the need for init containers or application-level secret assembly code, keeping your secret handling declarative and consistent.
