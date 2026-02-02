# How to Implement Preview Environments in GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Preview Environments, DevOps, CI/CD, Review Apps, Kubernetes, Docker

Description: A practical guide to implementing preview environments in GitLab CI. Learn how to automatically deploy isolated environments for every merge request, enabling faster code reviews and better collaboration.

---

Preview environments give every merge request its own isolated deployment. Reviewers can test changes in a real environment before merging. No more "it works on my machine" problems.

## Why Preview Environments Matter

Manual testing on shared staging environments creates bottlenecks. Teams wait for deployments. Changes clash with each other. Preview environments solve these problems by giving each feature branch a dedicated space to run.

```mermaid
flowchart LR
    MR[Merge Request] --> Pipeline[GitLab Pipeline]
    Pipeline --> Build[Build Image]
    Build --> Deploy[Deploy Preview]
    Deploy --> URL[Unique URL]
    URL --> Review[Code Review]
    Review --> Merge[Merge to Main]
    Merge --> Cleanup[Cleanup Preview]
```

Benefits include:

1. **Parallel Testing** - Multiple features tested simultaneously
2. **Faster Reviews** - Reviewers see changes immediately
3. **Safer Merges** - Catch integration issues before main
4. **Stakeholder Feedback** - Non-technical team members can test early

## Prerequisites

Before setting up preview environments, you need:

