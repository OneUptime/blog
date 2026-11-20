# Validation Summary: How to Trace a Fulcio Signing Certificate to the Exact CI Run Attempt

## Status
validated

## Post Type
Technical troubleshooting guide with Python and GitHub CLI examples.

## Technologies Covered
- Sigstore and Fulcio signing certificates
- X.509 extensions, ASN.1 DER, and UTF8String
- Python, cryptography, and pyasn1
- GitHub Actions, REST API, and GitHub CLI
- GitLab CI job identities
- Artifact signatures, OIDC identities, and authenticated provenance

## Sources Consulted
- Fulcio extension implementation: https://github.com/sigstore/fulcio/blob/main/pkg/certificate/extensions.go
- Fulcio provider identity mappings: https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml
- cryptography X.509 reference: https://cryptography.io/en/latest/x509/reference/
- pyasn1 DER decoder reference: https://pyasn1.readthedocs.io/en/latest/pyasn1/codec/der/contents.html
- GitHub REST API, getting a workflow run attempt: https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run-attempt
- GitHub REST API, jobs for a workflow run attempt: https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt
- GitHub CLI API command: https://cli.github.com/manual/gh_api
- GitHub rerun behavior and previous-attempt selection: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs
- GitHub REST API authentication and 404 troubleshooting: https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#404-not-found-for-an-existing-resource
- GitHub retention policies: https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization
- Sigstore signature verification: https://docs.sigstore.dev/cosign/verifying/verify/

## Issues Found
- The rerun discussion suggested permissions could differ without explaining GitHub's actor-privilege rule. Replaced that wording with the documented behavior: a rerun uses the original triggering actor's privileges, source commit, and Git ref. Retained the observation that runner placement and artifacts can differ. GitHub explicitly states that reruns do not adopt the privileges of the person requesting the rerun.

## Review Notes
- Executed the unchanged Python example against five synthetic certificate fixtures using Python 3.15, cryptography 50.0.2, and pyasn1 0.6.5. Valid URI extraction passed; missing, empty, trailing-data, and invalid-ASN.1 fixtures all exited unsuccessfully as expected. These fixtures test extraction only, not Fulcio trust or artifact verification.
- Python and Bash syntax checks passed, validation JSON and required summary headings were checked, and `git diff --check` passed.
- Confirmed that OID `1.3.6.1.4.1.57264.1.21` is the run invocation URI and that Fulcio emits a DER UTF8String only when the value is nonempty.
- Confirmed GitHub's URI includes both run ID and attempt, while GitLab's URI identifies a job. The mappings also distinguish the reusable build signer from the top-level build configuration.
- The Python example uses documented APIs: PEM loading, OID lookup, raw unrecognized-extension bytes, and DER decoding with a UTF8String schema. Missing, empty, or trailing-data values fail instead of generating a fallback run URL. Invalid ASN.1 can raise a decoder exception; this remains a failure rather than successful extraction.
- Confirmed the GitHub attempt endpoint and the CLI's default GET method and `--jq` flag. The command is a template requiring real repository, run, and attempt values. No authenticated request to a real CI run or artifact-signature verification was performed because no concrete artifact or run was supplied.
- Confirmed that private-resource authentication failures can produce 404 responses, and that run data can be deleted or expire under retention policies.
- The post correctly separates metadata extraction from signature verification and artifact provenance. Restricting subsequent requests to validated provider hosts and routes is appropriate.
- Source links using `main` and `latest` are moving references. Historical investigations must use the CA configuration applicable when the certificate was issued. No deprecated APIs were found in the examples.
