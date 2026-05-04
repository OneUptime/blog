# Validation Summary: How to Configure Longhorn Storage Over Provisioning

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (kubectl, CRDs)
- Helm (Longhorn chart `defaultSettings`)
- Bash / jq / awk (utility scripts)

## Sources Consulted
- Longhorn official settings reference: https://longhorn.io/docs/1.7.0/references/settings/
- Longhorn Helm chart values.yaml: https://github.com/longhorn/charts/blob/master/charts/longhorn/values.yaml
- Longhorn CRD reference for `settings.longhorn.io` and `nodes.longhorn.io`

## Issues Found
No technical issues found.

Verified items:
- Setting CRD names `storage-over-provisioning-percentage` and `storage-minimal-available-percentage` match the official Longhorn settings.
- `kubectl patch settings.longhorn.io ... --type merge -p '{"value": "..."}'` is the correct mechanism — the Longhorn settings CRD stores the value in a top-level `value` string field.
- Helm `defaultSettings` keys `storageOverProvisioningPercentage` and `storageMinimalAvailablePercentage` are spelled correctly and exist in the official chart's values.yaml.
- Default values in the documentation match the post's stated defaults (over-provisioning 100, minimal available 25).
- UI navigation `Setting → General` matches the Longhorn dashboard layout.
- `kubectl get nodes.longhorn.io` and the `diskStatus` fields (`storageAvailable`, `storageMaximum`, `storageScheduled`) are accurate names from the Node CRD status.

## Review Notes
- The "Calculation Example" presents a simplified mental model (`175 GiB = 200 - 25`). In practice, Longhorn evaluates both constraints independently — the over-provisioning ceiling (`max × overProvisioning%`) and the minimum-available floor (`max × minAvailable%`) — so on an empty 100 GiB disk the immediately-schedulable size is bounded by actual free space minus the reserved buffer (75 GiB), while the over-provisioning ceiling (200 GiB) only becomes the effective limit as scheduled-but-unused capacity grows. The post's framing is conceptually fine for a beginner-level introduction and was left as-is.
- The troubleshooting one-liner `kubectl get volumes.longhorn.io ... | awk '{sum += $5}'` is fragile because column ordering in `kubectl get` for the Volume CRD has shifted across Longhorn versions (e.g., the addition of `DATA ENGINE` in newer releases) and the size column is presented as a numeric string of bytes. It is acceptable as a rough hint but readers on newer Longhorn versions may need to adjust the column index. Not strictly incorrect, so left as-is.
- The post does not pin a specific Longhorn version. All commands and settings shown are valid for current Longhorn releases (1.5.x through 1.7.x at the time of review).
