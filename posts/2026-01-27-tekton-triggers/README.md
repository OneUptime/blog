# How to Use Tekton Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Kubernetes, CI/CD, GitOps, DevOps, Automation, Webhooks, GitHub, GitLab

Description: A complete guide to using Tekton Triggers to automatically start CI/CD pipelines from external events like Git pushes, pull requests, and webhooks.

---

> Tekton Triggers turn your Kubernetes cluster into a fully automated CI/CD system. Push code to Git, and your pipelines run automatically. No external CI server required.

## What Are Tekton Triggers?

Tekton Triggers extend Tekton Pipelines by enabling event-driven automation. When an external event occurs (like a Git push), Triggers can automatically create and start pipeline runs.

The core components are:

1. **EventListener** - Receives incoming HTTP requests (webhooks)
2. **TriggerTemplate** - Defines what resources to create when triggered
3. **TriggerBinding** - Extracts data from events and passes it to templates
4. **Interceptors** - Filter and process events before triggering

```
                                 +------------------+
GitHub/GitLab Webhook ------>    | EventListener    |
                                 +------------------+
                                         |
                                         v
                                 +------------------+
                                 | Interceptors     |
                                 | (CEL, GitHub,    |
                                 |  GitLab, etc.)   |
                                 +------------------+
                                         |
                                         v
                                 +------------------+
                                 | TriggerBinding   |
                                 | (Extract params) |
                                 +------------------+
                                         |
                                         v
                                 +------------------+
                                 | TriggerTemplate  |
                                 | (Create PipelineRun) |
                                 +------------------+
```

## Installing Tekton Triggers

First, ensure you have Tekton Pipelines installed:

```bash
# Install Tekton Pipelines (if not already installed)
kubectl apply --filename https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Triggers
kubectl apply --filename https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml

# Install Tekton Triggers interceptors
kubectl apply --filename https://storage.googleapis.com/tekton-releases/triggers/latest/interceptors.yaml

# Verify installation
kubectl get pods -n tekton-pipelines
```

## EventListener

The EventListener is a Kubernetes service that listens for incoming webhook requests. It acts as the entry point for all external events.

```yaml
# eventlistener.yaml
# Creates an HTTP endpoint that receives webhook events
# and routes them through the defined triggers
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-listener
  namespace: tekton-pipelines
spec:
  # Service account with permissions to create PipelineRuns
  serviceAccountName: tekton-triggers-sa

  triggers:
    # Each trigger handles a specific type of event
    - name: github-push-trigger
      # Interceptors filter and process events
      interceptors:
        - ref:
            name: "github"
          params:
            # Validate webhook signature using secret
            - name: "secretRef"
              value:
                secretName: github-webhook-secret
                secretKey: secret
            # Only process push events
            - name: "eventTypes"
              value: ["push"]
      # Extract data from the webhook payload
      bindings:
        - ref: github-push-binding
      # Define what to create when triggered
      template:
        ref: pipeline-template

  resources:
    kubernetesResource:
      spec:
        template:
          spec:
            serviceAccountName: tekton-triggers-sa
            containers:
              - resources:
                  requests:
                    memory: "64Mi"
                    cpu: "100m"
                  limits:
                    memory: "128Mi"
                    cpu: "200m"
```

### Exposing the EventListener

The EventListener creates a Service. You need to expose it externally:

```yaml
# ingress.yaml
# Expose the EventListener to receive webhooks from GitHub/GitLab
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tekton-triggers-ingress
  namespace: tekton-pipelines
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - webhooks.example.com
      secretName: webhooks-tls
  rules:
    - host: webhooks.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                # EventListener service name follows pattern: el-<eventlistener-name>
                name: el-github-listener
                port:
                  number: 8080
```

## TriggerTemplate

The TriggerTemplate defines what Kubernetes resources to create when a trigger fires. Most commonly, this is a PipelineRun.

