# How to Suspend and Resume Image Automation in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Operations, Maintenance

Description: Learn how to suspend and resume Flux image automation resources for maintenance windows, incident response, and controlled deployments.

---

## Introduction

There are situations where you need to temporarily stop Flux from automatically updating image tags in your repository. During incident response, maintenance windows, or when preparing a release, suspending image automation prevents unwanted changes. Flux provides a built-in suspend mechanism for all image automation resources. This guide covers how to use it effectively.

## Prerequisites

- A Kubernetes cluster with Flux installed
- Image automation configured (ImageRepository, ImagePolicy, ImageUpdateAutomation)

## Understanding the Suspend Field

Every Flux image automation resource has a `spec.suspend` field. When set to `true`, the controller skips reconciliation for that resource. This applies to:

- **ImageRepository**: Stops scanning the registry for new tags
- **ImagePolicy**: Stops evaluating which tag to select
- **ImageUpdateAutomation**: Stops committing image tag updates to Git

## Suspending with the Flux CLI

The simplest way to suspend and resume resources is with the Flux CLI.

### Suspend ImageUpdateAutomation

This stops Flux from committing image tag changes but still allows scanning and policy evaluation.

```bash
# Suspend the ImageUpdateAutomation to stop commits
flux suspend image update flux-system -n flux-system
```

### Suspend ImagePolicy

This stops tag selection for a specific image.

```bash
# Suspend tag resolution for the my-app ImagePolicy
flux suspend image policy my-app -n flux-system
```

### Suspend ImageRepository

This stops registry scanning entirely.

```bash
# Suspend registry scanning for the my-app ImageRepository
flux suspend image repository my-app -n flux-system
```

## Resuming with the Flux CLI

Resume resources to restart automation.

```bash
# Resume the ImageUpdateAutomation
flux resume image update flux-system -n flux-system

# Resume a specific ImagePolicy
flux resume image policy my-app -n flux-system

# Resume a specific ImageRepository
flux resume image repository my-app -n flux-system
```

When you resume a resource, Flux immediately triggers a reconciliation without waiting for the next interval.

## Suspending with kubectl

You can also patch the resources directly using kubectl.

```bash
# Suspend ImageUpdateAutomation using kubectl patch
kubectl patch imageupdateautomation flux-system -n flux-system \
  --type=merge -p '{"spec":{"suspend":true}}'

# Resume ImageUpdateAutomation using kubectl patch
kubectl patch imageupdateautomation flux-system -n flux-system \
  --type=merge -p '{"spec":{"suspend":false}}'
```

## Suspending via YAML

For GitOps-managed configurations, you can set the suspend field in your manifests and commit the change.

```yaml
# image-update-automation-suspended.yaml
# Suspended ImageUpdateAutomation - no commits will be made
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  suspend: true  # Set to true to stop automation
  interval: 10m
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
        name: Flux
      messageTemplate: "Update images"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

Note that this creates a chicken-and-egg situation: you need Flux to apply the change that suspends Flux. This works because Flux will apply the manifest change and then stop further image automation runs.

## Checking Suspension Status

Verify which resources are currently suspended.

```bash
# Check suspension status of all image automation resources
flux get image all -n flux-system

# Check a specific resource
kubectl get imageupdateautomation flux-system -n flux-system \
  -o jsonpath='{.spec.suspend}'
```

Suspended resources are marked with `SUSPENDED` in the Flux CLI output.

## Common Use Cases

### Maintenance Window

During a planned maintenance window, suspend all image automation to prevent deployments.

```bash
# Suspend all image automation before maintenance
flux suspend image update flux-system -n flux-system

# Perform maintenance tasks...

# Resume after maintenance is complete
flux resume image update flux-system -n flux-system
```

### Incident Response

During an incident, you may want to freeze all automated changes.

```bash
# Emergency: suspend all image repositories to stop scanning
for repo in $(kubectl get imagerepositories -n flux-system -o name); do
  kubectl patch $repo -n flux-system --type=merge -p '{"spec":{"suspend":true}}'
done

# Emergency: suspend all ImageUpdateAutomation resources
for auto in $(kubectl get imageupdateautomations -n flux-system -o name); do
  kubectl patch $auto -n flux-system --type=merge -p '{"spec":{"suspend":true}}'
done
```

Resume everything after the incident is resolved.

```bash
# Resume all image repositories after incident resolution
for repo in $(kubectl get imagerepositories -n flux-system -o name); do
  kubectl patch $repo -n flux-system --type=merge -p '{"spec":{"suspend":false}}'
done

# Resume all ImageUpdateAutomation resources
for auto in $(kubectl get imageupdateautomations -n flux-system -o name); do
  kubectl patch $auto -n flux-system --type=merge -p '{"spec":{"suspend":false}}'
done
```

### Controlled Release Preparation

When preparing a release, suspend automation for specific images so tags remain stable while you validate.

```bash
# Suspend a specific image policy while preparing a release
flux suspend image policy my-app -n flux-system

# After the release is validated, resume automation
flux resume image policy my-app -n flux-system
```

### Selective Suspension

You can suspend individual images while leaving others active. For example, freeze the database migrator image while allowing application images to update.

```bash
# Only suspend the database migrator policy
flux suspend image policy db-migrator -n flux-system

# The application image policy continues to work normally
flux get image policy --all-namespaces
```

## Choosing What to Suspend

Which resource you suspend depends on what you want to stop.

| Resource Suspended | Scanning | Policy Evaluation | Git Commits |
|---|---|---|---|
| ImageRepository | Stopped | Stale data | No new updates |
| ImagePolicy | Active | Stopped | No new updates |
| ImageUpdateAutomation | Active | Active | Stopped |

For most operational scenarios, suspending the ImageUpdateAutomation is sufficient. It stops commits while still allowing you to see what the latest resolved image tag would be.

## Conclusion

The suspend mechanism in Flux gives you precise control over image automation. Whether you need to pause everything during an incident or selectively freeze specific images during a release, the combination of CLI commands and YAML fields makes it straightforward to manage. Always remember to resume resources after the maintenance or incident window closes to avoid stale deployments.
