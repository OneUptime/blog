# How to Implement Helm Chart Versioning Strategies with SemVer and Chart Museum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps

Description: Master semantic versioning strategies for Helm charts and learn how to set up Chart Museum as a private chart repository with automated versioning workflows.

---

Proper versioning is critical for managing Helm charts in production environments. Semantic versioning provides a clear framework for communicating changes to chart users, while Chart Museum offers a robust solution for hosting private chart repositories. Together, they create a professional chart management system that scales with your organization.

## Understanding Semantic Versioning for Charts

Semantic versioning (SemVer) uses a three-part version number: MAJOR.MINOR.PATCH. Each component carries specific meaning about the nature of changes in a release. For Helm charts, this translates to:

- MAJOR: Breaking changes that require user intervention during upgrades
- MINOR: New features or capabilities that maintain backward compatibility
- PATCH: Bug fixes and minor improvements with no API changes

A version like 2.5.3 indicates the chart has undergone 2 major revisions, added 5 minor features since the last major release, and received 3 patches since the last minor release.

## Chart Version vs. App Version

Helm charts maintain two distinct versions in `Chart.yaml`:

```yaml
apiVersion: v2
name: myapp
version: 1.5.2        # Chart version
appVersion: "3.2.1"   # Application version
description: My application Helm chart
type: application
```

The chart version tracks changes to the Helm templates and configuration structure, while appVersion indicates which version of the actual application gets deployed. These versions can and should increment independently.

## Versioning Strategy for Chart Changes

When you modify templates to add a new optional configuration parameter, increment the MINOR version. The change adds functionality but existing installations continue working without modification:

```yaml
# Before: version 1.5.2
# After: version 1.6.0

# Added new optional feature
{{- if .Values.monitoring.enabled }}
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: {{ .Values.monitoring.port | quote }}
{{- end }}
```

When you rename a required value or change the template structure in a way that breaks existing values files, increment the MAJOR version:

```yaml
# Before: version 1.6.0
# After: version 2.0.0

# Breaking change: renamed configuration section
# Old: .Values.database
# New: .Values.persistence.database
```

For bug fixes that correct template errors without changing behavior or adding features, increment the PATCH version:

```yaml
# Before: version 1.6.0
# After: version 1.6.1

# Fixed: incorrect indentation in service template
```

## Installing Chart Museum

Chart Museum provides a simple HTTP server for hosting Helm charts. Deploy it in your Kubernetes cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chartmuseum
  namespace: helm-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: chartmuseum
  template:
    metadata:
      labels:
        app: chartmuseum
    spec:
      containers:
      - name: chartmuseum
        image: ghcr.io/helm/chartmuseum:v0.16.0
        ports:
        - containerPort: 8080
        env:
        - name: STORAGE
          value: local
        - name: STORAGE_LOCAL_ROOTDIR
          value: /charts
        - name: DISABLE_API
          value: "false"
        - name: ALLOW_OVERWRITE
          value: "false"
        - name: DEPTH
          value: "1"
        volumeMounts:
        - name: charts-storage
          mountPath: /charts
      volumes:
      - name: charts-storage
        persistentVolumeClaim:
          claimName: chartmuseum-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: chartmuseum
  namespace: helm-system
spec:
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    app: chartmuseum
```

Create the persistent volume claim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: chartmuseum-pvc
  namespace: helm-system
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Configuring Chart Museum with Cloud Storage

For production environments, configure Chart Museum with cloud storage. Here's an AWS S3 configuration:

```yaml
env:
- name: STORAGE
  value: amazon
- name: STORAGE_AMAZON_BUCKET
  value: my-helm-charts
- name: STORAGE_AMAZON_REGION
  value: us-west-2
- name: STORAGE_AMAZON_ENDPOINT
  value: ""
- name: AWS_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: chartmuseum-secret
      key: aws-access-key-id
- name: AWS_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: chartmuseum-secret
      key: aws-secret-access-key
```

For Google Cloud Storage:

```yaml
env:
- name: STORAGE
  value: google
- name: STORAGE_GOOGLE_BUCKET
  value: my-helm-charts
- name: STORAGE_GOOGLE_PREFIX
  value: charts
- name: GOOGLE_APPLICATION_CREDENTIALS
  value: /credentials/gcs-key.json
volumeMounts:
- name: gcs-credentials
  mountPath: /credentials
  readOnly: true
volumes:
- name: gcs-credentials
  secret:
    secretName: gcs-credentials
```

## Publishing Charts to Chart Museum

Package and upload your chart to Chart Museum:

```bash
# Package the chart
helm package ./mychart

# Add Chart Museum as a repository
helm repo add chartmuseum http://chartmuseum.helm-system.svc.cluster.local:8080

# Install the helm-push plugin
helm plugin install https://github.com/chartmuseum/helm-push

