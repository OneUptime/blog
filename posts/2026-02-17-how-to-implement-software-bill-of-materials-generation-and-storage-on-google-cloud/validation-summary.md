# Validation Summary: How to Use Software Bill of Materials Generation and Storage on Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Artifact Registry
- Google Cloud Storage
- BigQuery
- Terraform Google provider
- Syft
- Grype
- Cosign / Sigstore
- CycloneDX
- SPDX
- Python Google Cloud client libraries

## Sources Consulted
- Anchore Syft output formats: https://oss.anchore.com/docs/guides/sbom/formats/
- Anchore Grype README and SBOM scan examples: https://github.com/anchore/grype/blob/main/README.md
- Sigstore Cosign attestation command reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_attest.md
- Sigstore Cosign SBOM attachment deprecation notice: https://github.com/sigstore/cosign/blob/main/doc/cosign_attach_sbom.md
- Sigstore Cosign installation and container image documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Google Cloud Build config file schema: https://cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build step ordering with waitFor: https://cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Terraform Google provider google_storage_bucket resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- BigQuery arrays and UNNEST documentation: https://cloud.google.com/bigquery/docs/arrays
- BigQuery operators and STRING comparison behavior: https://cloud.google.com/bigquery/docs/reference/standard-sql/operators
- Google Cloud BigQuery Python query parameters reference: https://cloud.google.com/python/docs/reference/bigquery/latest/query
- Python datetime documentation and Python 3.12 deprecation notes: https://docs.python.org/3.12/library/datetime.html and https://docs.python.org/3.12/whatsnew/3.12.html

## Issues Found
- The Cloud Build Cosign step used `cosign attach sbom`, which is deprecated, and attempted to call `crane` from the Cosign step. Updated the example to use the current `cosign attest --predicate ... --type cyclonedx` workflow with the official `ghcr.io/sigstore/cosign/cosign` release image.
- The Terraform bucket example used a lifecycle rule with `age = 0` to set the storage class to NEARLINE and described it as preventing accidental deletion. Updated the bucket to use `storage_class = "NEARLINE"` directly and changed the comment to accurately describe object versioning as recovery help for accidental overwrites or deletions.
- The Python indexing example used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The Log4j BigQuery example compared semantic versions as strings, which can miss affected versions because BigQuery compares strings codepoint-by-codepoint. Replaced the condition with numeric comparison of parsed major, minor, and patch segments for simple `2.x.y` versions.
- The vulnerability alert Python example interpolated affected versions directly into SQL. Replaced the generated SQL with a BigQuery array query parameter and `UNNEST(@affected_versions)`.

## Review Notes
- Python code blocks were parsed successfully with `ast`.
- The Cloud Build YAML block was parsed successfully with PyYAML.
- Terraform was not installed in the local environment, so the HCL snippet was reviewed against provider documentation but not validated with `terraform validate`.
- The Cosign attestation example assumes the build environment is configured for non-interactive signing, such as ambient OIDC/keyless signing or another Cosign key configuration.
