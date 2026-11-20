# How to Repair Missing GitLab CI Provider Metadata in a Fulcio Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, GitLab, OIDC, Troubleshooting

Description: Repair the link between a GitLab OIDC issuer and its Fulcio CI-provider metadata, then validate the resulting certificate identity and trust material.

---

The error `metadata not found for ci provider gitlab-pipeline` points to Fulcio's identity mapping, not a missing registry password. Fulcio needs both an issuer definition and the metadata describing how that provider's claims become certificate fields.

Adding only `issuer-url` and `client-id` can leave discovery working while certificate construction fails. [GitLab's self-hosted signing guide](https://docs.gitlab.com/ci/yaml/signing_self_hosted/) documents this exact missing-metadata error.

## Confirm which configuration was loaded

Record the Fulcio image reference, startup arguments, and mounted config path. The deployment command below shows the configured image reference; also record the running container’s resolved image ID from the pod’s `.status.containerStatuses[].imageID`. A corrected file in a repository is irrelevant if the pod still mounts an older ConfigMap or starts with a different `--config-path`.

```bash
kubectl -n sigstore get deploy fulcio -o json |
  jq '.spec.template.spec.containers[] | {name, image, args, volumeMounts}'

kubectl -n sigstore logs deploy/fulcio -c fulcio --since=15m
```

Review startup messages as well as the failed request. A generic health endpoint is not proof that every OIDC provider initialized correctly.

Determine the exact issuer from your GitLab discovery document, and compare it with the token's `iss`. Include any port or path; do not add or remove a trailing slash casually. Fix TLS trust independently if Fulcio cannot fetch discovery or JWKS.

## Keep the provider name consistent

The modern configuration uses a generic CI type and a provider identifier that joins the two sections:

```yaml
oidc-issuers:
  https://gitlab.example.com:
    issuer-url: https://gitlab.example.com
    client-id: sigstore
    type: ci-provider
    ci-provider: gitlab-pipeline
    contact: platform@example.com
    description: Company GitLab

ci-issuer-metadata:
  gitlab-pipeline:
    default-template-values:
      url: https://gitlab.example.com
      environment: ""
    extension-templates:
      build-signer-uri: "https://{{ .ci_config_ref_uri }}"
      build-signer-digest: "ci_config_sha"
      runner-environment: "runner_environment"
      source-repository-uri: "{{ .url }}/{{ .project_path }}"
      source-repository-digest: "sha"
      source-repository-ref: 'refs/{{if eq .ref_type "branch"}}heads/{{else}}tags/{{end}}{{ .ref }}'
      source-repository-identifier: "project_id"
      source-repository-owner-uri: "{{ .url }}/{{ .namespace_path }}"
      source-repository-owner-identifier: "namespace_id"
      build-config-uri: "https://{{ .ci_config_ref_uri }}"
      build-config-digest: "ci_config_sha"
      build-trigger: "pipeline_source"
      run-invocation-uri: "{{ .url }}/{{ .project_path }}/-/jobs/{{ .job_id }}"
      source-repository-visibility-at-signing: "project_visibility"
      deployment-environment: "environment"
    subject-alternative-name-template: "https://{{ .ci_config_ref_uri }}"
```

This follows the [upstream GitLab mapping](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml). Compare it with the version you deploy and merge it with existing issuers rather than replacing the whole file. The two occurrences of `gitlab-pipeline` must match exactly.

The `url` value is your GitLab issuer base URL, not the public `gitlab.com` URL copied from an example. Review default values carefully: token claims with the same name take precedence over defaults. [Fulcio's integration guide](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md) explains that template behavior.

## Supply a suitable GitLab ID token

The signing job needs an ID token with the configured audience:

```yaml
id_tokens:
  SIGSTORE_ID_TOKEN:
    aud: sigstore
```

This is a job fragment. Keep it in the authorized signing job and use a current client configured for your private Sigstore endpoints. Do not substitute a deprecated job JWT or an access token.

Check the actual claim contract for your GitLab version. In particular, `ci_config_ref_uri`, `ci_config_sha`, runner information, and repository claims must have the types and meanings expected by the mapping. [GitLab's ID-token reference](https://docs.gitlab.com/ci/secrets/id_token_authentication/) lists those fields and their contextual limitations.

A present metadata block cannot repair a missing token claim. If the error changes to a template failure, investigate that claim rather than inserting a fabricated default identity.

## Validate the emitted identity

Reload the deployment through your normal rollout and request a certificate from a harmless canary job. Inspect its SAN, issuer extension, workflow digest, source repository, and runner environment. Confirm the URI uses the intended GitLab host and the expected configuration path.

Then verify the signed artifact with the private trusted root and exact issuer/SAN policy. The Fulcio code-signing chain, CT key, and Rekor trust are separate from GitLab's HTTPS CA. Keep all those checks enabled.

Test that Fulcio rejects a token with the wrong audience, and that your verification policy rejects an artifact signed by a different project with a different SAN. The issuer configuration above does not itself restrict certificate issuance to one project. Once successful issuance and policy rejection both work, retain the mapping version with your deployment. Future upstream template changes should receive the same review as an authentication-policy change.