- GitLab project with CI/CD enabled
- Container registry (GitLab's built-in registry works well)
- Kubernetes cluster or Docker host for deployments
- Wildcard DNS record pointing to your cluster

## Basic Setup with Docker Compose

The following configuration creates a simple preview environment using Docker Compose. Each merge request gets its own set of containers with a unique port.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy
  - cleanup

variables:
  # Use merge request IID for unique naming
  PREVIEW_NAME: preview-mr-$CI_MERGE_REQUEST_IID
  # Container image tag based on commit SHA
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

# Build the application image and push to GitLab registry
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Deploy preview environment for merge requests
deploy_preview:
  stage: deploy
  image: docker:24
  services:
    - docker:24-dind
  variables:
    # Calculate unique port based on MR number to avoid conflicts
    PREVIEW_PORT: ${CI_MERGE_REQUEST_IID}080
  environment:
    name: preview/$CI_MERGE_REQUEST_IID
    url: http://$PREVIEW_HOST:$PREVIEW_PORT
    on_stop: stop_preview
    auto_stop_in: 1 week
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker pull $IMAGE_TAG
    # Stop any existing preview for this MR
    - docker stop $PREVIEW_NAME || true
    - docker rm $PREVIEW_NAME || true
    # Start new preview container
    - |
      docker run -d \
        --name $PREVIEW_NAME \
        -p $PREVIEW_PORT:80 \
        -e DATABASE_URL=$PREVIEW_DATABASE_URL \
        $IMAGE_TAG
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Stop and remove preview environment when MR is closed or merged
stop_preview:
  stage: cleanup
  image: docker:24
  services:
    - docker:24-dind
  variables:
    GIT_STRATEGY: none
  environment:
    name: preview/$CI_MERGE_REQUEST_IID
    action: stop
  script:
    - docker stop $PREVIEW_NAME || true
    - docker rm $PREVIEW_NAME || true
  rules:
    - if: $CI_MERGE_REQUEST_IID
      when: manual
```

## Kubernetes Preview Environments

For production-grade preview environments, Kubernetes provides better isolation and resource management. The following approach uses dynamic namespaces with Helm deployments.

```mermaid
flowchart TB
    subgraph GitLab
        MR[Merge Request]
        Pipeline[CI Pipeline]
    end

    subgraph Kubernetes Cluster
        NS1[preview-mr-123]
        NS2[preview-mr-124]
        NS3[preview-mr-125]

        NS1 --> Pod1[App Pod]
        NS1 --> Svc1[Service]
        NS1 --> Ing1[Ingress]

        NS2 --> Pod2[App Pod]
        NS2 --> Svc2[Service]
        NS2 --> Ing2[Ingress]
    end

    MR --> Pipeline
    Pipeline --> NS1
    Pipeline --> NS2
```

### Kubernetes Deployment Configuration

The Helm chart handles namespace creation, deployment, service, and ingress for each preview environment.

```yaml
# helm/preview/values.yaml
replicaCount: 1

image:
  repository: ""
  tag: ""
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: ""
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: preview-tls
      hosts:
        - ""

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

env: []
```

### Deployment Template

The deployment template references the dynamic values passed during Helm installation.

```yaml
# helm/preview/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
  labels:
    app: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
        - name: app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 80
          {{- if .Values.env }}
          env:
            {{- toYaml .Values.env | nindent 12 }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          readinessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 15
            periodSeconds: 20
```

### Ingress Template

Each preview environment gets its own subdomain through the ingress configuration.

```yaml
# helm/preview/templates/ingress.yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}
  annotations:
    {{- toYaml .Values.ingress.annotations | nindent 4 }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}-{{ $.Release.Name }}
    {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ $.Release.Name }}
                port:
                  number: 80
          {{- end }}
    {{- end }}
{{- end }}
```

### GitLab CI for Kubernetes

The pipeline integrates with Kubernetes using GitLab's built-in variables and Helm for deployments.

```yaml
# .gitlab-ci.yml for Kubernetes deployments
stages:
  - build
  - deploy
  - cleanup

variables:
  PREVIEW_NAMESPACE: preview-mr-$CI_MERGE_REQUEST_IID
  PREVIEW_HOST: mr-$CI_MERGE_REQUEST_IID.preview.example.com
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

# Build and push container image to registry
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Deploy to Kubernetes using Helm
deploy_preview:
  stage: deploy
  image:
    name: alpine/helm:3.12
    entrypoint: [""]
  environment:
    name: preview/$CI_MERGE_REQUEST_IID
    url: https://$PREVIEW_HOST
    on_stop: stop_preview
    auto_stop_in: 1 week
  before_script:
    # Configure kubectl with cluster credentials
    - apk add --no-cache kubectl
    - kubectl config set-cluster preview --server=$KUBE_SERVER --certificate-authority=$KUBE_CA_CERT
    - kubectl config set-credentials deployer --token=$KUBE_TOKEN
    - kubectl config set-context preview --cluster=preview --user=deployer
    - kubectl config use-context preview
  script:
    # Create namespace if it does not exist
    - kubectl create namespace $PREVIEW_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    # Deploy with Helm
    - |
      helm upgrade --install $PREVIEW_NAMESPACE ./helm/preview \
        --namespace $PREVIEW_NAMESPACE \
        --set image.repository=$CI_REGISTRY_IMAGE \
        --set image.tag=$CI_COMMIT_SHORT_SHA \
        --set ingress.hosts[0].host=$PREVIEW_HOST \
        --set ingress.hosts[0].paths[0].path=/ \
        --set ingress.hosts[0].paths[0].pathType=Prefix \
        --set ingress.tls[0].hosts[0]=$PREVIEW_HOST \
        --wait --timeout=300s
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Cleanup preview environment
stop_preview:
  stage: cleanup
  image:
    name: alpine/helm:3.12
    entrypoint: [""]
  variables:
    GIT_STRATEGY: none
  environment:
    name: preview/$CI_MERGE_REQUEST_IID
    action: stop
  before_script:
    - apk add --no-cache kubectl
    - kubectl config set-cluster preview --server=$KUBE_SERVER --certificate-authority=$KUBE_CA_CERT
    - kubectl config set-credentials deployer --token=$KUBE_TOKEN
    - kubectl config set-context preview --cluster=preview --user=deployer
    - kubectl config use-context preview
  script:
    # Uninstall Helm release and delete namespace
    - helm uninstall $PREVIEW_NAMESPACE --namespace $PREVIEW_NAMESPACE || true
    - kubectl delete namespace $PREVIEW_NAMESPACE --ignore-not-found
  rules:
    - if: $CI_MERGE_REQUEST_IID
      when: manual
```

## Database Handling Strategies

Preview environments need database isolation. Several approaches work depending on your requirements.

### Ephemeral Databases

Each preview gets a fresh database that starts empty or with seed data.

```yaml
# Include database in preview deployment
# helm/preview/templates/database.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {{ .Release.Name }}-db
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}-db
    spec:
      containers:
        - name: postgres
          image: postgres:15
          env:
            - name: POSTGRES_DB
              value: preview
            - name: POSTGRES_USER
              value: preview
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ .Release.Name }}-db-secret
                  key: password
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          emptyDir: {}
```

### Shared Database with Schema Isolation

For larger datasets, use a shared database server with isolated schemas per preview.

```yaml
# Schema creation job that runs before main deployment
# helm/preview/templates/db-setup-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-db-setup
  annotations:
    helm.sh/hook: pre-install,pre-upgrade
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: setup
          image: postgres:15
          env:
            - name: PGHOST
              value: {{ .Values.database.host }}
            - name: PGUSER
              value: {{ .Values.database.user }}
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: shared-db-credentials
                  key: password
          command:
            - /bin/sh
            - -c
            - |
              # Create schema for the preview environment
              psql -c "CREATE SCHEMA IF NOT EXISTS {{ .Release.Name | replace "-" "_" }};"
              # Run migrations
              psql -f /migrations/schema.sql
