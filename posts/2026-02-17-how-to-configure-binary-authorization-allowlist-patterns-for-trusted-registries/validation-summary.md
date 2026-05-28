# Validation Summary: How to Configure Binary Authorization Allowlist Patterns for Trusted Registries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Binary Authorization
- Google Kubernetes Engine (GKE)
- Container Registry
- Artifact Registry
- Google Cloud CLI
- Cloud Audit Logs
- kubectl

## Sources Consulted
- Google Cloud Binary Authorization policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization AdmissionWhitelistPattern REST reference: https://docs.cloud.google.com/binary-authorization/docs/reference/rest/Shared.Types/AdmissionWhitelistPattern
- Google Cloud CLI reference for `gcloud container binauthz policy export`: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz/policy/export
- Google Cloud CLI reference for `gcloud container binauthz policy import`: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz/policy/import
- Google Cloud Binary Authorization audit logs for GKE: https://cloud.google.com/binary-authorization/docs/viewing-audit-logs

## Issues Found
- The post described GKE system images as default allowlist patterns. Current Google documentation recommends using `globalPolicyEvaluationMode: ENABLE`, which is the default, so Google-managed system images are handled by a Google-managed system policy. Updated the section to reflect the current recommendation and kept manual patterns only for the case where system policy evaluation is disabled.
- Full policy YAML examples omitted the required `name: projects/<PROJECT_ID>/policy` field. Added it to importable policy examples.
- Wildcard syntax was described too broadly. Google documents `*` and `**` as trailing wildcards only, with `*` not matching `/` and `**` matching subdirectories. Updated the explanation and added the trailing-only caveat.
- The post recommended allowlisting organization registries where images go through CI/CD, which could imply bypassing attestations for images that should be attested. Updated the wording and examples to refer to registries intentionally trusted without attestation.
- The audit log query used `protoPayload.serviceName="binaryauthorization.googleapis.com"` and output fields that are not the documented GKE admission audit log pattern. Replaced it with the documented GKE pod create/update Cloud Audit Logs query and clarified that there is no dedicated "allowed by allowlist" field for GKE admission.
- The conclusion still advised starting with GKE system patterns. Updated it to recommend leaving Google-managed system policy evaluation enabled.

## Review Notes
The `gcloud` and `kubectl` binaries were not installed in the local environment, so CLI syntax was verified against official Google Cloud and Kubernetes-style command documentation rather than local `--help` output.