```yaml
# triggertemplate.yaml
# Template for creating PipelineRun resources
# Parameters are filled in by TriggerBindings
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: pipeline-template
  namespace: tekton-pipelines
spec:
  # Parameters that can be substituted into the template
  params:
    - name: git-revision
      description: The git revision (commit SHA)
    - name: git-repo-url
      description: The git repository URL
    - name: git-repo-name
      description: The name of the git repository
    - name: git-branch
      description: The branch that was pushed to
      default: main

  resourcetemplates:
    # Create a PipelineRun when triggered
    - apiVersion: tekton.dev/v1beta1
      kind: PipelineRun
      metadata:
        # Generate unique name using timestamp
        generateName: $(tt.params.git-repo-name)-run-
        namespace: tekton-pipelines
        labels:
          # Add labels for easy filtering
          tekton.dev/pipeline: build-and-deploy
          triggers.tekton.dev/trigger: github-push
          app: $(tt.params.git-repo-name)
      spec:
        pipelineRef:
          name: build-and-deploy-pipeline
        params:
          - name: repo-url
            value: $(tt.params.git-repo-url)
          - name: revision
            value: $(tt.params.git-revision)
          - name: branch
            value: $(tt.params.git-branch)
        workspaces:
          - name: shared-workspace
            volumeClaimTemplate:
              spec:
                accessModes:
                  - ReadWriteOnce
                resources:
                  requests:
                    storage: 1Gi
          - name: docker-credentials
            secret:
              secretName: docker-credentials
```

### Multiple Resources in a Template

You can create multiple resources from a single trigger:

```yaml
# triggertemplate-multi.yaml
# Create multiple resources from a single trigger
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: multi-resource-template
  namespace: tekton-pipelines
spec:
  params:
    - name: git-revision
    - name: git-repo-name
    - name: namespace
      default: default

  resourcetemplates:
    # First, create a namespace if needed
    - apiVersion: v1
      kind: Namespace
      metadata:
        name: $(tt.params.namespace)

    # Then create a ConfigMap with build info
    - apiVersion: v1
      kind: ConfigMap
      metadata:
        name: build-info-$(tt.params.git-revision)
        namespace: $(tt.params.namespace)
      data:
        revision: $(tt.params.git-revision)
        repo: $(tt.params.git-repo-name)
        timestamp: "$(tt.params.git-revision)"

    # Finally, create the PipelineRun
    - apiVersion: tekton.dev/v1beta1
      kind: PipelineRun
      metadata:
        generateName: $(tt.params.git-repo-name)-
        namespace: $(tt.params.namespace)
      spec:
        pipelineRef:
          name: build-pipeline
```

## TriggerBinding

TriggerBindings extract data from incoming events and map them to parameters for the TriggerTemplate.

```yaml
# triggerbinding-github.yaml
# Extract parameters from GitHub push webhook payload
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-push-binding
  namespace: tekton-pipelines
spec:
  params:
    # Extract the commit SHA from the webhook body
    # $(body.xxx) references the JSON payload
    - name: git-revision
      value: $(body.after)

    # Extract the repository clone URL
    - name: git-repo-url
      value: $(body.repository.clone_url)

    # Extract the repository name
    - name: git-repo-name
      value: $(body.repository.name)

    # Extract the branch name from the ref
    # refs/heads/main becomes main
    - name: git-branch
      value: $(body.ref)

    # You can also extract from headers
    # - name: event-type
    #   value: $(header.X-GitHub-Event)
```

### GitLab TriggerBinding

```yaml
# triggerbinding-gitlab.yaml
# Extract parameters from GitLab push webhook payload
# GitLab uses different JSON structure than GitHub
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: gitlab-push-binding
  namespace: tekton-pipelines
spec:
  params:
    # GitLab uses 'checkout_sha' for the commit
    - name: git-revision
      value: $(body.checkout_sha)

    # GitLab repository URL
    - name: git-repo-url
      value: $(body.repository.git_http_url)

    # Repository name in GitLab
    - name: git-repo-name
      value: $(body.repository.name)

    # Branch reference
    - name: git-branch
      value: $(body.ref)

    # GitLab provides user info
    - name: git-user
      value: $(body.user_username)
```

### ClusterTriggerBinding

For bindings used across multiple namespaces:

