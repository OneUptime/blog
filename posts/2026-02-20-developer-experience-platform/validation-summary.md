# Validation Summary: How to Build an Internal Developer Platform on Kubernetes

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes
- Backstage developer portal and software templates
- Argo CD ApplicationSet / GitOps
- Crossplane composite resource definitions and compositions
- Upbound AWS RDS provider
- Python CLI scripting
- OneUptime observability

## Sources Consulted
- Backstage Kubernetes plugin installation: https://backstage.io/docs/features/kubernetes/installation/
- Backstage software template writing guide: https://backstage.io/docs/features/software-templates/writing-templates/
- Backstage built-in scaffolder actions and GitHub action module: https://backstage.io/docs/features/software-templates/builtin-actions/
- Backstage `catalog:register` action API: https://backstage.io/api/stable/functions/_backstage_plugin-scaffolder-backend.index.createCatalogRegisterAction.html
- Argo CD ApplicationSet Git generator docs: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Crossplane v2.3 CompositeResourceDefinition docs: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane v2.3 Composition docs: https://docs.crossplane.io/latest/composition/compositions/
- Upbound AWS RDS provider `Instance` resource docs: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.5.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Python `json` documentation: https://docs.python.org/3/library/json.html

## Issues Found
- Backstage Kubernetes backend installation was incomplete. The post installed `@backstage/plugin-kubernetes-backend` but did not show registering it in `packages/backend/src/index.ts`, which the official Backstage docs require. Added a backend registration snippet.
- The Backstage template used `publish:github` without installing or registering the GitHub scaffolder backend module. Added the official package install command and backend registration for `@backstage/plugin-scaffolder-backend-module-github`.
- The Backstage template used `kubernetes:apply` as if it were a built-in scaffolder action. Backstage supports custom actions, but this action is not listed as a built-in action. Updated the surrounding comment to make clear it must be a custom action registered in the backend.
- The Crossplane example used legacy v1 claim-based XRD and `spec.resources` composition style while presenting a current Kubernetes platform guide. Updated it to a Crossplane v2 namespaced `CompositeResourceDefinition` and a pipeline-mode `Composition` using `function-patch-and-transform`.
- The Crossplane managed resource used the older community AWS provider `database.aws.crossplane.io/v1beta1` `RDSInstance` fields. Updated it to the namespaced Upbound AWS RDS provider `rds.aws.m.upbound.io/v1beta1` `Instance` resource and current field names such as `instanceClass`, `username`, `passwordSecretRef`, `region`, and `skipFinalSnapshot`.
- The database request was described as a claim after moving to the v2 namespaced XR model. Updated it to a simple composite resource using `kind: XDatabase`.
- The Python CLI could raise `IndexError` when `create` or `status` was called without enough positional arguments. Added per-command usage checks.
- The Python CLI counted pods with no `containerStatuses` as ready because `all([])` is true. Added a non-empty `containerStatuses` check before counting a pod as ready.
- The Python CLI `create_service` docstring said it scaffolded a Backstage template, but the function only creates a namespace. Updated the docstring to match the actual behavior.

## Review Notes
- The Argo CD ApplicationSet example remains valid, but newer Argo CD examples commonly enable Go templating and use `{{.path.path}}` / `{{.path.basename}}`. The existing non-Go-template form is still represented in the ApplicationSet specification examples.
- The Backstage `kubernetes:apply` action remains illustrative and requires a project-specific custom scaffolder action implementation; the post now states that requirement.
