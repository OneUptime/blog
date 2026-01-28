# How to Implement Tekton Catalog Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, CI/CD, Kubernetes, Pipelines, DevOps

Description: Learn how to use Tekton Catalog tasks to build reusable pipelines, including installation, usage, and customization tips.

---

Tekton Catalog provides reusable tasks and pipelines you can import instead of writing everything from scratch. This guide shows how to install catalog tasks and use them safely.

## Step 1: Install Tekton Catalog

You can install tasks directly from the catalog repo or using the Tekton CLI.

Example:

```bash
kubectl apply -f https://raw.githubusercontent.com/tektoncd/catalog/main/task/git-clone/0.9/git-clone.yaml
```

## Step 2: Use a Catalog Task in a Pipeline

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-and-test
spec:
  workspaces:
    - name: shared
  tasks:
    - name: clone
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: shared
    - name: test
      runAfter: ["clone"]
      taskSpec:
        workspaces:
          - name: source
        steps:
          - name: run-tests
            image: node:20
            script: |
              cd $(workspaces.source.path)
              npm ci
              npm test
      workspaces:
        - name: source
          workspace: shared
```

## Step 3: Pin Task Versions

Always pin task versions from the catalog to avoid unexpected changes.

## Step 4: Customize Tasks

If you need custom logic, copy the task YAML and maintain your own version.

## Best Practices

- Use catalog tasks for common steps
- Pin versions in Git
- Document custom changes

## Conclusion

Tekton Catalog tasks save time and improve consistency. Use them as building blocks and customize only when needed.
