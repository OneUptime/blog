# Validation Summary: Integrating Rancher with Aqua Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Aqua Security
- Kubernetes
- Helm
- `kubectl`
- Aqua Enforcer
- Aqua KubeEnforcer
- Image assurance and runtime policy controls

## Sources Consulted
- Aqua Security Helm repository index: https://helm.aquasec.com/index.yaml
- Aqua official Helm charts repository: https://github.com/aquasecurity/aqua-helm
- Aqua official deployments repository: https://github.com/aquasecurity/deployments
- Aqua Security integrations page: https://www.aquasec.com/integrations/
- Aqua Security blog, Kubernetes admission controller for image assurance: https://www.aquasec.com/blog/kubernetes-admission-controller/
- Aqua Security blog, container runtime protection controls: https://www.aquasec.com/blog/how-to-detect-and-block-ai-assisted-malware-like-koske/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes dynamic admission control reference: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Rancher RBAC documentation: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac

## Issues Found
- The architecture diagram incorrectly implied that Aqua Server and Enforcer pods are the same component. Updated it to separate Aqua Server (console/gateway), Aqua Enforcer, Aqua KubeEnforcer, and Aqua Scanner roles.
- The registry secret was named `aqua-registry`, which does not match the default secret name expected by Aqua's public Helm deployment guidance. Updated it to `aqua-registry-secret`.
- The Aqua server Helm example used incorrect value paths (`db.external.*` instead of `global.db.external.*`) and omitted the external audit database settings required by the current chart when `global.db.external.enabled=true`. Corrected the flags and added the audit DB values.
- The enforcer Helm example used the wrong gateway keys (`gate.host` / `gate.port`) and the wrong in-cluster gateway service name. Updated it to `global.gateway.address` / `global.gateway.port` and `aqua-gateway-svc.aqua`.
- The admission-control section used a hand-written `ValidatingWebhookConfiguration` that was not a valid/current Aqua installation path and omitted required `admissionregistration.k8s.io/v1` webhook fields. Replaced it with the supported `kube-enforcer` Helm deployment.
- The post claimed Aqua scan results can be viewed directly in the Rancher UI via an Aqua icon. I could not verify any supported Rancher UI integration for that behavior in current official sources, so I corrected the section to review findings in the Aqua console and correlate workloads in Rancher.
- The runtime policy JSON example did not match a verified public Aqua policy schema. Replaced it with the supported console workflow and verified runtime controls.
- The best-practice reference to `aquasec scan` could not be validated against current Aqua official repos or public deployment docs. Rewrote it to refer to Aqua scanners or registry integrations in CI/CD.
- The RBAC recommendation overstated Rancher's scope by implying Rancher RBAC controls Aqua policy changes. Narrowed it to Rancher-side management of the Aqua deployment in the cluster.

## Review Notes
- Aqua's public Helm artifacts are still published on the `2022.4` chart line as of 2026-04-23. Production users should pin a tested chart version instead of relying on whatever is latest in the repo.
- Aqua's main product documentation for these deployment topics redirects to authenticated docs, so public Aqua Helm charts, Aqua-managed GitHub repositories, Kubernetes docs, Helm docs, and Rancher docs were used for source validation.
- The self-hosted and SaaS flows are different. The post now makes Step 3 self-hosted-only and notes the extra gateway and service-account settings needed when connecting enforcers to Aqua SaaS.
