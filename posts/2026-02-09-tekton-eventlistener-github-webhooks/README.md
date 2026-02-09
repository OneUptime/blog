# How to Create a Tekton EventListener That Triggers Pipelines from GitHub Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Kubernetes, CI/CD, GitHub, Webhooks

Description: Build a Tekton EventListener that automatically triggers CI/CD pipelines from GitHub webhook events including push, pull request, and release events with dynamic parameter extraction.

---

Tekton EventListeners enable event-driven CI/CD by responding to external triggers like GitHub webhooks. Instead of polling for changes, EventListeners react immediately to repository events, triggering pipelines with contextual information extracted from webhook payloads. This guide shows you how to build a complete webhook-driven pipeline system with Tekton.

## Understanding Tekton Triggers

Tekton Triggers consist of EventListeners (receive webhooks), TriggerBindings (extract data from payloads), TriggerTemplates (define what to create), and Triggers (connect them together). This architecture provides flexible, declarative webhook handling without custom code.

## Installing Tekton Triggers

Install Tekton Triggers after Tekton Pipelines:

```bash
# Install Tekton Pipelines
kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Triggers
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml

# Install Tekton Interceptors
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/interceptors.yaml

# Verify installation
kubectl get pods -n tekton-pipelines
```

## Creating a Basic EventListener

Set up an EventListener for GitHub push events:

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-listener
  namespace: tekton-pipelines
spec:
  serviceAccountName: tekton-triggers-sa
  triggers:
    - name: github-push
      bindings:
        - ref: github-push-binding
      template:
        ref: pipeline-trigger-template
```

Create the TriggerBinding to extract data:

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-push-binding
  namespace: tekton-pipelines
spec:
  params:
    - name: git-repo-url
      value: $(body.repository.clone_url)
    - name: git-revision
      value: $(body.head_commit.id)
    - name: git-ref
      value: $(body.ref)
    - name: repo-name
      value: $(body.repository.name)
    - name: repo-full-name
      value: $(body.repository.full_name)
```

Create the TriggerTemplate:

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: pipeline-trigger-template
  namespace: tekton-pipelines
spec:
  params:
    - name: git-repo-url
    - name: git-revision
    - name: git-ref
    - name: repo-name
    - name: repo-full-name

  resourcetemplates:
    - apiVersion: tekton.dev/v1beta1
      kind: PipelineRun
      metadata:
        generateName: $(tt.params.repo-name)-run-
      spec:
        pipelineRef:
          name: build-and-deploy
        params:
          - name: repo-url
            value: $(tt.params.git-repo-url)
          - name: revision
            value: $(tt.params.git-revision)
          - name: ref
            value: $(tt.params.git-ref)
        workspaces:
          - name: shared-workspace
            volumeClaimTemplate:
              spec:
                accessModes:
                  - ReadWriteOnce
                resources:
                  requests:
                    storage: 1Gi
```

## Setting Up RBAC

Create service account with permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-sa
  namespace: tekton-pipelines

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tekton-triggers-role
  namespace: tekton-pipelines
rules:
  - apiGroups: ["triggers.tekton.dev"]
    resources: ["eventlisteners", "triggerbindings", "triggertemplates", "triggers"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["tekton.dev"]
    resources: ["pipelineruns", "pipelineresources", "taskruns"]
    verbs: ["create", "get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-binding
  namespace: tekton-pipelines
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: tekton-triggers-role
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-sa
    namespace: tekton-pipelines
```

## Exposing the EventListener

Create an Ingress for webhook access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: github-webhook-ingress
  namespace: tekton-pipelines
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - webhooks.example.com
      secretName: webhook-tls
  rules:
    - host: webhooks.example.com
      http:
        paths:
          - path: /github
            pathType: Prefix
            backend:
              service:
                name: el-github-listener
                port:
                  number: 8080
```

## Configuring GitHub Webhooks

Add webhook in GitHub repository settings:

```bash
# Get the EventListener service URL
kubectl get svc el-github-listener -n tekton-pipelines

# In GitHub repository:
# Settings > Webhooks > Add webhook
# Payload URL: https://webhooks.example.com/github
# Content type: application/json
# Secret: your-webhook-secret
# Events: Push, Pull request, Release
```

## Adding Webhook Secret Validation

Use interceptors to validate GitHub signatures:

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-listener
  namespace: tekton-pipelines
spec:
  serviceAccountName: tekton-triggers-sa
  triggers:
    - name: github-push
      interceptors:
        - ref:
            name: github
          params:
            - name: secretRef
              value:
                secretName: github-webhook-secret
                secretKey: secret
            - name: eventTypes
              value:
                - push
                - pull_request
      bindings:
        - ref: github-push-binding
      template:
        ref: pipeline-trigger-template
```

Create the secret:

```bash
kubectl create secret generic github-webhook-secret \
  --from-literal=secret=your-webhook-secret \
  -n tekton-pipelines
```

