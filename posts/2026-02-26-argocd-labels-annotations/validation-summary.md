# Validation Summary: How to Add Labels and Annotations to ArgoCD Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD Notifications
- Kubernetes labels and annotations
- kubectl
- Kustomize
- Helm
- Kyverno

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD compare options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD skip reconcile documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/skip_reconcile/
- Argo CD UI application filter source: https://github.com/argoproj/argo-cd/blob/master/ui/src/app/applications/components/applications-list/applications-filter.tsx
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The ApplicationSet example used the older default template syntax (`{{path.basename}}` and `{{path}}`). Updated it to the current documented Go template form with `goTemplate: true`, `{{.path.basename}}`, and `{{.path.path}}`.
- The UI filtering section claimed users should type `label:env=production` in the search field. Current Argo CD UI source models label filtering as a Labels filter that accepts entries such as `env=production`, so the instructions were updated.
- The post used `argocd.argoproj.io/description` as an Application description annotation. The documented Application details mechanism is `spec.info`, so the example was changed to use `spec.info`.
- The Application-level control annotation example showed `argocd.argoproj.io/compare-options: IgnoreExtraneous`. The compare-options docs show this annotation on the generated resource to exclude, not as a normal Application-level control. Replaced it with the documented Application annotation `argocd.argoproj.io/skip-reconcile: "true"`.
- The label propagation section incorrectly said Argo CD supports propagating Application labels through the `info` field and managed resource annotations. Updated it to state that Argo CD does not automatically copy Application labels to managed resources and that labels should be configured in the manifest generator.

## Review Notes
- `argocd.argoproj.io/skip-reconcile` is documented by Argo CD as an alpha feature intended primarily for integrations that need to manage Application status externally.
- The Helm `commonLabels` example is chart-dependent: it works only for charts that define and apply a `commonLabels` value.
