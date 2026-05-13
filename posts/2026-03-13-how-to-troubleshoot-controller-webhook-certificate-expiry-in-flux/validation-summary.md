# Validation Summary: How to Troubleshoot Controller Webhook Certificate Expiry in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes admission webhooks
- Kubernetes Secrets
- cert-manager
- kubectl
- OpenSSL
- Helm

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux latest install manifest from GitHub releases: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/validating-webhook-configuration-v1/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager FAQ: https://cert-manager.io/docs/faq/
- cert-manager cmctl documentation: https://cert-manager.io/docs/reference/cmctl/

## Issues Found
- The post incorrectly stated that Flux controllers use admission webhooks by default. Flux v2 default installs controllers, CRDs, RBAC, services, and network policies, but the official install manifest does not include Flux controller ValidatingWebhookConfiguration or MutatingWebhookConfiguration resources. I changed the scope to custom or optional admission webhooks that target Flux resources.
- The commands assumed fixed Kubernetes object names such as `validatingwebhookconfiguration flux-system` and `secret webhook-server-cert`. These are not default Flux objects. I replaced them with variables and discovery-oriented examples so readers use the real webhook configuration, service namespace, secret, and cert-manager Certificate names from their cluster.
- The cert-manager renewal flow used `kubectl delete certificate`, which can stop future renewal and may not recreate the Certificate unless something else owns it. I changed it to the documented `cmctl renew` command.
- The manual certificate example generated a certificate for `source-controller.flux-system.svc`, which is not an admission webhook service in default Flux. I changed the example to use the actual webhook service name and namespace variables.
- The post recommended `flux install` as the simplest certificate fix. That is misleading for admission webhook certificate expiry because default Flux does not create those webhook certificates. I changed the section to reinstall or reconcile the webhook package instead.
- The restart commands restarted Flux controllers. Since the corrected scope is the webhook server, I changed them to restart the webhook deployment selected by its app label.

## Review Notes
The guide is now accurate for clusters that add an admission webhook around Flux resources. Flux also has notification-controller webhook receivers, but those are HTTP endpoints for external source notifications, not Kubernetes admission webhooks.