# Push the chart
helm cm-push mychart-1.6.0.tgz chartmuseum

# Or use curl for direct upload
curl --data-binary "@mychart-1.6.0.tgz" \
  http://chartmuseum.helm-system.svc.cluster.local:8080/api/charts
```

## Automated Versioning in CI/CD

Create a script that automatically increments versions based on commit messages:

```bash
#!/bin/bash
# auto-version.sh - Automatically version charts based on git commits

CHART_DIR="$1"
CHART_FILE="$CHART_DIR/Chart.yaml"

if [ ! -f "$CHART_FILE" ]; then
    echo "Error: Chart.yaml not found"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(grep "^version:" "$CHART_FILE" | awk '{print $2}')

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Check git commits since last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
COMMITS=$(git log ${LAST_TAG}..HEAD --oneline)

# Determine version bump
if echo "$COMMITS" | grep -q "BREAKING CHANGE:" || \
   echo "$COMMITS" | grep -q "^[^:]*!:"; then
    # Major version bump
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    echo "Detected breaking change, bumping major version"
elif echo "$COMMITS" | grep -q "^feat:"; then
    # Minor version bump
    MINOR=$((MINOR + 1))
    PATCH=0
    echo "Detected new feature, bumping minor version"
else
    # Patch version bump
    PATCH=$((PATCH + 1))
    echo "Detected bug fix, bumping patch version"
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Update Chart.yaml
sed -i.bak "s/^version: .*/version: $NEW_VERSION/" "$CHART_FILE"
rm "$CHART_FILE.bak"

echo "Version updated: $CURRENT_VERSION -> $NEW_VERSION"
echo "$NEW_VERSION"
```

## GitHub Actions Workflow for Chart Publishing

Create a complete CI/CD workflow:

```yaml
name: Release Charts

on:
  push:
    branches:
      - main
    paths:
      - 'charts/**'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      with:
        fetch-depth: 0

    - name: Configure Git
      run: |
        git config user.name "$GITHUB_ACTOR"
        git config user.email "$GITHUB_ACTOR@users.noreply.github.com"

    - name: Install Helm
      uses: azure/setup-helm@v3

    - name: Auto-version charts
      run: |
        for chart in charts/*/; do
          ./scripts/auto-version.sh "$chart"
        done

    - name: Package charts
      run: |
        for chart in charts/*/; do
          helm package "$chart" -d .deploy
        done

    - name: Install helm-push plugin
      run: helm plugin install https://github.com/chartmuseum/helm-push

    - name: Add Chart Museum repository
      run: |
        helm repo add chartmuseum https://charts.example.com \
          --username ${{ secrets.CHARTMUSEUM_USER }} \
          --password ${{ secrets.CHARTMUSEUM_PASSWORD }}

    - name: Push charts to Chart Museum
      run: |
        for chart in .deploy/*.tgz; do
          helm cm-push "$chart" chartmuseum
        done

    - name: Create Git tags
      run: |
        for chart in .deploy/*.tgz; do
          name=$(basename "$chart" | cut -d'-' -f1)
          version=$(basename "$chart" | sed "s/${name}-//" | sed 's/.tgz//')
          git tag "${name}-v${version}"
        done
        git push --tags
```

## Setting Up Chart Museum Authentication

Enable basic authentication for Chart Museum:

```yaml
env:
- name: BASIC_AUTH_USER
  valueFrom:
    secretKeyRef:
      name: chartmuseum-auth
      key: username
- name: BASIC_AUTH_PASS
  valueFrom:
    secretKeyRef:
      name: chartmuseum-auth
      key: password
```

Create the authentication secret:

```bash
kubectl create secret generic chartmuseum-auth \
  --from-literal=username=admin \
  --from-literal=password=$(openssl rand -base64 32) \
  -n helm-system
```

## Chart Museum with Ingress

Expose Chart Museum externally with TLS:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chartmuseum
  namespace: helm-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: 50m
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - charts.example.com
    secretName: chartmuseum-tls
  rules:
  - host: charts.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: chartmuseum
            port:
              number: 8080
```

## Version Constraints in Chart Dependencies

Use version constraints when declaring chart dependencies:

```yaml
dependencies:
- name: postgresql
  version: "~12.1.0"    # Allows 12.1.x
  repository: https://charts.bitnami.com/bitnami
  condition: postgresql.enabled

- name: redis
  version: "^17.0.0"    # Allows 17.x.x
  repository: https://charts.bitnami.com/bitnami
  condition: redis.enabled
```

The tilde operator (~) allows PATCH updates, while the caret operator (^) allows MINOR updates. This provides control over how dependency versions can change during updates.

Proper versioning combined with Chart Museum creates a professional chart distribution system. Your users can trust version numbers to communicate the impact of updates, while you maintain complete control over chart distribution and access.
