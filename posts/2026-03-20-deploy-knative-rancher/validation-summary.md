# Validation Summary: How to Deploy Knative on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Knative Operator (v1.12.0)
- Knative Serving
- Knative Eventing
- Kourier ingress
- Rancher / Kubernetes
- PingSource event source
- Knative Pod Autoscaler (KPA)

## Sources Consulted
- Knative Operator install docs: https://knative.dev/docs/install/operator/knative-with-operators/
- Knative scale-to-zero docs: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative scale bounds annotations: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative custom domain docs: https://knative.dev/docs/serving/using-a-custom-domain/
- Knative Serving CR configuration: https://knative.dev/docs/install/operator/configuring-serving-cr/
- Actual operator.yaml release manifest: https://github.com/knative/operator/releases/download/knative-v1.12.0/operator.yaml (downloaded and inspected)

## Issues Found

1. **Step 1 verification command pointed at wrong namespace.**
   Original: `kubectl get pods -n knative-operator`
   Fixed to: `kubectl get deployment knative-operator`
   Reason: The v1.12.0 `operator.yaml` deploys all resources (Secret, Deployment, ServiceAccount, etc.) into the `default` namespace, not a `knative-operator` namespace. The previous command would always return "No resources found in knative-operator namespace." The official docs recommend `kubectl get deployment knative-operator` (in the default namespace) for verification.

2. **Step 2 used an undefined CRD short name.**
   Original: `kubectl wait ks/knative-serving ...`
   Fixed to: `kubectl wait knativeserving/knative-serving ...`
   Reason: Inspecting the v1.12.0 operator manifest, the `knativeservings.operator.knative.dev` CRD does not declare any `shortNames`. The `ks` alias does not resolve and the command would fail with `error: the server doesn't have a resource type "ks"`.

## Review Notes
- The Knative Operator release URL pattern (`releases/download/knative-vX.Y.Z/operator.yaml`) and v1.12.0 asset are valid.
- API versions used are correct for Knative 1.12: `operator.knative.dev/v1beta1` for KnativeServing/KnativeEventing, `serving.knative.dev/v1` for Service, `sources.knative.dev/v1` for PingSource.
- Autoscaler ConfigMap keys (`enable-scale-to-zero`, `scale-to-zero-grace-period`) and the autoscaling annotations (`autoscaling.knative.dev/min-scale`, `/max-scale`, `/target` in kebab-case) match the official documentation.
- `kubectl get kpa -A` is correct — `kpa` is the documented short name for `podautoscalers.autoscaling.internal.knative.dev`.
- Step 3 (the `kubectl patch configmap config-domain` command) is functionally redundant with the `spec.config.domain` block already set in Step 2's KnativeServing CR; both target the same `config-domain` ConfigMap. Left as-is since it is not technically incorrect.
- The post does not explicitly create the `knative-serving` and `knative-eventing` namespaces before applying the CRs. The Knative operator will create them when the CRs are applied, but the official operator docs recommend creating them first. Not strictly broken, but worth flagging for future revision.
- v1.12.0 reached end-of-life in late 2024; the post's specific version pin will become stale and may warrant a refresh to a current supported release.