```yaml
# clustertriggerbinding.yaml
# Cluster-scoped binding available to all namespaces
apiVersion: triggers.tekton.dev/v1beta1
kind: ClusterTriggerBinding
metadata:
  name: github-push-cluster-binding
spec:
  params:
    - name: git-revision
      value: $(body.after)
    - name: git-repo-url
      value: $(body.repository.clone_url)
    - name: git-repo-name
      value: $(body.repository.name)
```

## Interceptors

Interceptors process events before they trigger pipelines. They can validate, filter, and modify incoming requests.

### GitHub Interceptor

```yaml
# Validates GitHub webhook signatures and filters events
interceptors:
  - ref:
      name: "github"
    params:
      # Validate webhook secret for security
      - name: "secretRef"
        value:
          secretName: github-webhook-secret
          secretKey: secret
      # Only trigger on specific event types
      - name: "eventTypes"
        value: ["push", "pull_request"]
```

Create the webhook secret:

```bash
# Generate a random secret
WEBHOOK_SECRET=$(openssl rand -hex 20)

# Create the Kubernetes secret
kubectl create secret generic github-webhook-secret \
  --from-literal=secret=$WEBHOOK_SECRET \
  -n tekton-pipelines

# Use this same secret when configuring the webhook in GitHub
echo "Configure GitHub webhook with secret: $WEBHOOK_SECRET"
```

### GitLab Interceptor

```yaml
# Validates GitLab webhook tokens
interceptors:
  - ref:
      name: "gitlab"
    params:
      # GitLab uses a secret token header
      - name: "secretRef"
        value:
          secretName: gitlab-webhook-secret
          secretKey: token
      # Filter by event types
      - name: "eventTypes"
        value: ["Push Hook", "Merge Request Hook"]
```

### Bitbucket Interceptor

```yaml
# Validates Bitbucket webhook events
interceptors:
  - ref:
      name: "bitbucket"
    params:
      - name: "secretRef"
        value:
          secretName: bitbucket-webhook-secret
          secretKey: secret
      - name: "eventTypes"
        value: ["repo:push"]
```

## CEL Filters

CEL (Common Expression Language) interceptors provide powerful filtering and transformation capabilities.

### Basic CEL Filter

```yaml
# cel-filter-basic.yaml
# Filter events using CEL expressions
interceptors:
  # First validate the webhook
  - ref:
      name: "github"
    params:
      - name: "secretRef"
        value:
          secretName: github-webhook-secret
          secretKey: secret

  # Then apply CEL filter
  - ref:
      name: "cel"
    params:
      # Only trigger for pushes to main branch
      - name: "filter"
        value: "body.ref == 'refs/heads/main'"
```

### Advanced CEL Filters

```yaml
# cel-filter-advanced.yaml
# Complex filtering with multiple conditions
interceptors:
  - ref:
      name: "github"
    params:
      - name: "secretRef"
        value:
          secretName: github-webhook-secret
          secretKey: secret
      - name: "eventTypes"
        value: ["push", "pull_request"]

  - ref:
      name: "cel"
    params:
      # Complex filter expression
      - name: "filter"
        value: >
          (
            header.match('X-GitHub-Event', 'push') &&
            body.ref.startsWith('refs/heads/') &&
            !body.ref.endsWith('/dependabot') &&
            body.repository.name != 'test-repo'
          ) || (
            header.match('X-GitHub-Event', 'pull_request') &&
            body.action in ['opened', 'synchronize'] &&
            body.pull_request.base.ref == 'main'
          )

      # Add custom fields to the payload
      - name: "overlays"
        value:
          # Extract just the branch name
          - key: branch_name
            expression: "body.ref.split('/')[2]"
          # Determine if this is a release branch
          - key: is_release
            expression: "body.ref.startsWith('refs/heads/release/')"
          # Truncate commit SHA to short form
          - key: short_sha
            expression: "body.after.substring(0, 7)"
```

### CEL Overlays for Data Transformation

