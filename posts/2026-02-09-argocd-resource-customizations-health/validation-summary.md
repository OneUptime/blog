# Validation Summary: How to Configure ArgoCD Resource Customizations for Custom Health Check Logic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource customizations
- Argo CD health checks and resource actions
- Kubernetes ConfigMaps and kubectl commands
- Lua health scripts
- Crossplane managed resources
- cert-manager Certificates
- CloudNativePG Clusters
- Argo Rollouts

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/health/
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/release-2.3/user-guide/diffing/
- Argo CD argocd-cm example documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/argocd-cm-yaml/
- Argo CD Operator resource customization reference: https://argocd-operator.readthedocs.io/en/stable/reference/argocd/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- CloudNativePG troubleshooting documentation: https://cloudnative-pg.io/docs/1.26/troubleshooting/
- Argo Rollouts specification documentation: https://argoproj.github.io/argo-rollouts/features/specification/

## Issues Found
- The post said Argo CD uses health assessment to determine Application sync status. Changed this to Application health status and clarified that sync status is separate.
- The built-in health examples for Deployment and Service were oversimplified. Updated them to match Argo CD's documented checks for observed generation, updated replicas, and LoadBalancer ingress.
- The post listed `Missing` as a custom health status. Current Argo CD custom health documentation lists `Healthy`, `Progressing`, `Degraded`, and `Suspended`; removed `Missing` from the custom return list.
- The cert-manager example mapped `DoesNotExist` and `MissingData` reasons to Argo CD `Missing`. Changed that to `Progressing`, because those are certificate issuance states, not missing Kubernetes resources.
- The Application example could dereference `obj.status.sync.status` when `sync` was nil. Added nil checks and a fallback status.
- The custom actions examples used nested `actions` under `resource.customizations`, but Argo CD documents custom actions under `resource.customizations.actions.<group>_<kind>`. Updated the Workflow and Rollout action examples.
- The local Lua test script returned before printing a result. Wrapped the logic in a local function and printed the returned health status.
- The declarative ConfigMap example used `#` inside a Lua block. Changed it to Lua comment syntax.
- The restart command used `deployment argocd-application-controller`, but standard Argo CD installs run the application controller as a StatefulSet. Updated the command to `statefulset/argocd-application-controller`.
- The debugging logs command targeted the application controller as a Deployment. Updated it to use the StatefulSet resource.
- The CloudNativePG example used `string.format`, which depends on Lua standard libraries that Argo CD disables by default for health checks. Replaced it with string concatenation.
- The Rollout example mixed health and action configuration under one `resource.customizations` entry and used an action body that restarted rather than promoted the Rollout. Split the health and action keys and changed the action to unpause the Rollout.

## Review Notes
Some examples still use the grouped `resource.customizations` form, which remains documented for health checks and is required for wildcard health checks. For new non-wildcard customizations, the split-key form shown in later examples is clearer and aligns with current Argo CD documentation.
