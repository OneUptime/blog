# Validation Summary: Why Did the Restored Environment Start but the Application Still Fail? Finding Missing Secrets, DNS, and Certificates

## Status
validated

## Post Type
Technical troubleshooting guide / disaster-recovery runbook

## Technologies Covered
- Kubernetes Pods, events, service accounts, RBAC, impersonation, and `kubectl`
- Kubernetes Secrets and external secret-delivery mechanisms, including CSI drivers, controllers, agents, and init containers
- Kubernetes DNS, resolver search paths, Service discovery, private zones, and IPv4/IPv6 behavior
- DNS caching, negative caching, and serve-stale behavior
- OpenSSL 3.6 `s_client`
- TLS, mutual TLS, SNI, X.509 certificate chains, SAN identity checks, trust stores, and revocation
- Certificate issuance and ACME-related recovery dependencies
- Disaster-recovery dependency validation and custom YAML preflight checks

## Sources Consulted
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) - native Secret delivery, kubelet fetch behavior, updates, and base64 representation.
- [Kubernetes: Good practices for Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/) - least-privilege access, external Secret Store CSI behavior, and handling precautions.
- [Kubernetes: Distribute Credentials Securely Using Secrets](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/) - Secret volume and environment-variable behavior, including the restart requirement for environment variables.
- [Kubernetes: Node Authorization](https://kubernetes.io/docs/reference/access-authn-authz/node/) - kubelet authorization to read Secrets referenced by scheduled Pods.
- [Kubernetes: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/) and [User Impersonation](https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/) - command syntax, resource/name checks, and `--as` permission requirements.
- [Kubernetes: kubectl Quick Reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/) and [Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/) - current Event sorting guidance and legacy Event timestamp fields.
- [Kubernetes: Secret API](https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/secret-v1/) and [API resource versions](https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions) - Secret fields and the opaque, API-level meaning of `metadata.resourceVersion`.
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/) - ephemeral-container behavior and limitations.
- [Kubernetes: Debugging DNS Resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/) and [DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) - resolver inspection, search paths, and Service DNS behavior.
- [Kubernetes: Using a KMS Provider for Data Encryption](https://kubernetes.io/docs/tasks/administer-cluster/kms-provider/) - KMS envelope encryption and key-unwrapping dependencies.
- [OpenSSL 3.6: `openssl s_client`](https://docs.openssl.org/3.6/man1/openssl-s_client/) and [certificate verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/) - all shown flags, trust-store behavior, hostname checks, certificate purpose, and verification error handling.
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280.html) - certification-path construction and validation.
- [RFC 6066: TLS Extensions](https://www.rfc-editor.org/rfc/rfc6066.html), [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446.html), and [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html) - SNI, certificate/private-key proof, and SAN-based service identity.
- [RFC 8767: Serving Stale Data to Improve DNS Resiliency](https://www.rfc-editor.org/rfc/rfc8767.html) and [RFC 2308: Negative Caching of DNS Queries](https://www.rfc-editor.org/rfc/rfc2308.html) - stale and negative DNS caching behavior.
- [RFC 8555: Automatic Certificate Management Environment](https://www.rfc-editor.org/rfc/rfc8555.html) - certificate authorization and issuance dependencies.
- [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) and [FIPS 198-1](https://csrc.nist.gov/pubs/fips/198-1/final) - offline guessing risk for raw hashes of low-entropy secrets and keyed-hash construction.
- [YAML 1.2.2 Specification](https://yaml.org/spec/1.2.2/) - syntax of the illustrative preflight configuration.
- [AWS Well-Architected Framework: Use defined recovery strategies](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html) - recovery-strategy and recovery-objective context.

## Issues Found
1. **Native Kubernetes Secret delivery was conflated with Pod service-account API access.** A Pod's service account normally does not need `get` permission on a Secret that Kubernetes injects as a volume or environment variable; the kubelet fetches that Secret. The retrieval step now tells readers to test the identity actually used by the delivery path, and the `kubectl auth can-i` example is explicitly limited to applications that read the Kubernetes Secret API directly. The explanation also notes that `--as` requires impersonation permission.
2. **The Event command sorted on a legacy timestamp field.** Replaced `--sort-by=.lastTimestamp` with the Kubernetes quick-reference pattern `--sort-by=.metadata.creationTimestamp`, because modern `events.k8s.io/v1` Events use `eventTime` and `series.lastObservedTime` rather than the legacy `lastTimestamp` field.
3. **The text implied that every Kubernetes Secret has a semantic version.** Native Secret objects have an opaque API `resourceVersion`, not a portable credential-version field. The source check now uses the exact Secret name plus an approved version annotation or deployment ID when semantic versioning is required.
4. **An unkeyed one-way fingerprint was treated as inherently non-sensitive.** A raw hash can enable offline guessing when a secret has low entropy. The post now calls for an approved keyed diagnostic fingerprint and explicitly excludes raw secret hashes from evidence.
5. **A certificate authority was described as unwrapping encrypted secret data.** Replaced that terminology with the key management service or decryption key actually needed to decrypt the data.
6. **The leaf-certificate repair statement was overly categorical.** Deploying a new leaf can be sufficient when the matching private key, required intermediates, and client trust are already correct. The sentence now states those server-side prerequisites without implying that a leaf replacement can never repair the path.

## Review Notes
- The `kubectl describe`, `kubectl get events`, `kubectl auth can-i`, and `kubectl exec` forms are syntactically valid. For a multi-container Pod, operators should add `-c <application-container>` so `exec` does not select a sidecar or another default container.
- An ephemeral container in the same Pod is suitable for network and DNS tests, but it does not automatically inherit the application container's filesystem, environment variables, or volume mounts. Application-specific Secret and trust-store behavior still needs testing through the application container or stack, as the post states.
- All shown OpenSSL 3.6 options are current. `-showcerts` displays the server-sent certificate list, not a separately verified chain. The displayed command validates the server path and hostname but does not by itself exercise revocation or mutual TLS; those require policy-specific checks and, for mTLS, client certificate/key options or the application stack.
- OpenSSL 3.6 can fall back to the certificate subject Common Name for `-verify_hostname`. The post's separate requirement that the name appear in the applicable SAN is therefore important for current RFC 9525 behavior.
- The DNS TTL, recursive-versus-authoritative, negative-cache, and RFC 8767 serve-stale explanations are accurate. The FQDN/search-path comparison is particularly relevant to Kubernetes' resolver configuration.
- The preflight block is valid YAML but is an illustrative organization-specific schema, not a standard Kubernetes or vendor configuration API.
- All links in the post resolved to the intended official documentation or standards pages on the validation date.