```yaml
# cel-overlays.yaml
# Transform webhook data before passing to templates
interceptors:
  - ref:
      name: "cel"
    params:
      - name: "overlays"
        value:
          # Extract branch name from refs/heads/feature/xyz
          - key: branch
            expression: "body.ref.split('/').last()"

          # Create a sanitized name for Kubernetes resources
          - key: safe_name
            expression: >
              body.repository.name.lowerAscii()
                .replace('_', '-')
                .replace('.', '-')

          # Build the Docker image tag
          - key: image_tag
            expression: >
              body.repository.name + ':' + body.after.substring(0, 7)

          # Determine environment from branch
          - key: target_env
            expression: >
              body.ref == 'refs/heads/main' ? 'production' :
              body.ref.startsWith('refs/heads/release/') ? 'staging' :
              'development'
```

Then use the overlay values in your TriggerBinding:

```yaml
# triggerbinding-with-overlays.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-binding-overlays
spec:
  params:
    # Use the CEL overlay values with extensions prefix
    - name: branch
      value: $(extensions.branch)
    - name: image-tag
      value: $(extensions.image_tag)
    - name: environment
      value: $(extensions.target_env)
    - name: safe-name
      value: $(extensions.safe_name)
```

## GitHub Webhook Integration

### Setting Up GitHub Webhooks

1. Configure the EventListener for GitHub:

```yaml
# github-eventlistener.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: github-listener
  namespace: tekton-pipelines
spec:
  serviceAccountName: tekton-triggers-sa
  triggers:
    # Trigger for push events
    - name: push-trigger
      interceptors:
        - ref:
            name: "github"
          params:
            - name: "secretRef"
              value:
                secretName: github-webhook-secret
                secretKey: secret
            - name: "eventTypes"
              value: ["push"]
        - ref:
            name: "cel"
          params:
            - name: "filter"
              value: "body.ref.startsWith('refs/heads/')"
      bindings:
        - ref: github-push-binding
      template:
        ref: build-template

    # Separate trigger for pull requests
    - name: pr-trigger
      interceptors:
        - ref:
            name: "github"
          params:
            - name: "secretRef"
              value:
                secretName: github-webhook-secret
                secretKey: secret
            - name: "eventTypes"
              value: ["pull_request"]
        - ref:
            name: "cel"
          params:
            - name: "filter"
              value: "body.action in ['opened', 'synchronize', 'reopened']"
      bindings:
        - ref: github-pr-binding
      template:
        ref: pr-template
```

2. Create the TriggerBinding for pull requests:

```yaml
# triggerbinding-github-pr.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-pr-binding
  namespace: tekton-pipelines
spec:
  params:
    # PR head commit SHA
    - name: git-revision
      value: $(body.pull_request.head.sha)
    # Clone URL of the fork (for external PRs)
    - name: git-repo-url
      value: $(body.pull_request.head.repo.clone_url)
    # PR number for status updates
    - name: pr-number
      value: $(body.pull_request.number)
    # Target branch
    - name: target-branch
      value: $(body.pull_request.base.ref)
    # PR title for notifications
    - name: pr-title
      value: $(body.pull_request.title)
```

3. Configure the webhook in GitHub:

```
Repository Settings > Webhooks > Add webhook

Payload URL: https://webhooks.example.com
Content type: application/json
Secret: <your-webhook-secret>
Events: Push events, Pull request events
Active: checked
```

## GitLab Webhook Integration

### Setting Up GitLab Webhooks

```yaml
# gitlab-eventlistener.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: gitlab-listener
  namespace: tekton-pipelines
spec:
  serviceAccountName: tekton-triggers-sa
  triggers:
    # Push events
    - name: gitlab-push
      interceptors:
        - ref:
            name: "gitlab"
          params:
            - name: "secretRef"
              value:
                secretName: gitlab-webhook-secret
                secretKey: token
            - name: "eventTypes"
              value: ["Push Hook"]
        - ref:
            name: "cel"
          params:
            # Skip branch deletions (where after is all zeros)
            - name: "filter"
              value: "body.after != '0000000000000000000000000000000000000000'"
      bindings:
        - ref: gitlab-push-binding
      template:
        ref: build-template

    # Merge request events
    - name: gitlab-mr
      interceptors:
        - ref:
            name: "gitlab"
          params:
            - name: "secretRef"
              value:
                secretName: gitlab-webhook-secret
                secretKey: token
            - name: "eventTypes"
              value: ["Merge Request Hook"]
        - ref:
            name: "cel"
          params:
            - name: "filter"
              value: "body.object_attributes.action in ['open', 'update', 'reopen']"
      bindings:
        - ref: gitlab-mr-binding
      template:
        ref: mr-template
```

