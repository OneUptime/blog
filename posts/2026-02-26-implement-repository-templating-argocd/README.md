# How to Implement Repository Templating for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Repository Templates, Scaffolding

Description: Learn how to create repository templates that standardize the structure of ArgoCD config repos so every service follows the same GitOps patterns.

---

When you manage dozens of services with ArgoCD, every config repo should follow the same structure. Without templates, each team invents their own layout, uses different Kustomize patterns, and names things inconsistently. This makes it impossible to use ApplicationSets for auto-discovery and creates a maintenance nightmare. Repository templates solve this by giving every new service a standardized starting point.

## Why Repository Templates Matter

Consider what happens without templates. Team A structures their config like this:

```text
team-a-service/
├── k8s/
│   ├── prod/
│   └── dev/
```

Team B does this:

```text
team-b-service/
├── deploy/
│   ├── production/
│   └── development/
```

Your ApplicationSet expects `overlays/production/kustomization.yaml` but neither team matches. You end up writing custom Applications for every service, defeating the purpose of GitOps automation.

## The Template Repository Structure

Create a GitHub template repository (or GitLab project template) with this structure:

```text
service-config-template/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── hpa.yaml
├── overlays/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   │       └── .gitkeep
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   │       └── .gitkeep
│   └── production/
│       ├── kustomization.yaml
│       └── patches/
│           ├── replicas.yaml
│           ├── resources.yaml
│           └── pod-disruption-budget.yaml
├── .github/
│   └── workflows/
│       └── validate.yaml
├── CODEOWNERS
├── renovate.json
└── README.md
```

## The Base Templates

The base deployment template uses placeholder values that teams fill in:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: SERVICE_NAME  # Replace with actual service name
  labels:
    app.kubernetes.io/name: SERVICE_NAME
    app.kubernetes.io/part-of: TEAM_NAME
    app.kubernetes.io/managed-by: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: SERVICE_NAME
  template:
    metadata:
      labels:
        app.kubernetes.io/name: SERVICE_NAME
    spec:
      containers:
        - name: app
          image: ORG/SERVICE_NAME:latest
          ports:
            - containerPort: 8080
              name: http
          readinessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 15
            periodSeconds: 20
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

The base kustomization ties everything together:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

commonLabels:
  app.kubernetes.io/name: SERVICE_NAME
```

## Environment Overlay Templates

Each environment overlay has sensible defaults:

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: dev

images:
  - name: ORG/SERVICE_NAME
    newTag: latest  # Dev tracks latest

replicas:
  - name: SERVICE_NAME
    count: 1
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: production

images:
  - name: ORG/SERVICE_NAME
    newTag: v1.0.0  # Production pins versions

replicas:
  - name: SERVICE_NAME
    count: 3

patches:
  - path: patches/resources.yaml
  - path: patches/pod-disruption-budget.yaml
```

```yaml
# overlays/production/patches/resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: SERVICE_NAME
spec:
  template:
    spec:
      containers:
        - name: app
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
```

```yaml
# overlays/production/patches/pod-disruption-budget.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: SERVICE_NAME
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: SERVICE_NAME
```

## Automating Repo Creation

Build a CLI tool or script that creates new repos from the template and replaces placeholders:

```bash
#!/bin/bash
# create-service-config.sh
# Usage: ./create-service-config.sh <service-name> <team-name> <org>

SERVICE_NAME=$1
TEAM_NAME=$2
ORG=${3:-myorg}

if [ -z "$SERVICE_NAME" ] || [ -z "$TEAM_NAME" ]; then
    echo "Usage: $0 <service-name> <team-name> [org]"
    exit 1
fi

REPO_NAME="${SERVICE_NAME}-config"

# Create repo from template
gh repo create "${ORG}/${REPO_NAME}" \
    --template "${ORG}/service-config-template" \
    --private \
    --clone

cd "${REPO_NAME}"

# Replace all placeholders
find . -type f -name "*.yaml" -o -name "*.yml" | while read -r file; do
    sed -i "s/SERVICE_NAME/${SERVICE_NAME}/g" "$file"
    sed -i "s/TEAM_NAME/${TEAM_NAME}/g" "$file"
    sed -i "s|ORG|${ORG}|g" "$file"
done

# Update README
sed -i "s/SERVICE_NAME/${SERVICE_NAME}/g" README.md

git add .
git commit -m "initialize ${SERVICE_NAME} config from template"
git push

echo "Created ${ORG}/${REPO_NAME}"
echo "ArgoCD ApplicationSet will auto-discover this repo."
```