## Handling Different Event Types

Create triggers for different events:

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-listener
spec:
  serviceAccountName: tekton-triggers-sa
  triggers:
    # Push events
    - name: github-push
      interceptors:
        - ref:
            name: github
          params:
            - name: eventTypes
              value: ["push"]
      bindings:
        - ref: github-push-binding
      template:
        ref: build-template

    # Pull request events
    - name: github-pr
      interceptors:
        - ref:
            name: github
          params:
            - name: eventTypes
              value: ["pull_request"]
        - ref:
            name: cel
          params:
            - name: filter
              value: "body.action in ['opened', 'synchronize', 'reopened']"
      bindings:
        - ref: github-pr-binding
      template:
        ref: pr-template

    # Release events
    - name: github-release
      interceptors:
        - ref:
            name: github
          params:
            - name: eventTypes
              value: ["release"]
        - ref:
            name: cel
          params:
            - name: filter
              value: "body.action == 'published'"
      bindings:
        - ref: github-release-binding
      template:
        ref: release-template
```

Create PR-specific binding:

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-pr-binding
spec:
  params:
    - name: git-repo-url
      value: $(body.pull_request.head.repo.clone_url)
    - name: git-revision
      value: $(body.pull_request.head.sha)
    - name: pr-number
      value: $(body.pull_request.number)
    - name: pr-title
      value: $(body.pull_request.title)
    - name: base-branch
      value: $(body.pull_request.base.ref)
    - name: head-branch
      value: $(body.pull_request.head.ref)
```

## Using CEL Filters

Add conditional filtering with CEL:

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-listener
spec:
  triggers:
    - name: main-branch-only
      interceptors:
        - ref:
            name: cel
          params:
            - name: filter
              value: "body.ref == 'refs/heads/main'"
      bindings:
        - ref: github-push-binding
      template:
        ref: deploy-production-template

    - name: feature-branches
      interceptors:
        - ref:
            name: cel
          params:
            - name: filter
              value: "body.ref.startsWith('refs/heads/feature/')"
      bindings:
        - ref: github-push-binding
      template:
        ref: deploy-dev-template
```

## Extracting Custom Parameters

Use overlays to transform data:

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-advanced-binding
spec:
  params:
    - name: git-repo-url
      value: $(body.repository.clone_url)
    - name: short-sha
      value: $(body.head_commit.id)
    - name: image-tag
      value: $(body.ref)-$(body.head_commit.id)
    - name: commit-message
      value: $(body.head_commit.message)
    - name: committer
      value: $(body.head_commit.committer.username)
```

## Posting Status Back to GitHub

Update commit status from pipeline:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: github-status
spec:
  params:
    - name: repo-full-name
    - name: sha
    - name: state
      description: "pending, success, failure, error"
    - name: context
      default: "tekton-pipeline"
    - name: description

  steps:
    - name: post-status
      image: curlimages/curl:latest
      env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: github-token
              key: token
      script: |
        #!/bin/sh
        curl -X POST \
          -H "Authorization: token $GITHUB_TOKEN" \
          -H "Accept: application/vnd.github.v3+json" \
          https://api.github.com/repos/$(params.repo-full-name)/statuses/$(params.sha) \
          -d '{
            "state": "$(params.state)",
            "context": "$(params.context)",
            "description": "$(params.description)",
            "target_url": "https://tekton.example.com/pipelineruns"
          }'
```

## Monitoring EventListener

Check EventListener logs:

```bash
# Get EventListener pod
kubectl get pods -n tekton-pipelines -l eventlistener=github-listener

# View logs
kubectl logs -f -n tekton-pipelines <eventlistener-pod>

# Check service
kubectl get svc el-github-listener -n tekton-pipelines

# Test webhook locally
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

## Debugging Webhook Issues

Troubleshoot common problems:

```bash
# Check if webhook is receiving requests
kubectl logs -n tekton-pipelines -l eventlistener=github-listener | grep "event received"

# Verify RBAC permissions
kubectl auth can-i create pipelineruns \
  --as=system:serviceaccount:tekton-pipelines:tekton-triggers-sa \
  -n tekton-pipelines

# Check TriggerBinding parameters
kubectl describe triggerbinding github-push-binding -n tekton-pipelines

# View recent PipelineRuns
kubectl get pipelineruns -n tekton-pipelines --sort-by=.metadata.creationTimestamp
```

## Conclusion

Tekton EventListeners provide a powerful, declarative way to trigger CI/CD pipelines from GitHub webhooks. By extracting data from webhook payloads and dynamically creating PipelineRuns, you build responsive, event-driven automation. The combination of interceptors for validation and filtering, bindings for data extraction, and templates for resource creation offers flexibility while maintaining simplicity. This approach scales well, supports multiple event types, and integrates seamlessly with GitHub workflows.
