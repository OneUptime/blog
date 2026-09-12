# Validation Summary: Debug CoCo RCAR Handshake and TEE Evidence Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Confidential Containers (CoCo)
- Trustee Key Broker Service (KBS) and the RCAR protocol
- Trustee Attestation Service and EAR attestation results
- Confidential Containers guest components and Attestation Agent REST API
- Kata Containers confidential guests
- Kubernetes and `kubectl`
- AMD SEV-SNP, Intel TDX, and Azure vTPM attesters
- HTTP, HTTPS, TLS, cookies, and reverse proxies

## Sources Consulted

- [Trustee KBS attestation protocol at the pinned revision](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/kbs_attestation_protocol.md)
- [Trustee KBS configuration at the pinned revision](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/config.md)
- [Trustee KBS attestation protocol (current)](https://github.com/confidential-containers/trustee/blob/main/kbs/docs/kbs_attestation_protocol.md)
- [Trustee KBS configuration (current)](https://github.com/confidential-containers/trustee/blob/main/kbs/docs/config.md)
- [Trustee attestation-token verification](https://github.com/confidential-containers/trustee/blob/main/kbs/docs/attestation_token_verification.md)
- [Confidential Containers: Get Attestation](https://confidentialcontainers.org/docs/features/get-attestation/)
- [Confidential Containers: Trustee policies](https://confidentialcontainers.org/docs/attestation/policies/)
- [Guest components build targets at the pinned revision](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/README.md)
- [Guest REST API documentation at the pinned revision](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/api-server-rest/README.md)
- [Guest REST API OpenAPI definition](https://github.com/confidential-containers/guest-components/blob/main/api-server-rest/openapi/api.json)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found
No technical issues found.

## Review Notes
The post deliberately links revision-pinned Trustee and guest-components documentation, which makes its version-specific claims reproducible. Deployment details such as RuntimeClass names, namespaces, container names, attesters, quoting services, session storage, and policy claim layouts remain installation- and version-dependent; the post correctly instructs readers to discover or verify them rather than presenting fixed values. The diagnostic REST API is security-sensitive and disabled by default, and the post correctly limits its use to controlled diagnostics and instructs readers to remove it afterward.
