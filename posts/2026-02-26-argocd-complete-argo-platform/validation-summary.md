# Validation Summary: How to Set Up a Complete Argo Platform (CD + Rollouts + Workflows + Events)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Argo Workflows
- Argo Events
- Kubernetes manifests and RBAC
- Prometheus metrics and ServiceMonitor
- Kaniko image builds

## Sources Consulted
- Argo CD installation docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD app-of-apps / cluster bootstrapping docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo Rollouts installation docs: https://argo-rollouts.readthedocs.io/en/stable/installation/
- Argo Rollouts canary strategy docs: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts Prometheus analysis docs: https://argoproj.github.io/argo-rollouts/analysis/prometheus/
- Argo Workflows installation docs: https://argo-workflows.readthedocs.io/en/latest/installation/
- Argo Workflows v3.4 upgrade notes for executor configuration: https://argo-workflows.readthedocs.io/en/release-3.4/upgrading/
- Argo Workflows service account and workflow RBAC docs: https://argo-workflows.readthedocs.io/en/latest/service-accounts/ and https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/
- Argo Events installation docs: https://argoproj.github.io/argo-events/installation/
- Argo Events EventBus docs: https://argoproj.github.io/argo-events/eventbus/eventbus/
- Argo Events Sensor service account docs: https://argoproj.github.io/argo-events/service-accounts/
- Argo Events Argo Workflow trigger docs: https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/

## Issues Found
- The Argo Workflows install command used normal client-side apply and then patched `containerRuntimeExecutor: emissary`. Current Argo Workflows release manifests with full CRDs require server-side apply, and non-Emissary executors were removed in v3.4, so `containerRuntimeExecutor` should be removed rather than set. Updated the install command to use `kubectl apply --server-side` and removed the obsolete patch.
- The shared service account was created only in `argo-events`, but the WorkflowTemplate used it in the `argo` namespace. Added the service account in `argo` and bound both service accounts.
- The Sensor did not specify `spec.template.serviceAccountName`, so its `argoWorkflow` trigger would run under the default service account and likely fail RBAC. Added `serviceAccountName: argo-platform-sa`.
- The workflow RBAC omitted the minimum `workflowtaskresults` permissions needed by current Argo Workflows executors. Added `create` and `patch` permissions for `workflowtaskresults`.
- The Sensor parameter wrote to `spec.arguments.parameters.0.value`, but the generated Workflow did not define that parameter path. Added an empty `commit-sha` argument in the generated Workflow resource.
- The Kaniko build step assumed source code and a Dockerfile were already present in the build container. Added a Git input artifact at `/workspace` and pointed Kaniko at that context and Dockerfile.
- The Rollout referenced `myapp-stable`, `myapp-canary`, and an AnalysisTemplate named `success-rate` without defining them. Added minimal stable/canary Services and a Prometheus-backed `AnalysisTemplate`.
- The app-of-apps Application omitted a destination namespace. Added `namespace: argocd`, matching Argo CD's documented app-of-apps pattern for child Application resources.

## Review Notes
- The post still uses `latest` and `stable` install URLs for readability. For production documentation, pinning explicit release versions would be safer and more reproducible.
- Registry credentials, Git credentials, Prometheus metric names, and the production namespace creation are environment-specific and remain placeholders the reader must adapt.
