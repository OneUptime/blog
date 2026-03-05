# How to Configure ImageUpdateAutomation Commit Message Template in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, ImageUpdateAutomation, Image Automation, Commit Messages

Description: Learn how to customize the commit message template for Flux CD's ImageUpdateAutomation to create informative and structured Git commits.

---

Flux CD's ImageUpdateAutomation controller creates Git commits whenever it updates image tags in your manifests. The commit message template controls what information is included in these commits. A well-crafted template makes it easy to understand what changed, which images were updated, and which automation triggered the change.

## Default Commit Message

If you provide a simple string as the `messageTemplate`, all automated commits will use that static message:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: image-updater
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: 'Automated image update'
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

While this works, it provides no detail about which images changed or which files were modified.

## Using Go Template Syntax

The `messageTemplate` field supports Go template syntax with several built-in variables. The main variable available is `.Changed`, which contains information about the files and objects that were modified.

Here is a template that lists changed files:

```yaml
spec:
  git:
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}
```

This produces commits like:

```
Automated image update

Automation name: flux-system/image-updater

Files:
- clusters/my-cluster/apps/deployment.yaml
- clusters/my-cluster/apps/cronjob.yaml
```

## Listing Updated Objects

To include information about which Kubernetes resources were updated, use `.Changed.Objects`:

```yaml
spec:
  git:
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $_ := .Changed.Objects -}}
        - {{ $resource.Resource.Kind }} {{ $resource.Resource.Namespace }}/{{ $resource.Resource.Name }}
        {{ end -}}
```

This gives you output like:

```
Automated image update

Automation name: flux-system/image-updater

Files:
- clusters/my-cluster/apps/deployment.yaml

Objects:
- Deployment default/myapp
```

## Including Image Details

You can show exactly which images were updated by iterating over the changed objects and their images:

```yaml
spec:
  git:
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: |
        Automated image update

        {{ range $resource, $changes := .Changed.Objects -}}
        {{ $resource.Resource.Kind }}/{{ $resource.Resource.Name }}:
        {{ range $_, $change := $changes -}}
          - {{ $change.OldValue }} -> {{ $change.NewValue }}
        {{ end -}}
        {{ end -}}
```

This produces detailed commit messages showing the before and after for each image:

```
Automated image update

Deployment/myapp:
  - docker.io/myorg/myapp:v1.2.3 -> docker.io/myorg/myapp:v1.2.4
```

## Structured Commit Messages for Conventional Commits

If your team follows the Conventional Commits specification, you can format the message template accordingly:

```yaml
spec:
  git:
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: |
        chore(images): update container images

        Automation: {{ .AutomationObject }}

        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}
```

This produces commits with the `chore(images):` prefix, making them easy to filter in changelogs and CI pipelines.

## Adding Custom Metadata

You can include static metadata in the template for compliance or tracking purposes:

```yaml
spec:
  git:
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: |
        [automated] Image update by Flux

        Cluster: production-us-east-1
        Automation: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Signed-off-by: Flux Bot <flux@example.com>
```

The `Signed-off-by` trailer satisfies the Developer Certificate of Origin (DCO) requirement used by some projects.

## Multiline Template Best Practices

When writing multiline templates, use the YAML literal block scalar (`|`) to preserve formatting. Pay attention to the Go template whitespace control markers:

- `{{-` trims whitespace before the action
- `-}}` trims whitespace after the action

Without these markers, the template may produce extra blank lines. Compare:

```yaml
# Without whitespace trimming - may produce extra blank lines
messageTemplate: |
  Files:
  {{ range $filename, $_ := .Changed.FileChanges }}
  - {{ $filename }}
  {{ end }}
```

```yaml
# With whitespace trimming - cleaner output
messageTemplate: |
  Files:
  {{ range $filename, $_ := .Changed.FileChanges -}}
  - {{ $filename }}
  {{ end -}}
```

## Verifying Commit Messages

After the automation runs, check the resulting commits:

```bash
# Check automation status
flux get image update image-updater

# View the latest commit message
git log -1 --format='%B'
```

If the commit message does not look right, check the controller logs for template rendering errors:

```bash
kubectl -n flux-system logs deployment/image-automation-controller
```

## Troubleshooting

**Template rendering errors**: If the Go template syntax is invalid, the controller will log an error and skip the commit. Common mistakes include missing closing braces or referencing nonexistent fields.

**Empty file or object lists**: If the template references `.Changed.FileChanges` but no files were changed, that section will be empty. This is normal when the automation runs but finds no new images.

**Excessive blank lines**: Use the `-` whitespace trimming markers in your Go template actions to eliminate unwanted blank lines in the output.

A well-designed commit message template turns automated commits from opaque noise into valuable documentation of your deployment history. Take the time to include the relevant details your team needs for debugging and auditing.