Create the GitLab merge request binding:

```yaml
# triggerbinding-gitlab-mr.yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: gitlab-mr-binding
  namespace: tekton-pipelines
spec:
  params:
    # Source branch last commit
    - name: git-revision
      value: $(body.object_attributes.last_commit.id)
    # Source repository URL
    - name: git-repo-url
      value: $(body.object_attributes.source.git_http_url)
    # MR IID (internal ID)
    - name: mr-iid
      value: $(body.object_attributes.iid)
    # Target branch
    - name: target-branch
      value: $(body.object_attributes.target_branch)
    # MR title
    - name: mr-title
      value: $(body.object_attributes.title)
```

Configure in GitLab:

```
Settings > Webhooks

URL: https://webhooks.example.com
Secret token: <your-gitlab-token>
Trigger: Push events, Merge request events
Enable SSL verification: checked
```

## RBAC and Service Accounts

Tekton Triggers needs appropriate permissions:

```yaml
# rbac.yaml
# Service account for Tekton Triggers
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-sa
  namespace: tekton-pipelines

---
# Role with permissions to create pipeline resources
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tekton-triggers-role
  namespace: tekton-pipelines
rules:
  # Permission to create PipelineRuns and TaskRuns
  - apiGroups: ["tekton.dev"]
    resources: ["pipelineruns", "taskruns"]
    verbs: ["create", "get", "list"]
  # Permission to create trigger resources
  - apiGroups: ["triggers.tekton.dev"]
    resources: ["eventlisteners", "triggerbindings", "triggertemplates", "triggers"]
    verbs: ["get", "list", "watch"]
  # Permission to read secrets for webhook validation
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch"]
  # Permission to create ConfigMaps if needed
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["create", "get", "list"]

---
# Bind the role to the service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-rolebinding
  namespace: tekton-pipelines
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-sa
    namespace: tekton-pipelines
roleRef:
  kind: Role
  name: tekton-triggers-role
  apiGroup: rbac.authorization.k8s.io

---
# ClusterRole for cluster-scoped resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tekton-triggers-clusterrole
rules:
  - apiGroups: ["triggers.tekton.dev"]
    resources: ["clustertriggerbindings", "clusterinterceptors"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-triggers-clusterrolebinding
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-sa
    namespace: tekton-pipelines
roleRef:
  kind: ClusterRole
  name: tekton-triggers-clusterrole
  apiGroup: rbac.authorization.k8s.io
```

## Complete Example

Here is a complete working example that builds and deploys on every push to main:

