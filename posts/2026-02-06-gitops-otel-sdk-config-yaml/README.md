# How to Version Control and GitOps Your OpenTelemetry SDK Configuration Using Declarative YAML Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GitOps, Version Control, YAML Configuration

Description: Implement GitOps workflows for your OpenTelemetry SDK configuration using declarative YAML files and automated CI/CD pipelines.

When your OpenTelemetry configuration lives in environment variables scattered across Helm charts, Terraform modules, and deployment scripts, it is impossible to answer basic questions: "When did we change the sampling rate?" or "Who turned off compression for the OTLP exporter?" Moving to declarative YAML files and treating them as first-class code with version control, code review, and automated deployment solves this entirely.

## Repository Structure

Organize your OpenTelemetry configuration files alongside your application code or in a dedicated config repository:

```
observability-config/
  README.md
  schemas/
    opentelemetry_configuration.json    # pinned schema version
  services/
    order-service/
      otel-config.yaml
      otel-config.staging.yaml          # optional environment overrides
    payment-service/
      otel-config.yaml
    inventory-service/
      otel-config.yaml
  shared/
    base-config.yaml                    # shared defaults
  scripts/
    validate.sh
  .github/
    workflows/
      validate-and-deploy.yaml
  env/
    dev.env
    staging.env
    prod.env
```

## Git Workflow for Configuration Changes

Every configuration change follows the same pull request workflow as code:

```bash
# Create a branch for the configuration change
git checkout -b otel/increase-sampling-order-service

# Edit the configuration
vim services/order-service/otel-config.yaml
```

Make your change. For example, increasing the sampling ratio:

```yaml
# services/order-service/otel-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "order-service"
    service.version: "${SERVICE_VERSION}"
    deployment.environment: "${DEPLOY_ENV}"

tracer_provider:
  processors:
    - batch:
        schedule_delay: 5000
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"
            compression: "gzip"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.2  # changed from 0.1 to 0.2 to capture more traces during investigation
```

Commit and push:

```bash
git add services/order-service/otel-config.yaml
git commit -m "Increase order-service sampling ratio to 20% for latency investigation"
git push origin otel/increase-sampling-order-service
```

## CI Pipeline: Validate on Every PR

Set up a GitHub Actions workflow that validates configuration files on every pull request:

```yaml
# .github/workflows/validate-and-deploy.yaml
name: OTel Config Validate & Deploy

on:
  pull_request:
    paths:
      - "services/**/*.yaml"
      - "shared/**/*.yaml"
  push:
    branches: [main]
    paths:
      - "services/**/*.yaml"
      - "shared/**/*.yaml"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install validation tools
        run: pip install jsonschema pyyaml

      - name: Validate all config files
        run: |
          FAILED=0
          for env_file in env/*.env; do
            ENV_NAME=$(basename "$env_file" .env)
            echo "=== Validating with $ENV_NAME environment ==="
            set -a && source "$env_file" && set +a

            for config_file in services/*/otel-config*.yaml; do
              echo "  Validating $config_file..."
              envsubst < "$config_file" > /tmp/resolved.yaml
              python scripts/validate.py /tmp/resolved.yaml schemas/opentelemetry_configuration.json || FAILED=1
            done
          done
          exit $FAILED

      - name: Check for breaking changes
        run: |
          # Compare against the main branch to detect breaking changes
          git fetch origin main
          for config_file in $(git diff --name-only origin/main -- 'services/*/otel-config*.yaml'); do
            echo "Changed: $config_file"
            # Show the diff for review context
            git diff origin/main -- "$config_file"
          done

  deploy:
    needs: validate
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy configs to Kubernetes
        run: |
          for service_dir in services/*/; do
            SERVICE_NAME=$(basename "$service_dir")
            echo "Deploying config for $SERVICE_NAME..."

            # Create or update the ConfigMap
            kubectl create configmap "otel-config-${SERVICE_NAME}" \
              --from-file="${service_dir}otel-config.yaml" \
              --dry-run=client -o yaml | kubectl apply -f -

            # Trigger a rollout restart to pick up the new config
            kubectl rollout restart deployment/"${SERVICE_NAME}"
          done
```

## ArgoCD Integration

If you use ArgoCD for GitOps, your OpenTelemetry config files naturally fit into the Application model:

```yaml
# argocd/otel-configs.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: otel-configs
  namespace: argocd
spec:
  project: observability
  source:
    repoURL: https://github.com/your-org/observability-config.git
    targetRevision: main
    path: services
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

ArgoCD watches the repository and automatically syncs configuration changes when they are merged to main.

## CODEOWNERS for Review Requirements

Ensure configuration changes get reviewed by the right people:

```
# .github/CODEOWNERS

# All OTel config changes require observability team review
services/*/otel-config*.yaml @your-org/observability-team
shared/ @your-org/observability-team
schemas/ @your-org/observability-team

# Service-specific configs also need the owning team
services/order-service/ @your-org/order-team @your-org/observability-team
services/payment-service/ @your-org/payment-team @your-org/observability-team
```

## Audit Trail and Rollback

Git gives you a complete audit trail for free:

```bash
# Who changed the sampling rate and when?
git log --follow -p services/order-service/otel-config.yaml

# What changed in the last deployment?
git diff HEAD~1 -- services/

# Roll back to the previous configuration
git revert HEAD
git push origin main
# ArgoCD or your CI pipeline automatically redeploys
```

## Wrapping Up

Treating OpenTelemetry configuration as code is not just a best practice label. It gives you concrete benefits: mandatory code review for every change, automated validation before deployment, a complete audit trail of who changed what and when, and instant rollback through `git revert`. The declarative YAML format makes this possible in a way that scattered environment variables never could. Set up the repository structure, add CI validation, configure CODEOWNERS, and you have a production-grade GitOps pipeline for your observability configuration.
