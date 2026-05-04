# Validation Summary: How to Configure Longhorn Support Bundle Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (kubectl, CRDs, Settings, port-forward)
- Longhorn SupportBundle CRD (`supportbundles.longhorn.io`, `v1beta2`)
- Longhorn settings: `support-bundle-manager-image`, `support-bundle-failed-history-limit`, `support-bundle-node-collection-timeout`
- Bash scripting (diagnostic collection, tar/curl/grep)

## Sources Consulted
- Longhorn manager CRDs (authoritative SupportBundle CRD schema): https://raw.githubusercontent.com/longhorn/longhorn-manager/master/k8s/crds.yaml
- Longhorn manager setting definitions: https://raw.githubusercontent.com/longhorn/longhorn-manager/master/types/setting.go
- Longhorn docs — Support Bundle: https://longhorn.io/docs/1.11.0/troubleshoot/support-bundle/
- Longhorn KB — Create Support Bundle with cURL: https://longhorn.io/kb/troubleshooting-create-support-bundle-with-curl/
- Longhorn enhancement: support-bundle-enhancement.md (https://github.com/longhorn/longhorn/blob/master/enhancements/20221109-support-bundle-enhancement.md)

## Issues Found
1. **Setting name was wrong.** The post used `support-bundle-failed-limit`, but the actual Longhorn setting is `support-bundle-failed-history-limit`. Fixed the `kubectl patch` command to use the correct setting name.
2. **Misdescribed semantics of the failed-history setting.** The post claimed the value was "how long failed bundles are kept before auto-deletion (hours)". Per `types/setting.go`, this setting specifies *how many* failed support bundles can exist in the cluster (a count, not a duration), with `0` meaning purge all failed bundles. Updated the comment and example value accordingly.
3. **Wrong unit in the node-collection-timeout comment.** The post commented `# 2 minutes per node` next to `"120"`, but per the official setting definition the timeout is in **minutes** (default 30), so `120` would be 120 minutes total, not "2 minutes per node". Updated the example value and the comment.
4. **Misleading SupportBundle YAML comments.** The YAML had `# Set to false to keep the bundle after download` (no such field in the spec) and `nodeID: ""   # Empty means collect from all nodes` (incorrect — per the v1beta2 CRD, `nodeID` is "the preferred responsible controller node ID", not a filter for which nodes to collect from). Replaced these with accurate comments and added the optional `issueURL` field that the CRD actually supports.
5. **Download URL format was incorrect.** The post used `/v1/supportbundles/<name>/bundleName.zip`. The official cURL KB documents the endpoint as `/v1/supportbundles/${ID}/${SUPPORT_BUNDLE_NAME}/download`. Updated the curl example to use the correct path with placeholders.

## Review Notes
- The UI navigation ("Setting → Support Bundle") matches what older Longhorn versions and several community guides describe. The current official docs simply say "click Generate Support Bundle at the bottom of the Longhorn UI". The post's path is plausible for many shipped versions, so it was left in place; readers on newer UIs may need to look at the bottom of the navigation panel.
- The CRD (`longhorn.io/v1beta2`, `kind: SupportBundle`) and namespace (`longhorn-system`) are correct.
- The settings `support-bundle-manager-image` and `support-bundle-node-collection-timeout` are correct setting names; only `support-bundle-failed-history-limit` needed fixing.
- The diagnostic collection script and analysis section use generic kubectl/bash and are technically correct.
- Specific image tag `longhornio/support-bundle-kit:v0.0.37` was kept as an example; users should pin the version compatible with their installed Longhorn release per the Longhorn airgap/installation guidance.
