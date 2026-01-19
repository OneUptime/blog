# How to Set Up Ephemeral Preview Environments in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Preview Environments, GitOps, CI/CD, Pull Requests, Developer Experience, DevOps

Description: Learn how to create ephemeral preview environments in Kubernetes that spin up automatically for pull requests, enabling isolated testing and faster code reviews.

---

Ephemeral preview environments create isolated, temporary deployments for each pull request or feature branch. They enable developers and reviewers to test changes in a production-like environment before merging.

## Preview Environments Architecture

```mermaid
flowchart TD
    subgraph "Developer Workflow"
        DEV[Developer] --> |Opens PR| PR[Pull Request]
        PR --> |Triggers| CI[CI Pipeline]
    end
    
    subgraph "Preview Environment"
        CI --> |Creates| NS[Namespace: pr-123]
        NS --> DEPLOY[Deployment]
        NS --> SVC[Service]
        NS --> ING[Ingress]
        ING --> |pr-123.preview.company.com| PREVIEW[Preview URL]
    end
    
    subgraph "Lifecycle"
        PREVIEW --> |PR Merged/Closed| CLEANUP[Cleanup]
        CLEANUP --> |Delete| NS
    end
```

| Feature | Benefit |
|---------|---------|
| Isolated testing | No conflicts between branches |
| Automatic deployment | Zero manual effort |
| Unique URLs | Easy sharing and review |
| Automatic cleanup | No resource waste |

## Method 1: GitHub Actions + kubectl

### Workflow Configuration

```yaml
# .github/workflows/preview.yaml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      pull-requests: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=pr
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig
      
      - name: Deploy Preview Environment
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
          IMAGE_TAG: pr-${{ github.event.pull_request.number }}
        run: |
          export KUBECONFIG=kubeconfig
          
          # Create namespace
          kubectl create namespace preview-pr-${PR_NUMBER} --dry-run=client -o yaml | kubectl apply -f -
          
          # Label namespace for cleanup
          kubectl label namespace preview-pr-${PR_NUMBER} \
            preview=true \
            pr-number="${PR_NUMBER}" \
            --overwrite
          
          # Apply manifests
          envsubst < kubernetes/preview/deployment.yaml | kubectl apply -f -
          envsubst < kubernetes/preview/service.yaml | kubectl apply -f -
          envsubst < kubernetes/preview/ingress.yaml | kubectl apply -f -
          
          # Wait for deployment
          kubectl rollout status deployment/myapp -n preview-pr-${PR_NUMBER} --timeout=5m
      
      - name: Get Preview URL
        id: preview-url
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          PREVIEW_URL="https://pr-${PR_NUMBER}.preview.mycompany.com"
          echo "url=${PREVIEW_URL}" >> $GITHUB_OUTPUT
      
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.preview-url.outputs.url }}';
            const body = `🚀 Preview environment deployed!\n\n**Preview URL:** ${url}\n\nThis environment will be automatically destroyed when the PR is closed.`;
            
            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            
            const botComment = comments.find(comment => 
              comment.user.type === 'Bot' && comment.body.includes('Preview environment')
            );
            
            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body
              });
            }
```

### Cleanup Workflow

```yaml
# .github/workflows/preview-cleanup.yaml
name: Cleanup Preview Environment

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
      
      - name: Delete Preview Environment
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          export KUBECONFIG=kubeconfig
          kubectl delete namespace preview-pr-${PR_NUMBER} --ignore-not-found=true
      
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: '🧹 Preview environment has been cleaned up.'
            });
```

### Kubernetes Manifests

```yaml
# kubernetes/preview/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: preview-pr-${PR_NUMBER}
  labels:
    app: myapp
    preview: "true"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: ghcr.io/myorg/myapp:${IMAGE_TAG}
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              value: postgres://postgres:password@postgres:5432/preview_${PR_NUMBER}
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
---
# kubernetes/preview/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: preview-pr-${PR_NUMBER}
spec:
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: myapp
---
# kubernetes/preview/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: preview-pr-${PR_NUMBER}
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - pr-${PR_NUMBER}.preview.mycompany.com
      secretName: preview-tls
  rules:
    - host: pr-${PR_NUMBER}.preview.mycompany.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
```

## Method 2: ArgoCD ApplicationSets

### ApplicationSet Configuration

```yaml
# argocd/preview-applicationset.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: preview-environments
  namespace: argocd
spec:
  generators:
    - pullRequest:
        github:
          owner: myorg
          repo: myapp
          tokenRef:
            secretName: github-token
            key: token
        requeueAfterSeconds: 60
  template:
    metadata:
      name: 'preview-{{number}}'
      namespace: argocd
      finalizers:
        - resources-finalizer.argocd.argoproj.io
    spec:
      project: preview
      source:
        repoURL: https://github.com/myorg/myapp.git
        targetRevision: '{{head_sha}}'
        path: kubernetes/preview
        helm:
          values: |
            image:
              tag: pr-{{number}}
            ingress:
              host: pr-{{number}}.preview.mycompany.com
            namespace: preview-pr-{{number}}
      destination:
        server: https://kubernetes.default.svc
        namespace: preview-pr-{{number}}
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

### Helm Chart for Preview

```yaml
# kubernetes/preview/Chart.yaml
apiVersion: v2
name: myapp-preview
version: 1.0.0
```

```yaml
# kubernetes/preview/values.yaml
replicaCount: 1

image:
  repository: ghcr.io/myorg/myapp
  tag: latest
  pullPolicy: Always

service:
  port: 80

ingress:
  enabled: true
  host: preview.mycompany.com
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Preview-specific database
postgresql:
  enabled: true
  auth:
    database: preview
```

```yaml
# kubernetes/preview/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
  namespace: {{ .Values.namespace | default .Release.Namespace }}
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
            - containerPort: 8080
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

