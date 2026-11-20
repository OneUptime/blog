# Validation Summary: Assess Fulcio Exposure to OIDC Discovery Redirect and JWKS Substitution Flaws

## Status
validated

## Post Type
Technical security assessment and troubleshooting guide.

## Technologies Covered
- Sigstore Fulcio and OIDC issuer configuration
- OpenID Connect discovery, JWKS, and verifier caching
- SSRF, HTTP redirects, and credential scoping
- Kubernetes Pods, Deployments, ConfigMaps, and service accounts
- Bash, kubectl, jq, and curl

## Sources Consulted
- [Fulcio original advisory GHSA-f5mr-q85p-6hh6](https://github.com/sigstore/fulcio/security/advisories/GHSA-f5mr-q85p-6hh6)
- [Fulcio follow-up advisory GHSA-55r8-p8r6-2f8m](https://github.com/sigstore/fulcio/security/advisories/GHSA-55r8-p8r6-2f8m)
- [Fulcio security advisories](https://github.com/sigstore/fulcio/security/advisories)
- [Fulcio release notes](https://github.com/sigstore/fulcio/releases)
- [Fulcio configuration implementation](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes service-account management](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [jq manual](https://jqlang.org/manual/)
- [curl manual](https://curl.se/docs/manpage.html)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found
1. **Exposure stated too broadly.** The introduction said an affected version establishes exposure without qualification. Added the relevant issuer configuration as a condition. The JWKS follow-up specifically depends on meta-issuers, and credential leakage has additional Kubernetes configuration prerequisites.
2. **Inventory output overstated.** The text described the commands as capturing image digests and configuration actually mounted in every replica. They return runtime image IDs and Deployment template references, not mounted file contents; older replicas may also differ from the current template. Corrected the description and instructed readers to resolve image IDs where needed and inspect each replica’s mounted configuration separately.
3. **Local curl configuration could change diagnostic behavior.** Added `-q` as curl’s first argument to prevent loading curlrc settings that could enable redirects or supply credentials. This makes the example consistent with its stated initial-response-only purpose.

## Review Notes
- Confirmed the original advisory was published in May 2026, lists versions through 1.8.5 as affected, and names 1.8.6 as patched. Confirmed the follow-up lists versions through 1.8.8 as affected, names 1.9.0 as patched, and describes incomplete earlier SSRF fixes.
- The release page lists newer releases, including 1.10.1. The article correctly treats advisory patch versions as historical minimums and directs readers to current advisories and release notes instead of prescribing an old release.
- Reviewed the implementation’s cross-host redirect check, service-account transport selection, safe-dialer installation, and in-memory verifier cache. The main-branch link is mutable; readers must examine their deployed release or vendor backport. A direct fetch of the v1.9.0 raw configuration source was unavailable, so version boundaries were verified against the official advisories rather than inferred from main.
- OIDC discovery metadata supplies the JWKS URL, and the example’s discovery path construction is appropriate. A successful curl fetch cannot establish that Fulcio rejects malicious discovery responses.
- Verified kubectl namespace, selector, and JSON output options; reviewed the referenced fields and jq operators. Both Bash blocks passed `bash -n`; both jq filters executed successfully against representative JSON fixtures, including missing container status.
- No live Kubernetes commands, production issuer probes, signing canaries, or Fulcio rejection tests were executed. Those require deployment-specific infrastructure. Validation covers the article’s technical instructions, not a particular deployment’s security posture.
- Credential invalidation depends on token type and binding. The article appropriately defers the procedure to the deployment’s Kubernetes incident process. Upgrading does not undo prior token disclosure or establish that earlier issuance was legitimate.
- The referenced article links resolve to the intended resources. The example issuer is a placeholder to replace with an administrator-approved issuer.
