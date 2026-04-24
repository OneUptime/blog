# Validation Summary: How to Edit a Running Kubernetes Application in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes Deployments
- `kubectl`
- YAML configuration

## Sources Consulted
- Portainer docs: Edit an application - https://docs.portainer.io/sts/user/kubernetes/applications/edit
- Portainer docs: Inspect an application - https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer docs: Add a new application using a form - https://docs.portainer.io/sts/user/kubernetes/applications/add
- Kubernetes docs: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes docs: Kubectl command reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes docs: `kubectl set env` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes docs: `kubectl set image` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes docs: Update API Objects in Place Using `kubectl patch` - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes docs: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The post treated Portainer editing as a single universal workflow. I corrected it to reflect the current docs: form editing applies to applications originally deployed from a form, while YAML editing is available through the YAML tab in Portainer Business Edition.
- The original YAML example was not structurally valid for a Deployment because it started at top-level `containers:`. I replaced it with a correctly nested `spec.template.spec.containers` example.
- The post said Kubernetes uses `RollingUpdate` by default without scoping that statement. I corrected this to Deployments, which is the workload type used by the rollout examples.
- The original YAML-edit action used the wrong button label. I changed `Update` to `Apply changes` to match the Portainer YAML editor flow documented by Portainer.
- The original Portainer monitoring sentence claimed pod status updates in real time. I changed this to the documented behavior that Portainer lists the pods and their current status.
- The rollback section implied rollback applies broadly to any update. I added the important Deployment caveat that only pod-template changes create rollout revisions; scaling does not create a new revision.
- The Portainer rollback guidance was too narrow. I updated it to note that Portainer may expose a rollback action depending on how the application was deployed, otherwise you revert to a known-good configuration manually.
- The patch example used a nonstandard annotation key. I replaced it with the official `kubernetes.io/change-cause` annotation used in Deployment rollout history.
- The best-practices section said to always set `maxUnavailable: 0`. I corrected this to zero-downtime guidance that also requires a non-zero `maxSurge`, matching Kubernetes Deployment rules.

## Review Notes
- The guide is accurate after edits, but it is specifically strongest for Deployment-backed applications. Portainer can also manage Pods, StatefulSets, DaemonSets, and other workload types with different update semantics.
- In current Portainer documentation, YAML editing is Business Edition-only, and some actions such as rolling restart are also edition- or deployment-method-dependent.