## Method 3: Namespace Per Branch with Kustomize

### Directory Structure

```
kubernetes/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── overlays/
    └── preview/
        ├── kustomization.yaml
        └── preview-patches.yaml
```

### Base Kustomization

```yaml
# kubernetes/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml

commonLabels:
  app: myapp
```

### Preview Overlay

```yaml
# kubernetes/overlays/preview/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: preview-${PR_NUMBER}

resources:
  - ../../base

namePrefix: preview-

commonLabels:
  preview: "true"
  pr-number: "${PR_NUMBER}"

images:
  - name: myapp
    newName: ghcr.io/myorg/myapp
    newTag: pr-${PR_NUMBER}

patches:
  - path: preview-patches.yaml

replacements:
  - source:
      kind: ConfigMap
      name: preview-config
      fieldPath: data.PR_NUMBER
    targets:
      - select:
          kind: Ingress
        fieldPaths:
          - spec.rules.0.host
        options:
          delimiter: '.'
          index: 0
```

```yaml
# kubernetes/overlays/preview/preview-patches.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: app
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
spec:
  rules:
    - host: pr-${PR_NUMBER}.preview.mycompany.com
```

## Method 4: PullUp (Dedicated Tool)

### Installation

```bash
# Install PullUp controller
kubectl apply -f https://raw.githubusercontent.com/pullup-io/pullup/main/deploy/install.yaml
```

### PullUp Configuration

```yaml
# pullup.yaml
apiVersion: pullup.io/v1
kind: PreviewEnvironment
metadata:
  name: myapp-previews
spec:
  github:
    owner: myorg
    repo: myapp
  
  template:
    namespace: "preview-{{.PR.Number}}"
    
    resources:
      - apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: myapp
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: myapp
          template:
            metadata:
              labels:
                app: myapp
            spec:
              containers:
                - name: app
                  image: "ghcr.io/myorg/myapp:pr-{{.PR.Number}}"
                  ports:
                    - containerPort: 8080
      
      - apiVersion: v1
        kind: Service
        metadata:
          name: myapp
        spec:
          ports:
            - port: 80
              targetPort: 8080
          selector:
            app: myapp
      
      - apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: myapp
        spec:
          rules:
            - host: "pr-{{.PR.Number}}.preview.mycompany.com"
              http:
                paths:
                  - path: /
                    pathType: Prefix
                    backend:
                      service:
                        name: myapp
                        port:
                          number: 80
  
  cleanup:
    onClose: true
    ttl: 72h  # Delete after 72 hours even if PR is open
```

## Shared Resources

### Shared Database for Previews

```yaml
# kubernetes/preview/shared-postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-shared
  namespace: preview-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-shared
  template:
    metadata:
      labels:
        app: postgres-shared
    spec:
      containers:
        - name: postgres
          image: postgres:15
          env:
            - name: POSTGRES_PASSWORD
              value: preview-password
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-shared
  namespace: preview-system
spec:
  ports:
    - port: 5432
  selector:
    app: postgres-shared
```

### Database Per Preview

```yaml
# Init container to create database
initContainers:
  - name: create-db
    image: postgres:15
    command:
      - /bin/sh
      - -c
      - |
        psql -h postgres-shared.preview-system -U postgres -c "CREATE DATABASE preview_${PR_NUMBER};" || true
    env:
      - name: PGPASSWORD
        value: preview-password
```

## DNS Configuration

### Wildcard DNS with External-DNS

```yaml
# external-dns-preview.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: external-dns
spec:
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      containers:
        - name: external-dns
          image: registry.k8s.io/external-dns/external-dns:v0.14.0
          args:
            - --source=ingress
            - --domain-filter=preview.mycompany.com
            - --provider=cloudflare
            - --cloudflare-proxied
          env:
            - name: CF_API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: cloudflare-api-token
                  key: token
```

### Wildcard Certificate

```yaml
# cert-manager-wildcard.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: preview-wildcard
  namespace: preview-system
spec:
  secretName: preview-wildcard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.preview.mycompany.com"
```

## Cleanup Strategies

### TTL-based Cleanup

```yaml
# cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: preview-cleanup
  namespace: preview-system
spec:
  schedule: "0 * * * *"  # Every hour
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: preview-cleanup
          containers:
            - name: cleanup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Delete namespaces older than 72 hours
                  kubectl get ns -l preview=true -o json | \
                  jq -r '.items[] | select(
                    (now - (.metadata.creationTimestamp | fromdateiso8601)) > 259200
                  ) | .metadata.name' | \
                  xargs -r kubectl delete ns
          restartPolicy: OnFailure
```

### Resource Quotas

```yaml
# preview-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: preview-quota
spec:
  hard:
    requests.cpu: "500m"
    requests.memory: "512Mi"
    limits.cpu: "1"
    limits.memory: "1Gi"
    pods: "10"
```

## Summary

| Method | Complexity | Best For |
|--------|------------|----------|
| GitHub Actions | Low | Simple setups |
| ArgoCD ApplicationSets | Medium | GitOps workflows |
| Kustomize | Medium | Existing Kustomize users |
| PullUp | Low | Dedicated solution |

## Related Posts

- [How to Set Up a Local Kubernetes Development Environment with Tilt](https://oneuptime.com/blog/post/2026-01-19-kubernetes-tilt-local-development/view) - Local development
- [How to Configure Kubernetes External DNS for Automatic DNS Records](https://oneuptime.com/blog/post/2026-01-19-kubernetes-external-dns-automatic-records/view) - DNS automation
- [How to Test Kubernetes Manifests with Conftest and OPA](https://oneuptime.com/blog/post/2026-01-19-kubernetes-conftest-opa-testing/view) - Policy testing