```

### Database Snapshot Cloning

For realistic testing, clone from production snapshots. AWS RDS and similar services support fast cloning.

```yaml
# .gitlab-ci.yml snippet for database cloning
create_preview_db:
  stage: deploy
  image: amazon/aws-cli:2.13
  script:
    # Clone from snapshot for realistic data
    - |
      aws rds restore-db-instance-from-db-snapshot \
        --db-instance-identifier preview-mr-$CI_MERGE_REQUEST_IID \
        --db-snapshot-identifier prod-snapshot-latest \
        --db-instance-class db.t3.micro \
        --tags Key=Environment,Value=preview Key=MR,Value=$CI_MERGE_REQUEST_IID
    # Wait for database to be available
    - |
      aws rds wait db-instance-available \
        --db-instance-identifier preview-mr-$CI_MERGE_REQUEST_IID
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## Wildcard DNS and SSL

Preview environments need accessible URLs. Wildcard DNS makes management simple.

### DNS Configuration

Set up a wildcard A record pointing to your ingress controller.

```
*.preview.example.com    A    203.0.113.10
```

### Automatic SSL with cert-manager

cert-manager handles SSL certificates automatically for each preview environment.

```yaml
# Install cert-manager issuer for preview environments
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx

---
# Wildcard certificate for all preview environments
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: preview-wildcard
  namespace: cert-manager
spec:
  secretName: preview-wildcard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.preview.example.com"
```

## Environment Variables and Secrets

Preview environments need access to configuration without exposing sensitive data.

### Using GitLab CI Variables

Define variables at the project or group level in GitLab.

```yaml
# .gitlab-ci.yml
deploy_preview:
  stage: deploy
  variables:
    # Public configuration
    APP_ENV: preview
    LOG_LEVEL: debug
  script:
    - |
      helm upgrade --install $PREVIEW_NAMESPACE ./helm/preview \
        --set env[0].name=APP_ENV \
        --set env[0].value=$APP_ENV \
        --set env[1].name=DATABASE_URL \
        --set env[1].value=$PREVIEW_DATABASE_URL \
        --set env[2].name=API_KEY \
        --set env[2].value=$PREVIEW_API_KEY
```

### External Secrets Integration

For production-grade secret management, integrate with HashiCorp Vault or AWS Secrets Manager.

```yaml
# Using External Secrets Operator with preview environments
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: {{ .Release.Name }}-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: {{ .Release.Name }}-secrets
  data:
    - secretKey: database-url
      remoteRef:
        key: preview/database
        property: url
    - secretKey: api-key
      remoteRef:
        key: preview/api
        property: key
```

## Merge Request Comments

Automatically post the preview URL as a comment on merge requests for easy access.

```yaml
# Post preview URL to merge request
post_preview_url:
  stage: deploy
  image: curlimages/curl:8.1.2
  needs:
    - deploy_preview
  script:
    # Post comment with preview URL using GitLab API
    - |
      curl --request POST \
        --header "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
        --form "body=Preview environment deployed: https://$PREVIEW_HOST" \
        "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes"
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## Resource Limits and Cleanup

Prevent resource exhaustion by limiting preview environments and automating cleanup.

### Maximum Concurrent Previews

Limit the number of active preview environments.

```yaml
# .gitlab-ci.yml with resource limits
deploy_preview:
  stage: deploy
  before_script:
    # Count active preview namespaces
    - ACTIVE_PREVIEWS=$(kubectl get namespaces -l type=preview --no-headers | wc -l)
    # Fail if too many previews exist
    - |
      if [ "$ACTIVE_PREVIEWS" -ge 20 ]; then
        echo "Too many active preview environments ($ACTIVE_PREVIEWS). Clean up old previews first."
        exit 1
      fi
  script:
    # Label namespace for tracking
    - kubectl label namespace $PREVIEW_NAMESPACE type=preview --overwrite
    # Continue with deployment
