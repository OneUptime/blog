# Validation Summary: How to Plan an ArgoCD Migration Strategy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet custom resources
- Argo CD Helm chart
- Argo CD RBAC and notifications
- Kubernetes
- Helm
- Prometheus Operator ServiceMonitor
- Argo Rollouts
- GitOps

## Sources Consulted
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/subscriptions/
- Argo CD notifications Slack service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Official argo-helm chart values and README: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Argo Rollouts documentation: https://argoproj.github.io/argo-rollouts/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Mermaid quadrant chart documentation: https://mermaid.js.org/syntax/quadrantChart

## Issues Found
- The ApplicationSet example used the default fasttemplate-style `{{path}}` and `{{path[1]}}` placeholders. Current Argo CD documentation recommends Go templates, where path data is exposed as `.path.path` and `.path.segments`. I updated the example to enable `goTemplate`, added `goTemplateOptions: ["missingkey=error"]`, changed the source path to `{{.path.path}}`, and changed the generated application name to `{{index .path.segments 1}}` so `apps/*/overlays/production` produces the application folder name instead of `production`.
- The notifications example defined a trigger, template, and Slack service, but no subscription recipient. Argo CD notifications require annotations or global subscriptions to send notifications. I added a global `subscriptions` block for the `on-sync-failed` trigger with a Slack recipient.

## Review Notes
- The Helm values use valid argo-helm keys, but production installs should pin a chart version and tune ingress, TLS, Redis HA, and controller replica settings for the target environment.
- The `application.namespaces: "*"` setting is valid for Applications in any namespace, but it broadens the namespaces Argo CD watches. The official documentation recommends pairing it with AppProject `sourceNamespaces` and appropriate Kubernetes RBAC.
- The RBAC snippet is syntactically valid for applications in the Argo CD control plane namespace. If Applications are created outside the Argo CD namespace, RBAC object patterns may need the namespace-aware form documented by Argo CD.
