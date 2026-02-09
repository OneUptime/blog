# How to Implement Helm Chart Dependency Update Automation in CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, CI/CD, Automation

Description: Automate Helm chart dependency updates in CI/CD pipelines to keep charts current, catch breaking changes early, and maintain security compliance.

---

Helm charts often depend on other charts like databases, caching layers, or monitoring tools. Keeping these dependencies updated requires manual effort unless you automate the process. Implementing dependency updates in CI/CD pipelines ensures your charts use the latest stable versions while catching incompatibilities before production.

## Understanding Helm Chart Dependencies

Chart dependencies are defined in Chart.yaml and downloaded to the charts/ directory. When you declare a dependency, Helm downloads that chart and includes it during installation.

```yaml
# Chart.yaml
apiVersion: v2
name: myapp
version: 1.0.0
dependencies:
  - name: postgresql
    version: "12.1.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled

  - name: redis
    version: "17.3.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled

  - name: prometheus
    version: "15.10.0"
    repository: "https://prometheus-community.github.io/helm-charts"
    condition: monitoring.enabled
```

Update dependencies manually with helm dependency update.

```bash
# Update all dependencies to latest versions matching constraints
helm dependency update ./mychart

# This downloads charts to charts/ directory
ls ./mychart/charts/
# postgresql-12.1.0.tgz
# redis-17.3.0.tgz
# prometheus-15.10.0.tgz
```

## Creating a Dependency Update Script

Build a script that checks for and applies dependency updates.

```bash
#!/bin/bash
# scripts/update-dependencies.sh

set -e

CHART_DIR=${1:-.}
DRY_RUN=${DRY_RUN:-false}

echo "Checking Helm chart dependencies in $CHART_DIR"

cd "$CHART_DIR"

# Add required Helm repositories
echo "Adding Helm repositories..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add stable https://charts.helm.sh/stable
helm repo update

# Function to get latest version of a chart
get_latest_version() {
    local repo=$1
    local chart=$2
    local current_version=$3

    # Extract major version from current version
    local major_version=$(echo "$current_version" | cut -d. -f1)

    # Search for latest version in same major version
    helm search repo "$repo/$chart" --version "^${major_version}" -o json | \
        jq -r '.[0].version' 2>/dev/null || echo "$current_version"
}

# Parse Chart.yaml and check for updates
echo "Checking for dependency updates..."

dependencies=$(yq e '.dependencies[] | .name + "|" + .version + "|" + .repository' Chart.yaml)

declare -a updates=()

while IFS='|' read -r name version repository; do
    # Extract repository name from URL
    repo_name=$(echo "$repository" | sed 's|https://||' | cut -d'/' -f1 | tr '.' '-')

    latest_version=$(get_latest_version "$repo_name" "$name" "$version")

    if [ "$latest_version" != "$version" ]; then
        echo "Update available: $name $version -> $latest_version"
        updates+=("$name|$version|$latest_version")
    else
        echo "Up to date: $name $version"
    fi
done <<< "$dependencies"

# Apply updates
if [ ${#updates[@]} -gt 0 ]; then
    if [ "$DRY_RUN" = "true" ]; then
        echo "Dry run mode - would update:"
        printf '%s\n' "${updates[@]}"
    else
        echo "Applying updates..."

        for update in "${updates[@]}"; do
            IFS='|' read -r name old_version new_version <<< "$update"

            # Update Chart.yaml using yq
            yq e -i "(.dependencies[] | select(.name == \"$name\") | .version) = \"$new_version\"" Chart.yaml

            echo "Updated $name from $version to $new_version"
        done

        # Update Chart.yaml version (bump patch version)
        current_chart_version=$(yq e '.version' Chart.yaml)
        new_patch=$(($(echo "$current_chart_version" | cut -d. -f3) + 1))
        new_chart_version="$(echo "$current_chart_version" | cut -d. -f1,2).$new_patch"

        yq e -i ".version = \"$new_chart_version\"" Chart.yaml

        echo "Updated chart version from $current_chart_version to $new_chart_version"

        # Download updated dependencies
        helm dependency update

        echo "Dependencies updated successfully"
    fi
else
    echo "All dependencies are up to date"
fi
```

