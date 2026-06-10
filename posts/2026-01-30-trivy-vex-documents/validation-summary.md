# Validation Summary: How to Create Trivy VEX Documents

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy (vulnerability scanner)
- OpenVEX (v0.2.0 specification)
- CSAF (Common Security Advisory Framework v2.0) VEX profile
- vexctl (OpenVEX CLI)
- GitHub Actions (aquasecurity/trivy-action)
- GitLab CI
- Shell / Bash, jq
- Python 3 (subprocess, json, datetime)
- Docker

## Sources Consulted
- Trivy VEX documentation: https://trivy.dev/latest/docs/supply-chain/vex/
- Trivy local VEX files docs: https://trivy.dev/latest/docs/supply-chain/vex/file/
- Trivy `trivy image` CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- OpenVEX specification: https://github.com/openvex/spec/blob/main/OPENVEX-SPEC.md
- vexctl repository and command sources: https://github.com/openvex/vexctl (internal/cmd/create.go, add.go, merge.go)
- aquasecurity/trivy-action action.yaml: https://github.com/aquasecurity/trivy-action/blob/master/action.yaml
- Trivy reporting docs: https://trivy.dev/latest/docs/configuration/reporting/

## Issues Found

1. **OpenVEX vulnerability identifier field** — The post used `"vulnerability": {"@id": "CVE-..."}` in every OpenVEX example. Per the OpenVEX specification, the canonical identifier field is `name`; `@id` is optional and used to reference an external resource (e.g., NVD URL). Changed all six instances (two JSON examples in the OpenVEX section, the best-practices example, the jq snippet in the bash script, and the Python `create_statement` builder) to use `"name"` instead of `"@id"`. Document-level `@id` and product `@id` were left untouched as they are correct per the spec.

2. **Trivy cannot generate VEX documents with `--format openvex` or `--format csaf`** — The "Generating VEX Documents from Trivy" section instructed readers to run `trivy image --format openvex` and `trivy image --format csaf`. These are not valid `--format` values for the Trivy CLI (`trivy image` supports: table, json, template, sarif, cyclonedx, spdx, spdx-json, github, cosign-vuln). Rewrote the section ("Inspecting Trivy Scan Results") to recommend exporting JSON and post-processing with vexctl, which is the documented workflow.

3. **`aquasecurity/trivy-action` has no `vex` input** — The GitHub Actions workflow used `vex: baseline-vex.json` under `with:`. That input does not exist in the action's `action.yaml` (verified against the master branch). Replaced the action-based step with an install step plus a direct `trivy image --vex ...` invocation so the example actually runs.

4. **`vexctl merge` has no `-o` flag** — The post used `vexctl merge vex1.json vex2.json -o merged-vex.json`. The merge command writes to stdout and does not implement an `-o`/`--output` flag (verified in `internal/cmd/merge.go`). Changed to shell redirection (`> merged-vex.json`) and updated the comment.

## Review Notes

- The Trivy VEX feature is marked experimental in the official docs; behavior could change between versions. The post does not explicitly call this out, but it is a minor caveat readers should be aware of.
- The CSAF VEX example is structurally reasonable for CSAF 2.0, but a real CSAF VEX document would typically also include a `product_status` with `known_affected`/`known_not_affected` cross-referenced to a more complete `product_tree` (full_product_name branches). The simplified example is acceptable for an introductory tutorial.
- The post recommends using OpenVEX status `fixed` without a justification — this matches the spec (justification is only required for `not_affected`).
- The OpenVEX `last_updated` field shown in best practices is not a documented field in the v0.2.0 spec; the spec uses `timestamp` (and a `last_updated` is sometimes used informally). This is a very minor stylistic addition and does not break the document, so it was left in place.
- The Python script uses `datetime.now(timezone.utc).isoformat()`, which yields an offset like `+00:00` rather than `Z`. The OpenVEX spec accepts RFC 3339 timestamps; both forms are valid, so no change needed.
