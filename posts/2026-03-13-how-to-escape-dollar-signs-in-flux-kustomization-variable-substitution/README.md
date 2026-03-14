# How to Escape Dollar Signs in Flux Kustomization Variable Substitution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kubernetes, Kustomization, Substitution, Escaping, Dollar-Sign

Description: Learn how to properly escape dollar signs in Flux Kustomization manifests to prevent unintended variable substitution when your application config requires literal dollar sign characters.

---

## Introduction

Flux post-build substitution replaces all `${VAR_NAME}` patterns in your manifests with corresponding variable values. But what happens when your application configuration legitimately contains dollar signs that should not be treated as variable placeholders? For example, shell scripts, regex patterns, password strings, or Nginx configurations often use dollar signs as part of their syntax. Flux provides an escaping mechanism using `$$` to output a literal `$` in the rendered manifest.

## Prerequisites

- Flux CD v2.0 or later installed on your cluster
- A Kustomization with post-build substitution enabled
- kubectl access to your cluster

## The Problem

Consider a ConfigMap that contains an Nginx configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    server {
      location / {
        proxy_set_header X-Request-ID ${request_id};
        proxy_pass http://backend;
      }
    }
```

When Flux processes this manifest with post-build substitution enabled, it will try to replace `${request_id}` with a variable value. If `request_id` is not defined, the placeholder remains as-is, which might work accidentally. But if you happen to have a variable named `request_id`, Flux will substitute it with an unintended value, breaking your Nginx configuration.

## The Solution: Double Dollar Signs

To output a literal `$` after Flux substitution, use `$$`. Flux replaces `$$` with a single `$` in the final output.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    server {
      location / {
        proxy_set_header X-Request-ID $${request_id};
        proxy_pass http://backend;
      }
    }
```

After Flux processes this manifest, the output will be:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    server {
      location / {
        proxy_set_header X-Request-ID ${request_id};
        proxy_pass http://backend;
      }
    }
```

The `$${request_id}` becomes `${request_id}` as a literal string, which is what Nginx expects.

## Escaping in Shell Scripts

Shell scripts in ConfigMaps frequently use dollar signs for variable expansion:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: init-script
data:
  init.sh: |
    #!/bin/bash
    DB_HOST=$${DB_HOST:-localhost}
    DB_PORT=$${DB_PORT:-5432}

    echo "Connecting to $${DB_HOST}:$${DB_PORT}"

    for file in $$(ls /migrations/*.sql); do
      echo "Applying $$file"
      psql -h $${DB_HOST} -p $${DB_PORT} -f "$$file"
    done
```

This renders as a proper shell script with single `$` signs after Flux substitution.

## Mixing Flux Variables and Literal Dollar Signs

You can use both Flux substitution variables and escaped dollar signs in the same manifest:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  config.sh: |
    #!/bin/bash
    # These are substituted by Flux
    CLUSTER="${CLUSTER_NAME}"
    ENV="${ENVIRONMENT}"

    # These are literal shell variables (escaped)
    TIMESTAMP=$$(date +%Y%m%d)
    HOSTNAME=$$(hostname)

    echo "Running on cluster $$CLUSTER in environment $$ENV at $$TIMESTAMP"
```

In this example, `${CLUSTER_NAME}` and `${ENVIRONMENT}` are replaced by Flux with their configured values, while `$$(date +%Y%m%d)` and `$$(hostname)` become `$(date +%Y%m%d)` and `$(hostname)` as literal shell command substitutions.

## Escaping in Regex Patterns

Applications that use regex patterns with dollar signs need escaping:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: regex-config
data:
  patterns.conf: |
    # Match end of line
    pattern1: "error$$"
    # Match a literal dollar amount
    pattern2: "\\$$[0-9]+"
    # Match variable syntax
    pattern3: "\\$${[a-zA-Z_]+}"
```

## Escaping in SQL Queries

SQL stored procedures or scripts that use dollar-quoting (common in PostgreSQL):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sql-migrations
data:
  001-functions.sql: |
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$$$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$$$ LANGUAGE plpgsql;
```

Here `$$$$` becomes `$$` in the output, which is the PostgreSQL dollar-quoting syntax.

## Escaping in Environment Variables

When your application expects literal dollar signs in environment variable values:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          env:
            # Flux-substituted value
            - name: DB_HOST
              value: "${DATABASE_HOST}"
            # Literal value with dollar sign (e.g., password containing $)
            - name: SPECIAL_PASSWORD
              value: "p@$$w0rd"
            # Spring Boot property placeholder
            - name: JAVA_OPTS
              value: "-Dspring.datasource.url=$${JDBC_URL}"
```

## Testing Escaping Locally

Use `flux envsubst` to verify your escaping works correctly:

```bash
export CLUSTER_NAME=production
export ENVIRONMENT=prod

cat manifest.yaml | flux envsubst
```

Check that:
- `${CLUSTER_NAME}` is replaced with "production"
- `$${something}` becomes `${something}` as a literal string
- `$$$$` becomes `$$`

## Common Escaping Patterns

| You write | Flux outputs | Use case |
|-----------|-------------|----------|
| `${VAR}` | Value of VAR | Flux substitution |
| `$${var}` | `${var}` | Literal shell/nginx variable |
| `$$var` | `$var` | Literal shell variable |
| `$$$$` | `$$` | PostgreSQL dollar-quoting |
| `$$(cmd)` | `$(cmd)` | Shell command substitution |

## What About Plain Dollar Signs Without Braces?

Flux only substitutes patterns matching `${VAR_NAME}`. A plain `$VAR` without braces is not substituted by Flux and does not need escaping. However, it is still good practice to escape them with `$$VAR` for clarity and to protect against future changes in the substitution engine.

## Conclusion

Escaping dollar signs with `$$` is essential when using Flux post-build substitution with manifests that contain literal dollar signs. The rule is simple: double every `$` that should appear as a literal `$` in the output. Always test your escaping locally with `flux envsubst` before pushing to Git. Pay special attention to shell scripts, Nginx configurations, SQL files, and regex patterns, as these commonly contain dollar signs that must be preserved literally.
