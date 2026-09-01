# Validation Summary: How to Keep Secrets Out of KubeVela Application Manifests in a GitOps Workflow

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes Secrets, Pods, RBAC, ServiceAccounts, volumes, environment variables, Events, and `kubectl`
- KubeVela Applications, the `webservice` component, workflows, CLI, and multi-cluster delivery
- External Secrets Operator, `ExternalSecret`, and `SecretStore`
- GitOps and Argo CD sync waves
- Secrets Store CSI Driver
- SOPS and Flux decryption
- Bitnami Sealed Secrets

## Sources Consulted

- [KubeVela built-in component reference](https://kubevela.io/docs/end-user/components/references/)
- [KubeVela `webservice` definition source](https://github.com/kubevela/kubevela/blob/master/vela-templates/definitions/internal/component/webservice.cue)
- [KubeVela binding configuration and Secrets](https://kubevela.io/docs/end-user/traits/service-binding/)
- [KubeVela `vela show` reference](https://kubevela.io/docs/cli/vela_show/)
- [KubeVela `vela status` reference](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela built-in workflow steps](https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/)
- [KubeVela multi-cluster Application guide](https://kubevela.io/docs/case-studies/multi-cluster/)
- [External Secrets `ExternalSecret` API](https://external-secrets.io/latest/api/externalsecret/)
- [External Secrets `SecretStore` API](https://external-secrets.io/latest/api/secretstore/)
- [External Secrets security best practices](https://external-secrets.io/latest/guides/security-best-practices/)
- [External Secrets multi-tenancy guide](https://external-secrets.io/latest/guides/multi-tenancy/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes Secrets good practices](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [Kubernetes credential injection guide](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/)
- [Kubernetes RBAC good practices for workload creation](https://kubernetes.io/docs/concepts/security/rbac-good-practices/#workload-creation)
- [Kubernetes `kubectl` quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/#viewing-and-finding-resources)
- [Argo CD sync phases and waves](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Secrets Store CSI Driver Secret synchronization](https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret.html)
- [SOPS official documentation](https://getsops.io/docs/)
- [Flux SOPS integration](https://fluxcd.io/flux/guides/mozilla-sops/)
- [Sealed Secrets official repository and usage](https://github.com/bitnami/sealed-secrets)
- [Sealed Secrets scope-widening security advisory](https://github.com/bitnami/sealed-secrets/security/advisories/GHSA-465p-v42x-3fmj)

## Issues Found

- The Secrets Store CSI Driver description omitted an important lifecycle constraint. It now states that optional Kubernetes Secret synchronization exists only while at least one Pod mounts the CSI volume, matching the driver's documented behavior.
- The SOPS description said decryption happened "only during apply," which was too absolute across GitOps implementations. It now says a trusted integration decrypts during reconciliation before applying resources.
- The External Secrets tenancy guidance focused only on restricting `SecretStore` access. An `ExternalSecret` author can choose any remote key readable by the referenced store identity, so the post now also requires restricted `ExternalSecret` writes, provider path scoping, and admission controls for shared-store key prefixes.
- The GitOps layer list placed a namespaced `SecretStore` before its Namespace. The order now creates the Namespace first, then the provider identity and `SecretStore`, followed by the `ExternalSecret` and KubeVela Application.
- The environment-variable wording referred imprecisely to a Pod restart, and the volume-rotation wording omitted the `subPath` exception. The post now explains that a running container does not receive Secret environment updates, that restart normally occurs through replacement Pods, and that `subPath` Secret mounts do not receive automatic updates.
- The post incorrectly described missing Secret resolution as occurring at Pod admission. It now explains that the affected container fails to start and that the kubelet retries an unavailable Secret and reports a Pod Event.
- Event ordering used the legacy-shaped `.lastTimestamp` field, and the Pod placeholder used shell redirection characters. The command now sorts by `.metadata.creationTimestamp`, uses `POD_NAME`, and tells the reader to replace it.
- The multi-cluster description implied that the Application object itself is dispatched. It now correctly says that KubeVela retains the Application on the hub and dispatches resources rendered from it.
- The Sealed Secrets repository moved from `bitnami-labs` to `bitnami`. The documentation link now points directly to the current repository instead of relying on a redirect.

The `ExternalSecret` and KubeVela Application YAML snippets were otherwise valid against the current documented APIs, and all remaining commands and links were verified.

## Review Notes

- The review used the current KubeVela v1.11 reference and the current `external-secrets.io/v1` API. The post correctly tells readers to check installed definitions and CRD served versions because both can differ in older or customized installations.
- The example remains intentionally incomplete until the reader supplies a real image digest, provider identity, `SecretStore`, and remote secret; the post already labels these requirements.
- If Sealed Secrets is selected, use version 0.36.0 or newer. Version 0.36.0 fixes CVE-2026-22728, a scope-widening issue in the rotation endpoint.
- No unresolved technical issues remain.