Make the script executable.

```bash
chmod +x scripts/update-dependencies.sh
```

Run it to update dependencies.

```bash
# Check for updates (dry run)
DRY_RUN=true ./scripts/update-dependencies.sh ./charts/myapp

# Apply updates
./scripts/update-dependencies.sh ./charts/myapp
```

## GitHub Actions Workflow for Automated Updates

Create a workflow that checks for dependency updates and creates pull requests.

```yaml
# .github/workflows/update-dependencies.yaml
name: Update Helm Dependencies

on:
  schedule:
    # Run every Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch:  # Allow manual trigger

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Install dependencies
        run: |
          # Install Helm
          curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

          # Install yq
          sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq

          # Install jq
          sudo apt-get update
          sudo apt-get install -y jq

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Check for updates
        id: check
        run: |
          chmod +x scripts/update-dependencies.sh
          ./scripts/update-dependencies.sh charts/myapp

          # Check if Chart.yaml changed
          if git diff --quiet charts/myapp/Chart.yaml; then
            echo "has_updates=false" >> $GITHUB_OUTPUT
          else
            echo "has_updates=true" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request
        if: steps.check.outputs.has_updates == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: update Helm chart dependencies"
          title: "Update Helm Chart Dependencies"
          body: |
            ## Helm Dependency Updates

            This PR updates Helm chart dependencies to their latest compatible versions.

            ### Changes
            - Chart dependencies have been updated
            - Chart version has been incremented

            ### Testing
            - [ ] Run `helm dependency update`
            - [ ] Test chart installation in staging
            - [ ] Verify all services start correctly

            **Note**: This PR was automatically created by the dependency update workflow.
          branch: update-helm-dependencies-${{ github.run_number }}
          delete-branch: true
          labels: |
            dependencies
            automated
```

## GitLab CI/CD Pipeline

Implement similar automation in GitLab.

```yaml
# .gitlab-ci.yml
stages:
  - check
  - update

variables:
  CHART_DIR: charts/myapp

check_dependencies:
  stage: check
  image: alpine/helm:latest
  before_script:
    - apk add --no-cache yq jq bash git
  script:
    - chmod +x scripts/update-dependencies.sh
    - DRY_RUN=true ./scripts/update-dependencies.sh $CHART_DIR
  only:
    - schedules
    - web

update_dependencies:
  stage: update
  image: alpine/helm:latest
  before_script:
    - apk add --no-cache yq jq bash git
    - git config user.name "GitLab CI"
    - git config user.email "ci@gitlab.com"
  script:
    - chmod +x scripts/update-dependencies.sh
    - ./scripts/update-dependencies.sh $CHART_DIR

    # Check for changes
    - |
      if git diff --quiet $CHART_DIR/Chart.yaml; then
        echo "No updates available"
        exit 0
      fi

    # Commit changes
    - git checkout -b update-dependencies-${CI_PIPELINE_ID}
    - git add $CHART_DIR/Chart.yaml $CHART_DIR/Chart.lock $CHART_DIR/charts/
    - git commit -m "chore: update Helm dependencies"

    # Push and create MR
    - git push -o merge_request.create \
               -o merge_request.target=main \
               -o merge_request.title="Update Helm Dependencies" \
               origin update-dependencies-${CI_PIPELINE_ID}
  only:
    - schedules
    - web
```

## Testing Updated Dependencies

Create a test workflow that validates updates.

