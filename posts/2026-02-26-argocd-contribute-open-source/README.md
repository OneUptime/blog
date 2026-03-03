# How to Contribute to ArgoCD Open Source Project

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Open Source, Community

Description: A practical guide to contributing to the ArgoCD open source project, covering development setup, code contributions, testing, and community best practices.

---

Contributing to an open source project like ArgoCD is one of the best ways to grow as a DevOps engineer while giving back to the community. ArgoCD is one of the most popular GitOps tools in the CNCF ecosystem, and its maintainers actively welcome contributions from developers of all skill levels. Whether you want to fix a bug, add a feature, or improve documentation, this guide will walk you through the entire process.

## Understanding the ArgoCD Codebase

Before jumping into code, it helps to understand how the ArgoCD repository is organized. The project lives at `github.com/argoproj/argo-cd` and is primarily written in Go for the backend and React/TypeScript for the UI.

Key directories you should familiarize yourself with:

```text
argo-cd/
  cmd/              # CLI entry points for argocd-server, argocd-repo-server, etc.
  controller/       # Application controller logic
  reposerver/       # Repository server for manifest generation
  server/           # API server implementation
  pkg/              # Shared packages and utilities
  ui/               # React-based web UI
  resource_customizations/  # Custom health checks and actions
  docs/             # Documentation site source
  test/             # E2E test infrastructure
  manifests/        # Installation manifests
```

## Setting Up Your Development Environment

First, fork the repository and clone your fork locally.

```bash
# Fork on GitHub first, then clone your fork
git clone https://github.com/YOUR_USERNAME/argo-cd.git
cd argo-cd

# Add upstream remote
git remote add upstream https://github.com/argoproj/argo-cd.git

# Keep your fork in sync
git fetch upstream
git checkout master
git merge upstream/master
```

You will need several tools installed on your machine.

```bash
# Required dependencies
# Go 1.21+ (check go.mod for exact version)
go version

# Node.js 20+ and yarn for UI development
node --version
yarn --version

# protoc for protobuf generation
protoc --version

# kubectl and a local Kubernetes cluster (kind or minikube)
kubectl version
kind version

# goreman for running all ArgoCD components locally
go install github.com/mattn/goreman@latest
```

Install Go dependencies and generate code.

```bash
# Install Go tools used in the build process
make install-tools-local

# Generate protobuf, mocks, and other generated code
make generate-local

# Build the CLI
make cli-local
```

## Finding Your First Issue

The ArgoCD project labels issues specifically for newcomers. Look for these labels on GitHub:

- `good first issue` - Simple issues ideal for first-time contributors
- `help wanted` - Issues the maintainers need help with
- `documentation` - Documentation improvements
- `bug` - Confirmed bugs that need fixing

```bash
# You can also use the GitHub CLI to find issues
gh issue list --repo argoproj/argo-cd --label "good first issue" --state open
```

Before starting work on an issue, always comment on it to let maintainers know you are working on it. This prevents duplicate effort. If an issue has been inactive for more than two weeks with no PR, it is usually safe to pick up.

## Making Code Changes

Create a feature branch from your up-to-date master.

```bash
# Create a descriptive branch name
git checkout -b fix/application-sync-retry-logic

# Make your changes...
```

When writing Go code for ArgoCD, follow these conventions:

```go
// Use structured logging with the project's log package
log.WithField("application", app.Name).Info("Syncing application")

// Error handling follows Go conventions - always check errors
result, err := appClient.Sync(ctx, syncReq)
if err != nil {
    return fmt.Errorf("failed to sync application %s: %w", app.Name, err)
}

// Use context for cancellation and timeouts
ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
defer cancel()
```

For UI changes, the React codebase follows standard patterns.

```typescript
// Components use functional style with hooks
export const ApplicationSyncPanel: React.FC<Props> = ({application, onSync}) => {
    const [syncOptions, setSyncOptions] = useState<SyncOptions>(defaultOptions);

    // Use the ArgoCD services layer for API calls
    const handleSync = async () => {
        try {
            await services.applications.sync(application.metadata.name, syncOptions);
            onSync();
        } catch (e) {
            notifications.show({type: NotificationType.Error, content: e.message});
        }
    };

    return (
        <div className="application-sync-panel">
            {/* Component JSX */}
        </div>
    );
};
```

## Running Tests

ArgoCD has a comprehensive test suite. Always run relevant tests before submitting a PR.

```bash
# Run unit tests for a specific package
go test ./controller/... -v

# Run all unit tests
make test-local

# Run linting
make lint-local

# Run UI tests
cd ui
yarn test

# Run E2E tests (requires a running Kubernetes cluster)
make start-e2e
make test-e2e
```

## Submitting a Pull Request

Before creating your PR, make sure your code is clean.

```bash
# Rebase onto latest upstream master
git fetch upstream
git rebase upstream/master

# Run the full pre-commit checks
make pre-commit-local

# Push your branch
git push origin fix/application-sync-retry-logic
```

When creating the PR, follow the template provided by the project:

1. **Title**: Use a clear, descriptive title starting with the type (fix, feat, chore, docs)
2. **Description**: Explain what the change does and why
3. **Testing**: Describe how you tested the change
4. **Related issues**: Link related GitHub issues with `Fixes #ISSUE_NUMBER`
5. **Screenshots**: Include screenshots for any UI changes

The PR will automatically trigger CI checks including unit tests, E2E tests, linting, and code coverage. A maintainer will review your PR, and you might need to address feedback.

## Types of Contributions Beyond Code

Not all contributions need to be code. Here are other valuable ways to contribute:

**Resource Customizations** are one of the easiest entry points. These define custom health checks and actions for Kubernetes resources.

```yaml
# resource_customizations/apps/Deployment/health.lua
-- Custom health check for Deployments
hs = {}
if obj.status ~= nil then
  if obj.status.availableReplicas ~= nil then
    if obj.status.availableReplicas == obj.status.replicas then
      hs.status = "Healthy"
      hs.message = "All replicas are available"
      return hs
    end
  end
end
hs.status = "Progressing"
hs.message = "Waiting for all replicas to be available"
return hs
```

**Config Management Plugins** let you add support for new templating tools. If you use a tool that ArgoCD does not natively support, writing a CMP plugin is a great contribution.

**Answering Questions** on GitHub Discussions, Slack, and Stack Overflow helps the community grow and reduces the load on maintainers.

## Community Guidelines

The ArgoCD project follows the CNCF Code of Conduct. Here are practical tips for a positive contribution experience:

- Be patient with code reviews - maintainers are often volunteers
- Keep PRs focused and small - large PRs are hard to review
- Write clear commit messages following the conventional commits format
- Respond to review feedback promptly
- If you disagree with review feedback, discuss it respectfully with technical reasoning
- Sign your commits with DCO (Developer Certificate of Origin)

```bash
# Sign your commits with DCO
git commit -s -m "fix: correct sync retry logic for degraded applications"
```

## Staying Engaged

After your first contribution, there are many ways to stay involved.

- Join the `#argo-cd` channel on CNCF Slack
- Attend the bi-weekly community meetings (check the ArgoCD calendar)
- Review other people's PRs - this is extremely valuable
- Help triage new issues by reproducing bugs and adding context
- Write blog posts about your ArgoCD experiences

Contributing to ArgoCD is not just about writing code. It is about being part of a community that is shaping the future of GitOps and Kubernetes deployments. Every contribution, no matter how small, makes the project better for the thousands of teams that depend on it daily.

For monitoring your ArgoCD deployments after contributing improvements, consider integrating with [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-community-slack-meetings/view) for comprehensive observability across your GitOps pipelines.
