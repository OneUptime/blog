# Validation Summary: How to Repair Missing GitLab CI Provider Metadata in a Fulcio Configuration

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes commands, Fulcio YAML configuration, and a GitLab CI job fragment.

## Technologies Covered
- Sigstore Fulcio and CI-provider identity templates
- GitLab CI/CD ID tokens and OpenID Connect (OIDC)
- Kubernetes deployments, ConfigMaps, and kubectl
- YAML, jq, and Go text/template syntax
- Cosign verification, certificate SANs, Certificate Transparency, Rekor, and private trust roots

## Sources Consulted
- GitLab self-hosted signing and troubleshooting: https://docs.gitlab.com/ci/yaml/signing_self_hosted/
- GitLab ID-token configuration and claim reference: https://docs.gitlab.com/ci/secrets/id_token_authentication/
- Fulcio upstream identity configuration, including the GitLab mapping: https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml
- Fulcio OIDC integration guide: https://github.com/sigstore/fulcio/blob/main/docs/oidc.md
- Fulcio CI-provider implementation (metadata lookup, claim conversion, defaults, and template execution): https://github.com/sigstore/fulcio/blob/main/pkg/identity/ciprovider/principal.go
- Fulcio configuration schema and OIDC verifier setup: https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go
- Fulcio serve command and configuration loading: https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Pod API and container status fields: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- jq manual: https://jqlang.org/manual/
- OpenID Connect Discovery 1.0, provider configuration validation: https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationValidation
- Sigstore signature verification: https://docs.sigstore.dev/cosign/verifying/verify/

## Issues Found
1. **Image reference versus running image identity.** The text requested an image digest, but the deployment query returns the configured image reference, which can be a mutable tag. Clarified that distinction and directed readers to the running pod's container status imageID to record the resolved image identity. The existing query remains valid.
2. **Rejection-test enforcement point.** The final paragraph grouped a wrong audience and a different project together without explaining which component rejects each. Clarified that Fulcio rejects a mismatched audience, whereas verification policy rejects an artifact with an unexpected project SAN. Explicitly stated that this issuer configuration does not limit issuance to a single project.

## Review Notes
- Confirmed that the missing-metadata error comes from the lookup joining the issuer's ci-provider value to ci-issuer-metadata. GitLab documents this exact failure.
- Checked the YAML field names and all GitLab extension mappings against Fulcio's upstream configuration. The quoted branch/tag template is equivalent to the upstream expression. Plain values such as ci_config_sha are claim lookups, not literal certificate values.
- Confirmed claim values override defaults and absent template inputs cause errors. The empty environment default supports jobs without a deployment environment.
- Confirmed --config-path, kubectl deployment JSON output, the jq projection, the container selection flag, and --since=15m. Deployment logs may cover only one selected pod, and the 15-minute window may exclude startup messages; inspect the appropriate pod and time window when troubleshooting.
- The ID-token fragment is correctly scoped as a job fragment and requests the configured sigstore audience. GitLab documents contextual limitations for ci_config_ref_uri and ci_config_sha, including null values when the pipeline definition is outside the project. The post correctly asks readers to check the deployed version's claim contract.
- Exact discovery issuer matching and separate TLS versus signing trust are correct. Verification must enforce the expected issuer and SAN as well as the configured certificate and transparency-log trust.
- The upstream links resolve to the intended resources. Main-branch mappings can change; the post appropriately recommends comparing with the deployed Fulcio version and retaining the reviewed mapping version.
- Review was based on official documentation and source inspection, with local shell syntax checking. No live Kubernetes cluster, GitLab token, or private Sigstore deployment was supplied, so certificate issuance and end-to-end rejection tests were not executed.