```yaml
# .github/workflows/test-dependencies.yaml
name: Test Dependency Updates

on:
  pull_request:
    paths:
      - 'charts/**/Chart.yaml'
      - 'charts/**/Chart.lock'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Install Helm
        uses: azure/setup-helm@v3

      - name: Update dependencies
        run: |
          helm dependency update charts/myapp

      - name: Lint chart
        run: |
          helm lint charts/myapp --strict

      - name: Create kind cluster
        uses: helm/kind-action@v1

      - name: Test installation
        run: |
          helm install test-release charts/myapp \
            --namespace test \
            --create-namespace \
            --wait \
            --timeout 5m

      - name: Run smoke tests
        run: |
          kubectl get pods -n test
          kubectl get svc -n test

          # Wait for all pods to be ready
          kubectl wait --for=condition=ready pod \
            --all \
            -n test \
            --timeout=300s

      - name: Uninstall
        if: always()
        run: |
          helm uninstall test-release -n test
```

## Dependency Version Constraints

Use semantic versioning constraints to control updates.

```yaml
# Chart.yaml with version constraints
dependencies:
  # Exact version
  - name: postgresql
    version: "12.1.0"
    repository: "https://charts.bitnami.com/bitnami"

  # Patch updates only (^12.1.0 = >=12.1.0 <13.0.0)
  - name: redis
    version: "^17.3.0"
    repository: "https://charts.bitnami.com/bitnami"

  # Minor and patch updates (~15.10.0 = >=15.10.0 <15.11.0)
  - name: prometheus
    version: "~15.10.0"
    repository: "https://prometheus-community.github.io/helm-charts"

  # Any version in range
  - name: grafana
    version: ">=6.0.0 <7.0.0"
    repository: "https://grafana.github.io/helm-charts"
```

## Handling Breaking Changes

Add compatibility checks to your update script.

```bash
#!/bin/bash
# scripts/check-compatibility.sh

CHART_DIR=$1
OLD_VERSION=$2
NEW_VERSION=$3
DEPENDENCY_NAME=$4

echo "Checking compatibility: $DEPENDENCY_NAME $OLD_VERSION -> $NEW_VERSION"

# Check for major version changes
OLD_MAJOR=$(echo "$OLD_VERSION" | cut -d. -f1)
NEW_MAJOR=$(echo "$NEW_VERSION" | cut -d. -f1)

if [ "$OLD_MAJOR" != "$NEW_MAJOR" ]; then
    echo "WARNING: Major version change detected"
    echo "Manual review required for breaking changes"
    exit 1
fi

# Run helm template and compare outputs
helm template test-old "$CHART_DIR" > /tmp/old-template.yaml
helm dependency update "$CHART_DIR"
helm template test-new "$CHART_DIR" > /tmp/new-template.yaml

# Compare templates
if diff /tmp/old-template.yaml /tmp/new-template.yaml > /tmp/template-diff.txt; then
    echo "No template changes detected"
else
    echo "Template changes detected:"
    cat /tmp/template-diff.txt
fi
```

## Monitoring Dependency Health

Track dependency updates and vulnerabilities.

```yaml
# .github/workflows/dependency-check.yaml
name: Dependency Security Check

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Install Helm
        uses: azure/setup-helm@v3

      - name: Check for known vulnerabilities
        run: |
          # Install helm-snyk plugin or similar
          helm plugin install https://github.com/snyk/helm-snyk

          # Scan dependencies
          helm snyk test charts/myapp

      - name: Generate dependency report
        run: |
          cat > dependency-report.md << EOF
          # Helm Dependency Report

          Generated: $(date)

          ## Dependencies
          EOF

          yq e '.dependencies[] | "- " + .name + " " + .version' charts/myapp/Chart.yaml >> dependency-report.md

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: dependency-report
          path: dependency-report.md
```

Automating Helm chart dependency updates in CI/CD pipelines keeps your charts current and secure. Use scheduled workflows to check for updates, create pull requests for review, and run comprehensive tests before merging. Implement version constraints to control update scope and add compatibility checks to catch breaking changes early.