```

### Automatic Cleanup with GitLab Auto Stop

GitLab's auto_stop_in feature handles cleanup automatically.

```yaml
deploy_preview:
  environment:
    name: preview/$CI_MERGE_REQUEST_IID
    auto_stop_in: 3 days
    on_stop: stop_preview
```

### Scheduled Cleanup Job

Run periodic cleanup for orphaned environments.

```yaml
# Scheduled cleanup job
cleanup_orphaned:
  stage: cleanup
  image: bitnami/kubectl:1.27
  script:
    # Find preview namespaces older than 7 days
    - |
      kubectl get namespaces -l type=preview -o json | \
        jq -r '.items[] | select(.metadata.creationTimestamp | fromdateiso8601 < (now - 604800)) | .metadata.name' | \
        while read ns; do
          echo "Cleaning up orphaned namespace: $ns"
          helm uninstall $(echo $ns | sed 's/preview-//') --namespace $ns || true
          kubectl delete namespace $ns
        done
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## Monitoring Preview Environments

Track preview environment health and usage.

```mermaid
flowchart LR
    Preview[Preview Env] --> Metrics[Prometheus]
    Preview --> Logs[Loki]
    Metrics --> Grafana[Grafana]
    Logs --> Grafana
    Grafana --> Alerts[Slack Alerts]
```

### Prometheus Metrics

Add Prometheus annotations to preview deployments for metric collection.

```yaml
# helm/preview/templates/deployment.yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
```

### Resource Usage Dashboard

Track resource consumption across preview environments.

```yaml
# Grafana dashboard query examples
# CPU usage by preview environment
sum(rate(container_cpu_usage_seconds_total{namespace=~"preview-.*"}[5m])) by (namespace)

# Memory usage by preview environment
sum(container_memory_usage_bytes{namespace=~"preview-.*"}) by (namespace)

# Active preview count
count(kube_namespace_labels{namespace=~"preview-.*"})
```

## Full Pipeline Example

Here is a complete GitLab CI configuration combining all concepts.

