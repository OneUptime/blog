# Validation Summary: How to Secure Cilium Hubble Exporter Configuration

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Cilium
- Hubble exporter
- Kubernetes
- Helm
- kubectl
- Linux file permissions
- Fluent Bit DaemonSet hostPath mounts
- Python JSON validation snippets

## Sources Consulted
- Cilium documentation: Configuring Hubble exporter - https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium Helm Reference - https://docs.cilium.io/en/stable/helm-reference/
- Cilium Flow API protocol documentation - https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Kubernetes kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes DaemonSet documentation - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes hostPath volume documentation - https://kubernetes.io/docs/concepts/storage/volumes/#hostpath

## Issues Found
- The post described field masks as redaction. Cilium field masks control which fields are exported; they omit unlisted fields rather than rewriting values. Updated the description, section heading, opening sentence, and conclusion wording to use "omit" for field masks.
- The field mask example included `destination.port`, which is not a field in the Hubble Flow `destination` endpoint message. Removed it and kept the valid `l4.TCP.flags` field for TCP detail.
- The field mask example used `drop_reason`, which is deprecated in favor of `drop_reason_desc` in the Cilium Flow API. Replaced it with `drop_reason_desc`.
- The Hubble redaction Helm flags used incorrect flattened names: `hubble.redact.httpURLQuery`, `hubble.redact.httpUserInfo`, and `hubble.redact.kafkaApiKey`. Updated the HTTP flags to the documented nested keys `hubble.redact.http.urlQuery` and `hubble.redact.http.userInfo`. Removed the Kafka flag because `hubble.redact.kafka.apiKey` is documented as deprecated in current Cilium Helm reference.
- The redaction verification section followed a field mask example that omitted `l7`, so its L7 inspection would not show redacted HTTP data unless the mask was changed. Added a note to include `l7` in the field mask when exporting L7 fields.
- The diagram implied a specific exporter file mode of `0640`, but the Cilium Hubble exporter documentation does not document that as a guaranteed mode or configurable Helm value. Updated the diagram label to the more accurate "Restrictive File Permissions."

## Review Notes
The Cilium exporter docs confirm static exporter support for file rotation, filters, and field masks, and the Helm reference confirms the `hubble.export.static.*` values used by the examples. The file permission section remains operational guidance rather than a complete enforceable Cilium Helm configuration; future revisions could add node-level directory ownership and log collector group management examples for a specific deployment model.
