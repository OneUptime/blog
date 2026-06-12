# Validation Summary: How to Implement ArgoCD SCM Provider Generator

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD ApplicationSets
- Argo CD SCM Provider Generator
- Kubernetes manifests and Secrets
- GitHub, GitLab, Bitbucket Cloud, and Bitbucket Server SCM integrations
- Argo CD Applications, AppProjects, sync policy, and repository credentials

## Sources Consulted
- Argo CD SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/GoTemplate/
- Argo CD Webhook Configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD Git Generator documentation, for ApplicationSet refresh/webhook behavior: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Getting-Started/
- Argo CD upstream ApplicationSet CRD schema: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/crds/applicationset-crd.yaml

## Issues Found
- The first GitHub example described filtering on a `k8s/` directory, but the YAML filtered on `k8s/deployment.yaml`. Updated the text to match the configuration.
- The template variable table omitted `branchNormalized`, which is documented by Argo CD. Added it to the table.
- The Bitbucket Server example used an invalid `basicAuth.secretRef` shape. Updated it to the documented `basicAuth.username` and `basicAuth.passwordRef.secretName/key` fields.
- The repository metadata example placed the comma-separated `{{labels}}` value into Kubernetes labels, which can produce invalid label values. Changed the example to use annotations.
- The custom path example used Go-template pipe syntax without enabling Go templates and without the leading dot on `.repository`. Added `goTemplate: true`, `goTemplateOptions`, and corrected the expression.
- The webhook example used an unsupported `webhookRef` field under `scmProvider.github`. Replaced it with the documented SCM provider polling interval field, `requeueAfterSeconds`.
- The clone options example used unsupported `cloneOptions.shallow` and placed `cloneProtocol` under the GitHub provider. Replaced it with the documented `scmProvider.cloneProtocol` field.
- The best-practice section labeled an Application retry policy as Progressive Sync. Renamed the section and explanation to describe sync retries accurately.

## Review Notes
- The post uses the older fasttemplate-style `{{repository}}` syntax in most examples. This is still represented in Argo CD examples and remains usable, but newer examples commonly enable `goTemplate: true` and use `{{ .repository }}`.
- Argo CD Progressive Syncs are a newer beta feature and require explicit controller enablement, so they were not introduced into this post's Argo CD v2.3+ baseline.
