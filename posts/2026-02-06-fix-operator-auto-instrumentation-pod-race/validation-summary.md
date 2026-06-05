# Validation Summary: How to Fix OpenTelemetry Operator Auto-Instrumentation Injection Failing

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Operator
- Kubernetes mutating admission webhooks
- Kubernetes Pods, Jobs, Deployments, and EndpointSlices
- kubectl
- Helm chart hooks and values
- Argo CD sync waves

## Sources Consulted
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator release manifest: https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
- OpenTelemetry Operator Helm chart values: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-operator/values.yaml
- OpenTelemetry Operator Helm chart webhook template: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-operator/templates/admission-webhooks/operator-webhook.yaml
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes Service and EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl rollout documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/

## Issues Found
- The detection command used the legacy `Endpoints` API. Kubernetes v1.33 deprecates Endpoints in favor of EndpointSlices, so the command was changed to inspect EndpointSlices for the webhook Service.
- The first fix suggested an init container inside the application Pod to wait for the Operator. Admission webhooks mutate Pods before they are persisted, so an init container in the same Pod cannot cause injection to happen. The example was changed to a pre-deploy Job that waits before application Pods are created.
- The `failurePolicy` example did not reflect the current OpenTelemetry Operator Helm chart's pod-specific setting. The chart uses `admissionWebhooks.pods.failurePolicy` for the `mpod.kb.io` pod injection webhook, so the snippet was corrected.
- The Argo CD sync wave wording implied global ordering between independent Applications. Argo CD sync waves order resources within a sync operation, so the text now specifies use in a parent application.

## Review Notes
The examples assume the waiting Job or Helm hook runs with RBAC permissions to read `MutatingWebhookConfiguration` resources and watch the Operator Deployment. The default OpenTelemetry Operator release manifest and Helm chart currently keep the pod injection webhook fail-open with `failurePolicy: Ignore`; changing it to `Fail` is a deliberate operational tradeoff.
