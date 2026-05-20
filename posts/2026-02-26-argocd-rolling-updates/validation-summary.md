# Validation Summary: How to Implement Rolling Updates with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments
- Kubernetes rolling update strategy
- Kubernetes readiness and liveness probes
- Kubernetes Pod Disruption Budgets
- Kubernetes Horizontal Pod Autoscaler
- kubectl rollout commands

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes "Update a Deployment Without Downtime" task: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Pod Disruption Budget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD app rollback command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/

## Issues Found
- The post said blue-green and canary deployments require Argo Rollouts. This was too absolute because those patterns can be implemented in other ways, while Argo Rollouts is commonly used for traffic shifting and automated analysis. Changed the wording to say they often use Argo Rollouts for those capabilities.
- The post said changing an image tag or any other Deployment spec field triggers a rolling update. Kubernetes rollouts are triggered by changes to the Deployment Pod template, not every Deployment spec field. Changed this to "any other Pod template field."
- The post implied Pod Disruption Budgets are part of controlling rolling update availability. PDBs protect against voluntary evictions such as node drains, while Deployment rolling updates are controlled by Deployment strategy fields. Updated the PDB wording and summary to describe voluntary disruption safety.
- The post listed `argocd app rollback` as an option while the example Application enables automated sync. Argo CD documents that rollback cannot be performed against an application with automated sync enabled. Added a note to disable automated sync first if it is enabled.

## Review Notes
The Kubernetes Deployment, HPA, PDB, probe, Argo CD Application, and `kubectl rollout` examples use current API versions and valid field names. The local environment did not have `kubectl` or `argocd` installed, so CLI verification was performed against official command references instead of local `--help` output.
