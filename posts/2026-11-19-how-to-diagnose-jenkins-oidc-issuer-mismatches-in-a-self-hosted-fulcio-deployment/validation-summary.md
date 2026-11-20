# Validation Summary: Diagnose Jenkins OIDC Issuer Mismatches in Self-Hosted Fulcio

## Status
validated

## Post Type
Technical troubleshooting guide with Python and Bash examples.

## Technologies Covered
- Jenkins OpenID Connect Provider plugin and workload credentials
- OpenID Connect (OIDC), JWT issuer and audience claims, discovery metadata, and JWKS
- Sigstore Fulcio issuer configuration and CI identity mapping
- TLS, internal certificate authorities, reverse proxies, and Kubernetes pod networking
- Python 3, Bash, curl, and jq

## Sources Consulted
- Jenkins OIDC Provider plugin documentation: https://plugins.jenkins.io/oidc-provider/
- OpenID Connect Discovery 1.0, especially sections 3, 4.1, 4.3, and 5: https://openid.net/specs/openid-connect-discovery-1_0.html
- Fulcio OIDC integration guide: https://github.com/sigstore/fulcio/blob/main/docs/oidc.md
- Fulcio configuration implementation: https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go
- Fulcio CI provider identity implementation: https://github.com/sigstore/fulcio/blob/main/pkg/identity/ciprovider/principal.go
- Sigstore signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Python JSON library documentation: https://docs.python.org/3/library/json.html
- curl command-line reference: https://curl.se/docs/manpage.html
- jq manual, object construction: https://jqlang.org/manual/

## Issues Found
No technical issues found.

The README.md was left unchanged.

## Review Notes
- Confirmed the distinction between Jenkins login authentication and workload token issuance. The provider documentation supports root and folder credential placement, obtaining the generated issuer from the update page, external issuer hosting, and key rotation when credentials are updated and saved or recreated.
- Confirmed that discovery metadata and token issuer identifiers require exact comparison. Removing a trailing slash when constructing the discovery request path is specified by OIDC Discovery and does not authorize normalizing issuer identifiers during validation.
- Confirmed Fulcio's YAML field names, fixed issuer map lookup, audience configuration, custom PEM CA support, and CI provider metadata mapping. The post appropriately directs readers to review their deployed release; upstream main is a moving reference, not a guarantee that every older release supports identical behavior.
- Executed the Python example: the trailing-slash mismatch produces exit status 1 and the documented error. A control with matching values exits successfully. Checked the Bash example with bash -n and executed its jq projection against representative discovery JSON successfully.
- Verified the documented curl options and timeout units. The command intentionally does not follow redirects. It projects metadata fields; it does not itself display response headers or validate the metadata. The prose separately instructs the reader to check the original HTTP status.
- For future automation, consider pipefail so a curl failure cannot be masked by a successful downstream jq exit. The current example is an interactive inspection probe and makes no claim that its pipeline exit status constitutes validation.
- Confirmed the advice to separate issuer, signature/JWKS, audience, and claim-mapping failures, and to verify artifact signatures against the intended certificate identity and issuer. A neighboring job is a useful negative case when that job is outside the intended verification policy.
- The post's documentation links resolve to the intended resources. Example issuer URLs are placeholders and were not treated as live infrastructure.
- No Jenkins controller, Fulcio deployment, real token, or signing trust configuration was provided. End-to-end certificate issuance, pod networking, and canary signature verification were therefore not performed; validation covers documentation, source inspection, and local example checks.
