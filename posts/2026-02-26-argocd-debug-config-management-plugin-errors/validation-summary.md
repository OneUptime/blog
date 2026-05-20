# Validation Summary: How to Debug Config Management Plugin Errors in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD Config Management Plugins
- Kubernetes
- kubectl
- Argo CD CLI
- Helm and Kustomize command-line tooling

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD installation manifest showing `argocd-application-controller` as a StatefulSet: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/install.yaml
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The introduction implied you cannot exec into the repo-server to test plugin behavior. Updated it to clarify that CMP testing should be done in the plugin sidecar container, not the main repo-server container.
- The plugin name guidance did not mention Argo CD's version-suffixed CMP names. Added the `<metadata.name>-<spec.version>` behavior and noted discovery-based matching.
- The timeout section said the default timeout is 90 seconds. Updated it to distinguish the repo-server request timeout, which defaults to 60 seconds, from the sidecar `ARGOCD_EXEC_TIMEOUT`, which defaults to 90 seconds.
- A log comment mislabeled sidecar logs as repo-server logs. Corrected the comment.
- The YAML validation example used `head -3`, which does not validate YAML. Changed the text and command to inspect expected config fields instead of claiming validation.
- The debug snippet used `set -euxo pipefail` under `sh`, which can fail on shells that do not support `pipefail`. Changed it to `set -eux` with a best-effort `pipefail` enablement.
- The CLI section described `argocd app diff` as showing generated manifests. Added `argocd app manifests my-app` for rendered manifests and kept `argocd app diff my-app` for target-vs-live comparison.
- The application controller log command used `deployment/argocd-application-controller`, but modern Argo CD installs run the application controller as a StatefulSet. Updated the command to use `statefulset/argocd-application-controller`.

## Review Notes
The remaining examples are version-general and assume the common sidecar CMP installation model. Some commands use placeholder container, application, and file names that readers must replace for their own installation.