```yaml
# .gitlab-ci.yml - Complete preview environment pipeline
stages:
  - build
  - test
  - deploy
  - notify
  - cleanup

variables:
  PREVIEW_NAMESPACE: preview-mr-$CI_MERGE_REQUEST_IID
  PREVIEW_HOST: mr-$CI_MERGE_REQUEST_IID.preview.example.com
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

# Build stage creates container image
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $IMAGE_TAG -t $CI_REGISTRY_IMAGE:mr-$CI_MERGE_REQUEST_IID .
    - docker push $IMAGE_TAG
    - docker push $CI_REGISTRY_IMAGE:mr-$CI_MERGE_REQUEST_IID
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Run tests against the built image
test:
  stage: test
  image: $IMAGE_TAG
  services:
    - postgres:15
  variables:
    DATABASE_URL: postgres://postgres:postgres@postgres:5432/test
  script:
    - npm test
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Deploy preview environment to Kubernetes
deploy_preview:
  stage: deploy
  image:
    name: alpine/helm:3.12
    entrypoint: [""]
  environment:
    name: preview/$CI_MERGE_REQUEST_IID
    url: https://$PREVIEW_HOST
    on_stop: stop_preview
    auto_stop_in: 1 week
  before_script:
    - apk add --no-cache kubectl curl jq
    - kubectl config set-cluster k8s --server=$KUBE_SERVER --certificate-authority=$KUBE_CA_CERT
    - kubectl config set-credentials deployer --token=$KUBE_TOKEN
    - kubectl config set-context k8s --cluster=k8s --user=deployer
    - kubectl config use-context k8s
    # Check preview limit
    - |
      ACTIVE=$(kubectl get ns -l type=preview --no-headers 2>/dev/null | wc -l || echo 0)
      if [ "$ACTIVE" -ge 25 ]; then
        echo "Preview limit reached. Clean up old environments."
        exit 1
      fi
  script:
    # Create and label namespace
    - kubectl create namespace $PREVIEW_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    - kubectl label namespace $PREVIEW_NAMESPACE type=preview mr=$CI_MERGE_REQUEST_IID --overwrite
    # Deploy with Helm
    - |
      helm upgrade --install app ./helm/preview \
        --namespace $PREVIEW_NAMESPACE \
        --set image.repository=$CI_REGISTRY_IMAGE \
        --set image.tag=$CI_COMMIT_SHORT_SHA \
        --set ingress.hosts[0].host=$PREVIEW_HOST \
        --set ingress.hosts[0].paths[0].path=/ \
        --set ingress.hosts[0].paths[0].pathType=Prefix \
        --set ingress.tls[0].hosts[0]=$PREVIEW_HOST \
        --set env[0].name=APP_ENV \
        --set env[0].value=preview \
        --set env[1].name=DATABASE_URL \
        --set env[1].value=$PREVIEW_DATABASE_URL \
        --wait --timeout=600s
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Post preview URL to merge request
notify_preview:
  stage: notify
  image: curlimages/curl:8.1.2
  needs:
    - deploy_preview
  script:
    - |
      curl --fail --request POST \
        --header "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
        --form "body=## Preview Environment Ready

      Your changes are deployed and ready for review.

      **URL:** https://$PREVIEW_HOST

      **Commit:** $CI_COMMIT_SHORT_SHA

      **Auto-cleanup:** 1 week

      ---
      *Deployed by GitLab CI*" \
        "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes"
  rules:
    - if: $CI_MERGE_REQUEST_IID

# Stop preview environment
stop_preview:
  stage: cleanup
  image:
    name: alpine/helm:3.12
    entrypoint: [""]
  variables:
    GIT_STRATEGY: none
  environment:
    name: preview/$CI_MERGE_REQUEST_IID
    action: stop
  before_script:
    - apk add --no-cache kubectl
    - kubectl config set-cluster k8s --server=$KUBE_SERVER --certificate-authority=$KUBE_CA_CERT
    - kubectl config set-credentials deployer --token=$KUBE_TOKEN
    - kubectl config set-context k8s --cluster=k8s --user=deployer
    - kubectl config use-context k8s
  script:
    - helm uninstall app --namespace $PREVIEW_NAMESPACE || true
    - kubectl delete namespace $PREVIEW_NAMESPACE --ignore-not-found
  rules:
    - if: $CI_MERGE_REQUEST_IID
      when: manual

# Scheduled cleanup for orphaned environments
cleanup_orphaned:
  stage: cleanup
  image:
    name: alpine/helm:3.12
    entrypoint: [""]
  before_script:
    - apk add --no-cache kubectl jq
    - kubectl config set-cluster k8s --server=$KUBE_SERVER --certificate-authority=$KUBE_CA_CERT
    - kubectl config set-credentials deployer --token=$KUBE_TOKEN
    - kubectl config set-context k8s --cluster=k8s --user=deployer
    - kubectl config use-context k8s
  script:
    - |
      echo "Checking for orphaned preview environments..."
      kubectl get ns -l type=preview -o json | \
        jq -r '.items[] | select(.metadata.creationTimestamp | fromdateiso8601 < (now - 604800)) | .metadata.name' | \
        while read ns; do
          echo "Removing orphaned environment: $ns"
          helm uninstall app --namespace $ns || true
          kubectl delete namespace $ns --ignore-not-found
        done
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## Troubleshooting Common Issues

### Preview Deployment Fails

Check the Helm deployment status and pod logs.

```bash
# Check Helm release status
helm status app -n preview-mr-123

# Check pod status
kubectl get pods -n preview-mr-123

# View pod logs
kubectl logs -n preview-mr-123 -l app=app --tail=100

# Describe failing pod
kubectl describe pod -n preview-mr-123 -l app=app
```

### DNS Not Resolving

Verify wildcard DNS configuration.

```bash
# Check DNS resolution
dig mr-123.preview.example.com

# Verify ingress is created
kubectl get ingress -n preview-mr-123

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

### SSL Certificate Issues

Check cert-manager status and certificate resources.

```bash
# List certificates
kubectl get certificates -A

# Check certificate status
kubectl describe certificate preview-wildcard -n cert-manager

# View cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

---

Preview environments transform code review from theoretical discussion to hands-on testing. Start with the basic Docker Compose approach, then migrate to Kubernetes as your team grows. The investment pays off in faster reviews, fewer production bugs, and happier developers.
