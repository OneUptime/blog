# Validation Summary: How to Configure Kubernetes Service Accounts for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar mode
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- Kubernetes projected service account tokens and TokenRequest API
- Istio AuthorizationPolicy
- Istio mutual TLS and workload identity
- Kustomize
- kubectl, istioctl, jq, curl

## Sources Consulted
- Istio security concepts and authorization: https://istio.io/latest/docs/concepts/security/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security best practices for service account tokens: https://istio.io/latest/docs/ops/best-practices/security/
- Istio security model and CA authentication: https://istio.io/latest/docs/ops/deployment/security-model/
- Istio TLS configuration and Auto mTLS: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes ServiceAccount administration: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes ServiceAccounts concept documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Kustomize example used a generic `generators` entry for service accounts. Kubernetes Kustomize documentation covers built-in generators for ConfigMaps and Secrets, while ServiceAccounts should be managed as normal resources unless a custom plugin is explicitly configured. Changed the example to include `service-accounts.yaml` under `resources`.
- The TokenRequest support check used `kubectl get --raw /api/v1/namespaces/default/serviceaccounts/default/token`, but the token subresource is created through the TokenRequest API rather than retrieved with a raw GET. Replaced it with the Istio-documented API discovery check for `serviceaccounts/token`.
- The text conflated Istio token audience configuration with the mesh trust domain. Updated the wording to distinguish the sidecar injector's proxy token audience from the mesh trust domain used in identities and policies.
- The RBAC section incorrectly implied Istio sidecars generally need workload-specific Kubernetes RBAC permissions. Reworded it to focus on application pod permissions and the fact that containers able to read the mounted token can use the pod service account's RBAC.
- The cross-namespace section described AuthorizationPolicy principals as full SPIFFE URIs, but Istio AuthorizationPolicy `source.principals` uses the trust-domain principal format without the `spiffe://` prefix. Reworded this as the full peer principal string.
- The verification section used `istioctl authn tls-check`, which is not listed in the current Istio command reference. Replaced it with a current `istioctl proxy-config cluster` command to inspect outbound cluster configuration for the destination service.

## Review Notes
The Kubernetes and Istio CLIs were not installed in the local environment, so command validation was performed against official documentation rather than local `--help` output.
