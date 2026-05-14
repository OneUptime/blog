# Validation Summary: How to Fix 'webhook validation failed' Error in Flux CD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD Kustomization and reconciliation
- Kubernetes admission webhooks
- cert-manager webhook and cainjector
- OPA Gatekeeper constraints and namespace exclusions
- Kyverno ClusterPolicy validation rules
- kubectl and flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes API reference for admissionregistration.k8s.io/v1: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- cert-manager CA injector documentation: https://cert-manager.io/docs/concepts/ca-injector/
- cert-manager installation manifest for v1.20.2: https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml
- Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Kyverno match/exclude documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The cert-manager webhook example used the older/non-current webhook name `validate.cert-manager.io`. Updated it to `webhook.cert-manager.io`, which matches the current cert-manager validating webhook manifest.
- The certificate diagnostics treated `cert-manager-webhook-ca` as a cert-manager `Certificate`. In the current default cert-manager install it is a Kubernetes Secret used by the webhook dynamic serving certificate flow. Updated the commands to inspect the Secret instead.
- The certificate regeneration instructions only restarted the webhook. Updated them to delete the dynamic serving CA Secret before restarting the webhook so the Secret can be recreated.
- The CA bundle comment described the source as a webhook service secret. Updated it to refer to the webhook CA Secret.
- The Kyverno policy example used the deprecated top-level `spec.validationFailureAction`. Moved the setting to `spec.rules[*].validate.failureAction`, which is the current documented form.
- The webhook timeout section said the default is usually 10 or 30 seconds. Updated it to the Kubernetes default of 10 seconds and the valid range of 1 to 30 seconds.
- The JSON patch examples used `replace` for optional webhook fields. Changed them to `add`, which works whether the optional field is absent or already present.

## Review Notes
The post is technically relevant and the remaining Flux, Kubernetes, Gatekeeper, Kyverno, cert-manager, kubectl, and flux CLI snippets align with current official documentation. Some operational commands remain intentionally generic and may need namespace or resource-name adjustments in clusters with non-default installations.
