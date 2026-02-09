# How to Build Tekton Pipelines with Custom Task Results and When Expressions for Conditional Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, CI/CD, Kubernetes, Pipeline Automation, Task Results

Description: Learn how to use Tekton task results and when expressions to build intelligent pipelines with conditional logic and dynamic workflows based on previous step outputs.

---

Basic CI/CD pipelines run every task regardless of previous outcomes. But production pipelines need intelligence: skip tests if code hasn't changed, deploy only on main branch, run security scans only for production builds. Tekton's task results and when expressions enable this conditional logic, making your pipelines smarter and more efficient.

This guide shows you how to build intelligent pipelines with conditional execution.

## Understanding Task Results

Tasks can emit results that subsequent tasks consume. Results are key-value pairs available to later tasks via variable substitution.

Basic task with results:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: check-code-changes
spec:
  results:
    - name: has-changes
      description: Whether code files changed
    - name: changed-files-count
      description: Number of changed files

  steps:
    - name: check-changes
      image: alpine/git:latest
      script: |
        #!/bin/sh
        set -e

        # Check if any .go files changed
        if git diff --name-only HEAD~1 | grep -q '\.go$'; then
          echo -n "true" > $(results.has-changes.path)
        else
          echo -n "false" > $(results.has-changes.path)
        fi

        # Count changed files
        COUNT=$(git diff --name-only HEAD~1 | wc -l)
        echo -n "$COUNT" > $(results.changed-files-count.path)
```

Results are written to special paths that Tekton reads after task completion.

## Consuming Task Results

Reference results in subsequent tasks:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: conditional-pipeline
spec:
  tasks:
    - name: check-changes
      taskRef:
        name: check-code-changes

    - name: run-tests
      taskRef:
        name: go-test
      params:
        - name: files-changed
          value: "$(tasks.check-changes.results.changed-files-count)"
      runAfter:
        - check-changes
```

## When Expressions

When expressions control whether a task runs. They evaluate to true or false based on parameters or task results.

Basic when expression:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: smart-pipeline
spec:
  params:
    - name: git-branch
      type: string

  tasks:
    - name: build
      taskRef:
        name: build-app

    - name: deploy-staging
      taskRef:
        name: deploy
      params:
        - name: environment
          value: staging
      when:
        - input: "$(params.git-branch)"
          operator: in
          values: ["develop", "main"]
      runAfter:
        - build

    - name: deploy-production
      taskRef:
        name: deploy
      params:
        - name: environment
          value: production
      when:
        - input: "$(params.git-branch)"
          operator: in
          values: ["main"]
      runAfter:
        - build
```

## When Expression Operators

Tekton supports several operators:

```yaml
when:
  # String equality
  - input: "$(params.branch)"
    operator: in
    values: ["main", "master"]

  # Negation
  - input: "$(params.skip-tests)"
    operator: notin
    values: ["true"]

  # Existence check (v0.50+)
  - input: "$(tasks.scan.results.vulnerabilities)"
    operator: exists

  # Non-existence
  - input: "$(tasks.scan.results.critical-vulns)"
    operator: notexists
```

## Conditional Execution Based on Results

Skip tasks based on previous task outcomes:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: test-and-deploy
spec:
  tasks:
    # Check if tests should run
    - name: check-test-files
      taskSpec:
        results:
          - name: has-tests
        steps:
          - name: check
            image: alpine:latest
            script: |
              if [ -d "tests" ] && [ "$(ls -A tests)" ]; then
                echo -n "true" > $(results.has-tests.path)
              else
                echo -n "false" > $(results.has-tests.path)
              fi

    # Run tests only if they exist
    - name: run-tests
      taskRef:
        name: go-test
      when:
        - input: "$(tasks.check-test-files.results.has-tests)"
          operator: in
          values: ["true"]
      runAfter:
        - check-test-files

    # Deploy only if tests passed (or were skipped)
    - name: deploy
      taskRef:
        name: deploy-app
      runAfter:
        - run-tests
```

## Complex Conditional Logic

Combine multiple when expressions:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: production-pipeline
spec:
  params:
    - name: branch
    - name: tag

  tasks:
    - name: security-scan
      taskRef:
        name: trivy-scan
      taskSpec:
        results:
          - name: critical-vulns
          - name: high-vulns

    # Deploy to production only if:
    # 1. Branch is main
    # 2. Tag is provided
    # 3. No critical vulnerabilities
    - name: deploy-production
      taskRef:
        name: deploy
      when:
        - input: "$(params.branch)"
          operator: in
          values: ["main"]
        - input: "$(params.tag)"
          operator: notin
          values: ["", "latest"]
        - input: "$(tasks.security-scan.results.critical-vulns)"
          operator: in
          values: ["0"]
      runAfter:
        - security-scan
```

## Dynamic Task Generation

Use results to determine which tasks to run:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: detect-services
spec:
  results:
    - name: services
      description: JSON array of services to build

  steps:
    - name: detect
      image: alpine:latest
      script: |
        #!/bin/sh
        # Detect changed services
        SERVICES=$(git diff --name-only HEAD~1 | cut -d/ -f1 | sort -u | jq -R -s -c 'split("\n")[:-1]')
        echo -n "$SERVICES" > $(results.services.path)
```

Then use a custom task or loop:

```yaml
tasks:
  - name: detect-services
    taskRef:
      name: detect-services

  - name: build-service
    taskRef:
      name: build
    params:
      - name: service
        value: "$(tasks.detect-services.results.services[*])"
```

## Practical Example: Smart CI Pipeline

