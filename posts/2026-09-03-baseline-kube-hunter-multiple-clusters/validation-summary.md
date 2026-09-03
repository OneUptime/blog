# Validation Summary: How to Baseline kube-hunter Results Across Multiple Clusters Without Duplicating Noise

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- kube-hunter
- Kubernetes
- JSON report normalization
- Security finding deduplication and baselining
- SHA-256 contextual fingerprints

## Sources Consulted
- [kube-hunter scanning perspectives and scan modes](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter base report fields and report structure](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [kube-hunter JSON reporter](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/json.py)
- [kube-hunter report collector](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/collector.py)
- [kube-hunter vulnerability types and severity mapping](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/types.py)
- [Kubernetes object names and UIDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)

## Issues Found
- The report-field description used generic names for two fields and omitted `category`. Updated it to match the current JSON keys exactly: `vulnerability`, `avd_reference`, and `category`.
- The fingerprint example did not define an unambiguous serialization and could permit delimiter-based tuple collisions if implemented literally. Updated it to hash a canonical encoding and identified canonical JSON arrays and length-prefixed fields as safe approaches.
- The text implied that both VIDs and Aqua reference URLs were stable identifiers. Clarified that the VID is the identifier and `avd_reference` is a documentation link derived for that VID.

## Review Notes
The post intentionally describes an organization-owned normalization and state model rather than a kube-hunter-native baseline feature. The recommended two-absence resolution rule is an operational policy, not an upstream kube-hunter requirement. Pinning a kube-hunter image digest or source commit remains important because the linked `main` branch and its report schema can change.
