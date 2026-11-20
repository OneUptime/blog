# Validation Summary: Diagnose Azure Pipelines OIDC Compatibility Before Signing with Fulcio

## Status
validated

## Post Type
Technical diagnostic guide with Python and shell examples.

## Technologies Covered
- Azure Pipelines and Azure DevOps workload identity federation
- Microsoft Entra ID
- OpenID Connect (OIDC), JWT, discovery, and JWKS
- Sigstore Fulcio and certificate identity policies
- Python standard library: base64, json, and pathlib
- curl and jq

## Sources Consulted
- [Microsoft Azure DevOps OIDC token creation API](https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/oidctoken/create?view=azure-devops-rest-7.1)
- [Microsoft workload identity service connection troubleshooting](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/troubleshoot-workload-identity?view=azure-devops)
- [Fulcio Azure Pipelines integration issue #1803](https://github.com/sigstore/fulcio/issues/1803)
- [Fulcio OIDC integration and identity mapping guide](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Sigstore public instance identity provider requirements](https://github.com/sigstore/fulcio/blob/main/docs/new-idp-requirements.md)
- [Fulcio API protocol definition](https://github.com/sigstore/fulcio/blob/main/fulcio.proto)
- [Live public Fulcio configuration](https://fulcio.sigstore.dev/api/v2/configuration)
- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html)
- [Python base64 documentation](https://docs.python.org/3/library/base64.html)
- [Python json documentation](https://docs.python.org/3/library/json.html)
- [Python pathlib documentation](https://docs.python.org/3/library/pathlib.html)
- [curl command-line reference](https://curl.se/docs/manpage.html)
- [jq manual](https://jqlang.org/manual/)

## Issues Found
- The instruction immediately following the configuration command could imply that the endpoint exposes the complete required claim mapping. The API schema and live response expose issuer metadata, including audience, issuer type, and proof-of-possession challenge claim, but omit the full SAN and certificate-extension mappings. Updated that instruction to direct readers to the deployment's provider configuration or implementation for those mappings. No sections or code examples were changed.

## Review Notes
- Confirmed that the token creation API documents `serviceConnectionId` as optional, returns `oidcToken`, and does not document an arbitrary audience parameter. The linked API version is `7.1-preview.1`, despite the documentation view being labeled 7.1.
- Confirmed the historical issue's issuer and audience. Its example is evidence for the reported flow, not a guarantee for all current Azure Pipelines flows.
- Microsoft documents both the Azure DevOps issuer and the newer Microsoft Entra issuer for service connections. Its troubleshooting table also restricts the newer flow's token exchange to Microsoft Entra access tokens; the post appropriately does not promise Fulcio compatibility.
- Executed the Python snippet unchanged using synthetic JWT-shaped input in a temporary directory with a mode-0600 token file. Checked string and array audiences, a missing optional `nbf` field, rejection of a two-segment input, and absence of the complete token in output. All checks passed. These checks test decoding only, not cryptographic verification; the post explicitly states that limitation.
- Executed the curl/jq example against the public Fulcio endpoint, with an additional request timeout for the review. It returned the expected issuers array. The flags and jq field selector are valid. The observed configuration did not advertise the Azure Pipelines issuer forms discussed in the post; Azure Kubernetes issuer entries are a separate integration.
- Confirmed the public provider requirements for a configurable `sigstore` audience and prevention of subject reuse, along with the need for reviewed CI identity mappings. Private configuration does not imply public service onboarding.
- Reviewed all technical reference links successfully; the public API was checked through curl because the web reader could not open it. No deprecated APIs were identified in the examples.
- No Azure credentials or live pipeline were supplied. Token acquisition, authenticated certificate issuance, artifact signing, and end-to-end verification were assessed against documentation rather than executed. This validation concerns the diagnostic guide, not a certification of Azure Pipelines compatibility.