Complete pipeline with intelligent conditionals:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: smart-ci-pipeline
spec:
  params:
    - name: git-url
    - name: git-revision
    - name: git-branch

  workspaces:
    - name: source-code

  tasks:
    # Clone repository
    - name: clone
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
      workspaces:
        - name: output
          workspace: source-code

    # Detect what changed
    - name: detect-changes
      workspaces:
        - name: source
          workspace: source-code
      taskSpec:
        workspaces:
          - name: source
        results:
          - name: code-changed
          - name: docs-changed
          - name: deps-changed
        steps:
          - name: detect
            image: alpine/git:latest
            workingDir: $(workspaces.source.path)
            script: |
              #!/bin/sh
              # Check code changes
              if git diff --name-only HEAD~1 | grep -qE '\.(go|js|py)$'; then
                echo -n "true" > $(results.code-changed.path)
              else
                echo -n "false" > $(results.code-changed.path)
              fi

              # Check docs changes
              if git diff --name-only HEAD~1 | grep -qE '\.(md|rst)$'; then
                echo -n "true" > $(results.docs-changed.path)
              else
                echo -n "false" > $(results.docs-changed.path)
              fi

              # Check dependency changes
              if git diff --name-only HEAD~1 | grep -qE '(go.mod|package.json|requirements.txt)$'; then
                echo -n "true" > $(results.deps-changed.path)
              else
                echo -n "false" > $(results.deps-changed.path)
              fi
      runAfter:
        - clone

    # Install dependencies only if they changed
    - name: install-deps
      taskRef:
        name: npm-install
      when:
        - input: "$(tasks.detect-changes.results.deps-changed)"
          operator: in
          values: ["true"]
      workspaces:
        - name: source
          workspace: source-code
      runAfter:
        - detect-changes

    # Run linter only if code changed
    - name: lint
      taskRef:
        name: golangci-lint
      when:
        - input: "$(tasks.detect-changes.results.code-changed)"
          operator: in
          values: ["true"]
      workspaces:
        - name: source
          workspace: source-code
      runAfter:
        - detect-changes

    # Run tests only if code changed
    - name: test
      taskRef:
        name: go-test
      when:
        - input: "$(tasks.detect-changes.results.code-changed)"
          operator: in
          values: ["true"]
      workspaces:
        - name: source
          workspace: source-code
      runAfter:
        - lint

    # Security scan
    - name: security-scan
      taskRef:
        name: trivy-scan
      when:
        - input: "$(tasks.detect-changes.results.code-changed)"
          operator: in
          values: ["true"]
      workspaces:
        - name: source
          workspace: source-code
      taskSpec:
        results:
          - name: vulnerabilities
      runAfter:
        - test

    # Build only if tests passed and on main branch
    - name: build
      taskRef:
        name: kaniko-build
      when:
        - input: "$(tasks.detect-changes.results.code-changed)"
          operator: in
          values: ["true"]
        - input: "$(params.git-branch)"
          operator: in
          values: ["main", "develop"]
      workspaces:
        - name: source
          workspace: source-code
      runAfter:
        - security-scan

    # Deploy to staging on develop branch
    - name: deploy-staging
      taskRef:
        name: deploy
      params:
        - name: environment
          value: staging
      when:
        - input: "$(params.git-branch)"
          operator: in
          values: ["develop"]
        - input: "$(tasks.security-scan.results.vulnerabilities)"
          operator: in
          values: ["0"]
      runAfter:
        - build

    # Deploy to production on main branch
    - name: deploy-production
      taskRef:
        name: deploy
      params:
        - name: environment
          value: production
      when:
        - input: "$(params.git-branch)"
          operator: in
          values: ["main"]
        - input: "$(tasks.security-scan.results.vulnerabilities)"
          operator: in
          values: ["0"]
      runAfter:
        - build
```

## Handling Task Failures

When expressions don't check task status by default. Use results to propagate status:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: safe-task
spec:
  results:
    - name: status
      description: Task status (success/failure)

  steps:
    - name: run
      image: alpine:latest
      onError: continue  # Don't fail task
      script: |
        #!/bin/sh
        if some-command; then
          echo -n "success" > $(results.status.path)
        else
          echo -n "failure" > $(results.status.path)
        fi
```

Then use the result:

```yaml
- name: follow-up-task
  when:
    - input: "$(tasks.safe-task.results.status)"
      operator: in
      values: ["success"]
```

## Finally Tasks

Tasks that always run, regardless of pipeline status:

```yaml
spec:
  finally:
    - name: cleanup
      taskRef:
        name: cleanup-resources

    - name: notify
      taskRef:
        name: send-notification
      params:
        - name: status
          value: "$(tasks.status)"  # Overall pipeline status
```

Finally tasks can use when expressions too:

```yaml
finally:
  - name: notify-success
    taskRef:
      name: slack-notify
    when:
      - input: "$(tasks.status)"
        operator: in
        values: ["Succeeded"]
```

## Debugging Conditional Pipelines

View task status and when expression evaluation:

```bash
# Get PipelineRun details
kubectl describe pipelinerun my-run

# Check task status
tkn pipelinerun describe my-run

# View when expression evaluation in events
kubectl get events --sort-by='.lastTimestamp' | grep When
```

## Best Practices

1. **Keep conditions simple**: Complex logic is hard to debug
2. **Use descriptive result names**: Make intent clear
3. **Document when expressions**: Explain why tasks are conditional
4. **Test all paths**: Verify both true and false branches
5. **Emit meaningful results**: Include enough context for decisions
6. **Default to running**: Only skip when necessary
7. **Log conditional decisions**: Help troubleshooting with clear logs

## Conclusion

Task results and when expressions transform static Tekton pipelines into intelligent workflows. Skip unnecessary steps, make decisions based on previous outcomes, and build efficient CI/CD pipelines that adapt to context. Start with simple branch-based conditions, then expand to complex multi-condition logic as your needs grow. The result is faster, more efficient pipelines that only do what's necessary for each build.
