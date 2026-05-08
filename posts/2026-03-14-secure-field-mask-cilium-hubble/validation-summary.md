# Validation Summary: How to Secure Field Mask in Cilium Hubble

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble exporter
- Hubble field masks
- Kubernetes
- Helm
- Kyverno
- Python JSON validation scripts

## Sources Consulted
- Cilium Hubble exporter configuration documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium flow protobuf API reference: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Cilium observer protobuf API reference: https://docs.cilium.io/en/stable/_api/v1/observer/README/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno resource matching documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/

## Issues Found
- The field mask examples used `destination.port`, which is not a field in the Cilium flow proto. Replaced it with `l4`, matching the documented Hubble exporter examples and flow proto structure for L4 protocol and port details.
- The examples used `drop_reason`, which is deprecated in the flow proto. Replaced it with `drop_reason_desc`, the documented replacement field for dropped-flow reasons.
- The PCI-DSS example used `l4.TCP`, which is not the documented field mask path used by Cilium's exporter examples. Replaced it with `l4`.
- The post described L7 metadata as containing request bodies. Cilium's flow proto documents HTTP URL, method, protocol, headers, DNS, and Kafka metadata, but not HTTP request bodies. Updated the wording accordingly.
- The post implied `node_name` could be fully excluded from the exported JSON by omitting it from the flow field mask. Cilium exporter records also include top-level wrapper metadata such as `node_name` and `time`, so the text now clarifies that the mask excludes the flow-level `node_name`.
- The Kyverno policy checked the wrong ConfigMap key, `hubble-export-field-mask`. Corrected it to Cilium's documented `hubble-export-fieldmask` key.
- The Kyverno policy used older top-level `validationFailureAction` style. Updated the example to use rule-level `validate.failureAction: Enforce` and `match.any`, matching current Kyverno documentation.
- The IP verification script used an IPv4 regex over the full JSON line, which could miss IPv6 and create false positives from unrelated string fields. Updated it to check for the Cilium flow `IP` field directly.
- The GDPR example stated that pod names are not personal data. Changed the inline comment to note that pod names should be omitted if they encode personal data.
- The troubleshooting advice suggested creating a separate exporter configuration without naming the mechanism. Updated it to distinguish temporarily broadening the static exporter from using a dynamic exporter configuration for a separate temporary flow log.

## Review Notes
Cilium field masks apply to Hubble flow fields used by exporter configuration. They are useful for data minimization in exported flow logs, but they do not replace access controls for Hubble Relay, Hubble CLI/API access, metrics, or downstream log storage. Exporter records may still include wrapper metadata outside the masked flow object.