## Validation Workflow

Include a CI workflow that validates the repo structure:

```yaml
# .github/workflows/validate.yaml
name: Validate Config
on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install kustomize
        run: |
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/

      - name: Validate structure
        run: |
          # Check required files exist
          for env in dev staging production; do
            if [ ! -f "overlays/${env}/kustomization.yaml" ]; then
              echo "Missing overlays/${env}/kustomization.yaml"
              exit 1
            fi
          done

          if [ ! -f "base/kustomization.yaml" ]; then
            echo "Missing base/kustomization.yaml"
            exit 1
          fi

      - name: Build and validate kustomize
        run: |
          for env in dev staging production; do
            echo "Validating ${env}..."
            kustomize build "overlays/${env}" > /dev/null
            echo "${env} is valid"
          done

      - name: Validate with kubeconform
        run: |
          # Install kubeconform
          wget -q https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz
          tar xf kubeconform-linux-amd64.tar.gz
          sudo mv kubeconform /usr/local/bin/

          for env in dev staging production; do
            echo "Validating ${env} against K8s schema..."
            kustomize build "overlays/${env}" | kubeconform -strict -summary
          done
```

## CODEOWNERS for Review Requirements

The template includes a CODEOWNERS file that enforces review policies:

```text
# CODEOWNERS
# Platform team must review production changes
overlays/production/ @myorg/platform-team

# Service team owns base and dev/staging
base/ @myorg/TEAM_NAME
overlays/dev/ @myorg/TEAM_NAME
overlays/staging/ @myorg/TEAM_NAME
```

## ApplicationSet That Works with Templates

Since every repo follows the same structure, a single ApplicationSet handles all services:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-services
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - scmProvider:
              github:
                organization: myorg
                tokenRef:
                  secretName: github-token
                  key: token
              filters:
                - repositoryMatch: ".*-config$"
                  pathsExist:
                    - base/kustomization.yaml
                    - overlays/production/kustomization.yaml
          - list:
              elements:
                - environment: dev
                  cluster: https://dev-cluster.example.com
                - environment: staging
                  cluster: https://staging-cluster.example.com
                - environment: production
                  cluster: https://prod-cluster.example.com
  template:
    metadata:
      name: "{{repository}}-{{environment}}"
    spec:
      project: default
      source:
        repoURL: "{{url}}"
        targetRevision: main
        path: "overlays/{{environment}}"
      destination:
        server: "{{cluster}}"
        namespace: "{{environment}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

The `pathsExist` filter ensures only repos that follow the template structure are discovered.

## Evolving Templates Over Time

When you update the template, existing repos do not automatically get the changes. Handle this with:

1. **Template versioning** - Tag template releases (v1, v2, etc.)
2. **Upgrade scripts** - Create scripts that apply template changes to existing repos
3. **CI checks** - Add checks that compare repo structure against the latest template version

```bash
#!/bin/bash
# check-template-compliance.sh
TEMPLATE_VERSION="v2"

# Check for required files in v2
required_files=(
    "base/kustomization.yaml"
    "base/deployment.yaml"
    "base/service.yaml"
    "overlays/dev/kustomization.yaml"
    "overlays/staging/kustomization.yaml"
    "overlays/production/kustomization.yaml"
    ".github/workflows/validate.yaml"
)

missing=0
for f in "${required_files[@]}"; do
    if [ ! -f "$f" ]; then
        echo "MISSING: $f (required since template ${TEMPLATE_VERSION})"
        missing=$((missing + 1))
    fi
done

if [ $missing -gt 0 ]; then
    echo "Repo is not compliant with template ${TEMPLATE_VERSION}"
    exit 1
fi
echo "Repo is compliant with template ${TEMPLATE_VERSION}"
```

## Summary

Repository templates standardize how every service config repo is structured, enabling ApplicationSets to auto-discover services and teams to onboard new services quickly. Create a template repo with base manifests, environment overlays, validation workflows, and CODEOWNERS files. Automate repo creation with a script that replaces placeholders. Include CI validation to ensure repos stay compliant with the template over time. The upfront investment in templating pays off massively when you scale to dozens or hundreds of services.
