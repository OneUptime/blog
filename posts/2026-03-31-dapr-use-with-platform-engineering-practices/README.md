# How to Use Dapr with Platform Engineering Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Platform Engineering, Golden Path, Developer Experience, IdP

Description: Learn how to integrate Dapr into platform engineering workflows by building golden paths, paved roads, and self-service tooling that make Dapr the default choice for application teams.

---

Platform engineering creates "golden paths" - opinionated, well-paved routes through complex infrastructure. Making Dapr part of your golden path ensures teams adopt it consistently rather than improvising their own microservices infrastructure.

## The Golden Path Concept for Dapr

A golden path for a Dapr-enabled service means:

1. Developer writes application code
2. Developer runs one command to scaffold a Dapr-ready service
3. CI/CD pipeline validates Dapr configuration automatically
4. Deployment happens through GitOps with Dapr components pre-configured
5. Observability dashboards are available immediately

None of these steps require the developer to understand Dapr internals.

## Building the Dapr Golden Path

### Step 1: Service Scaffolding

Provide a single command to create a new Dapr-enabled service:

```bash
# Platform team provides this script
platform new-service --name order-processor \
                     --team payments \
                     --language python \
                     --with-state \
                     --with-pubsub
```

This generates:

```text
order-processor/
  app.py                          # Application skeleton
  requirements.txt
  k8s/
    deployment.yaml               # With Dapr annotations
    service.yaml
  dapr/
    components/statestore.yaml    # Pre-configured for team
    components/pubsub.yaml
    resiliency.yaml
  .github/workflows/
    ci.yaml                       # Includes Dapr validation
  catalog-info.yaml               # Backstage registration
```

### Step 2: CI Validation Gates

Add Dapr-specific validation to every pull request:

```yaml
# .github/workflows/ci.yaml
jobs:
  validate-dapr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Dapr component YAML
        run: |
          # Check for plaintext secrets
          grep -r "value:.*password" dapr/components/ && \
            echo "ERROR: Plaintext password in component" && exit 1

          # Validate YAML syntax
          for f in dapr/components/*.yaml; do
            kubectl apply --dry-run=client -f "$f" || exit 1
          done

      - name: Check required Dapr annotations
        run: |
          APP_ID=$(yq '.spec.template.metadata.annotations["dapr.io/app-id"]' k8s/deployment.yaml)
          if [ -z "$APP_ID" ] || [ "$APP_ID" = "null" ]; then
            echo "ERROR: dapr.io/app-id annotation missing"
            exit 1
          fi
```

### Step 3: Self-Service Component Requests

Let teams request new Dapr components through a GitHub issue template:

```markdown
# .github/ISSUE_TEMPLATE/dapr-component-request.md
---
name: Dapr Component Request
about: Request a new Dapr component for your team
---

**Component Type:** (state-store / pubsub / secret-store)
**Team:**
**Environment:** (staging / production)
**Backing Service:** (Redis / Kafka / Azure Service Bus / ...)
**Justification:**
```

The platform team reviews and adds the component via GitOps.

### Step 4: Platform-Managed Upgrades

Automate runtime upgrades with a Renovate or Dependabot configuration:

```json
{
  "packageRules": [
    {
      "matchPackageNames": ["daprio/daprd"],
      "groupName": "Dapr Runtime",
      "automerge": false,
      "reviewers": ["platform-team"]
    }
  ]
}
```

## Measuring Golden Path Adoption

Track how many teams use the golden path vs. rolling their own:

```bash
# Count services with standard Dapr annotations vs. non-standard
kubectl get pods -A -o json | jq '
  [.items[] |
   select(.metadata.annotations["dapr.io/enabled"] == "true") |
   {
     name: .metadata.name,
     hasStandardConfig: (
       .metadata.annotations["dapr.io/config"] == "dapr-config" and
       (.metadata.annotations["dapr.io/app-id"] | test("^[a-z]+-[a-z]+$"))
     )
   }
  ] | group_by(.hasStandardConfig) | map({(.[0].hasStandardConfig | tostring): length}) | add'
```

## Summary

Integrating Dapr into platform engineering means building a golden path that includes service scaffolding with pre-configured Dapr annotations and components, CI validation gates for Dapr configuration quality, self-service component request workflows, and automated runtime upgrade management. This makes Dapr the easiest choice rather than requiring individual teams to learn Dapr internals.
