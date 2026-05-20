# Validation Summary: How to Use Environment Variables for Feature Flags in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps and workloads
- GitOps configuration
- Helm
- Kustomize
- Argo CD sync options and notifications

## Sources Consulted
- Argo CD feature maturity documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/feature-maturity/
- Argo CD `argocd-cm` example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD status badge documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/status-badge/
- Argo CD RBAC documentation for anonymous access: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/rbac/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD reconcile optimization documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/reconcile/
- Argo CD dynamic cluster distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD Applications in any namespace documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/app-any-namespace/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD proxy extensions documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/proxy-extensions/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD CLI environment variables documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/environment-variables/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/

## Issues Found
- The introduction described the topic as only environment-variable feature flags, but many examples are ConfigMap settings. Updated the wording to include both environment variables and ConfigMap settings.
- The gRPC-Web example used an unsupported `server.enable.grpc-web` ConfigMap key. Replaced it with the documented CLI environment-variable approach, `ARGOCD_OPTS="--grpc-web"`, and clarified that it is for CLI clients behind HTTP/1.1-only proxies.
- The proxy extension example used the wrong key and ConfigMap. Changed it to `server.enable.proxy.extension` in `argocd-cmd-params-cm` and noted that backend routes are configured through `extension.config` keys in `argocd-cm`.
- The dynamic cluster distribution example used an unsupported ConfigMap key. Replaced it with the documented `ARGOCD_ENABLE_DYNAMIC_CLUSTER_DISTRIBUTION` environment variable and corrected the explanation of when the feature is useful.
- The ignore-resource-updates section implied the setting is always opt-in. Updated it to note that current Argo CD releases enable `resource.ignoreResourceUpdatesEnabled` by default.
- The Helm OCI example said `HELM_EXPERIMENTAL_OCI` is required. Updated it to state that this is only required for Helm versions older than 3.8.0; Helm 3.8.0 and later enable OCI support by default.
- The repo-server concurrency example used the unsupported `reposerver.allow.concurrent.generation` key. Replaced it with the documented `reposerver.parallelism.limit` setting and adjusted the explanation.
- The Applications-in-any-namespace section omitted required project and RBAC caveats. Added the `AppProject.spec.sourceNamespaces` prerequisite and noted the possible server Kubernetes RBAC requirement.
- The Helm values example still used `HELM_EXPERIMENTAL_OCI` as a current repo-server environment variable and included the invalid dynamic cluster distribution ConfigMap key. Replaced those with documented `server.enable.proxy.extension`, `ARGOCD_ENABLE_DYNAMIC_CLUSTER_DISTRIBUTION`, and `ARGOCD_EXEC_TIMEOUT` examples.
- The resource tracking bullets described `label` as the default without a version caveat. Updated this because current Argo CD documentation describes `annotation` as the default, while older releases used `label`.
- The checking section included the invalid `argocd admin settings resource-overrides list` command. Replaced it with the documented `ignore-resource-updates` subcommand example.
- The production recommendation listed `resource.ignoreResourceUpdatesEnabled` nowhere, even though the post discusses it. Added it with a note that it is the current default.

## Review Notes
- Several settings in the article are version-sensitive. Argo CD feature maturity and defaults change across releases, so readers should still check their target Argo CD release notes before enabling alpha or beta features.
- Local YAML parsing was not run against every snippet as complete manifests because several examples are intentional YAML fragments. The edited complete manifests and configuration keys were checked against official documentation, and `validation.json` was validated with `jq`.