```yaml
# complete-example.yaml
# Apply with: kubectl apply -f complete-example.yaml

---
# Webhook secret - generate with: openssl rand -hex 20
apiVersion: v1
kind: Secret
metadata:
  name: github-webhook-secret
  namespace: tekton-pipelines
type: Opaque
stringData:
  secret: "your-webhook-secret-here"

---
# Service account with required permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-sa
  namespace: tekton-pipelines

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-binding
  namespace: tekton-pipelines
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-sa
roleRef:
  kind: ClusterRole
  name: tekton-triggers-eventlistener-roles
  apiGroup: rbac.authorization.k8s.io

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-triggers-binding
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-sa
    namespace: tekton-pipelines
roleRef:
  kind: ClusterRole
  name: tekton-triggers-eventlistener-clusterroles
  apiGroup: rbac.authorization.k8s.io

---
# TriggerBinding - extract data from GitHub webhook
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: github-push-binding
  namespace: tekton-pipelines
spec:
  params:
    - name: git-revision
      value: $(body.after)
    - name: git-repo-url
      value: $(body.repository.clone_url)
    - name: git-repo-name
      value: $(body.repository.name)

---
# TriggerTemplate - define what to create
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: build-template
  namespace: tekton-pipelines
spec:
  params:
    - name: git-revision
    - name: git-repo-url
    - name: git-repo-name
  resourcetemplates:
    - apiVersion: tekton.dev/v1beta1
      kind: PipelineRun
      metadata:
        generateName: build-$(tt.params.git-repo-name)-
        namespace: tekton-pipelines
      spec:
        pipelineRef:
          name: build-pipeline
        params:
          - name: repo-url
            value: $(tt.params.git-repo-url)
          - name: revision
            value: $(tt.params.git-revision)
        workspaces:
          - name: source
            volumeClaimTemplate:
              spec:
                accessModes:
                  - ReadWriteOnce
                resources:
                  requests:
                    storage: 1Gi

---
# EventListener - receive webhooks
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
            name: "github"
          params:
            - name: "secretRef"
              value:
                secretName: github-webhook-secret
                secretKey: secret
            - name: "eventTypes"
              value: ["push"]
        - ref:
            name: "cel"
          params:
            - name: "filter"
              value: "body.ref == 'refs/heads/main'"
      bindings:
        - ref: github-push-binding
      template:
        ref: build-template
```

## Best Practices

### 1. Always Validate Webhooks

Never skip webhook secret validation in production. This prevents unauthorized triggers:

```yaml
interceptors:
  - ref:
      name: "github"
    params:
      - name: "secretRef"
        value:
          secretName: github-webhook-secret
          secretKey: secret
```

### 2. Use Specific Event Filters

Filter events as early as possible to reduce unnecessary processing:

```yaml
# Filter at the interceptor level, not in the pipeline
interceptors:
  - ref:
      name: "cel"
    params:
      - name: "filter"
        value: >
          body.ref == 'refs/heads/main' &&
          !body.head_commit.message.contains('[skip ci]')
```

### 3. Generate Unique Names

Always use `generateName` instead of `name` in TriggerTemplates:

```yaml
metadata:
  # Good - each run gets a unique name
  generateName: build-$(tt.params.git-repo-name)-

  # Bad - will fail on second trigger
  # name: build-run
```

### 4. Set Resource Limits

Protect your cluster from resource exhaustion:

```yaml
resources:
  kubernetesResource:
    spec:
      template:
        spec:
          containers:
            - resources:
                limits:
                  memory: "128Mi"
                  cpu: "200m"
```

### 5. Use Separate Triggers for Different Events

Do not try to handle all event types in one trigger:

```yaml
triggers:
  # Separate trigger for pushes
  - name: push-trigger
    interceptors:
      - ref:
          name: "github"
        params:
          - name: "eventTypes"
            value: ["push"]
    template:
      ref: build-template

  # Separate trigger for PRs
  - name: pr-trigger
    interceptors:
      - ref:
          name: "github"
        params:
          - name: "eventTypes"
            value: ["pull_request"]
    template:
      ref: pr-template
```

### 6. Log and Monitor Triggers

Enable logging and set up monitoring:

```bash
# View EventListener logs
kubectl logs -l eventlistener=github-listener -n tekton-pipelines -f

# Check recent triggers
kubectl get pipelineruns -n tekton-pipelines --sort-by=.metadata.creationTimestamp
```

### 7. Test Webhooks Locally

Use tools like `ngrok` for local development:

```bash
# Expose local EventListener
kubectl port-forward svc/el-github-listener 8080:8080 -n tekton-pipelines

# In another terminal
ngrok http 8080

# Use the ngrok URL for GitHub webhook testing
```

---

Tekton Triggers transform your Kubernetes cluster into a powerful, event-driven CI/CD platform. Start with simple push-triggered builds, then expand to handle pull requests, multiple repositories, and complex branching strategies. The declarative, Kubernetes-native approach means your entire CI/CD configuration lives in Git alongside your code.

Monitor your Tekton pipelines and get alerts when builds fail with [OneUptime](https://oneuptime.com). Track build times, catch failures early, and keep your CI/CD system running smoothly.
