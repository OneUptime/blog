# Validation Summary: How to Build Showback Reports

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- AWS Cost Explorer API (via boto3)
- Kubernetes pod labels
- Prometheus / cAdvisor metrics (`container_memory_usage_bytes`)
- Terraform (HCL for AWS resources)
- Python 3 (dataclasses, Decimal, typing)
- Slack Block Kit (incoming webhooks)
- Mermaid diagrams (flowchart, xychart-beta)

## Sources Consulted
- AWS Cost Explorer `GetCostAndUsage` API and boto3 reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ce/client/get_cost_and_usage.html
- AWS Cost Explorer GroupBy dimensions and TAG type: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GroupDefinition.html
- Prometheus / cAdvisor metric names (`container_memory_usage_bytes`): https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Slack Block Kit `header` and `section` block specs: https://api.slack.com/reference/block-kit/blocks
- Terraform AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Python `dataclasses` and `decimal` standard library docs: https://docs.python.org/3/library/dataclasses.html, https://docs.python.org/3/library/decimal.html
- Mermaid `xychart-beta` syntax: https://mermaid.js.org/syntax/xyChart.html

## Issues Found

1. **Anomaly detection example produced impossible output.** In Step 7, the `detect_cost_anomaly` example called the function with `current=18500`, `previous_values=[15000, 16200, 17500]`, and `threshold_pct=15.0`. The comment claimed the result would be `{"anomaly": True, "change_percent": 14.1, ...}`. Verified by computation:
   - Average of previous values = 16233.33
   - Actual change_percent = (18500 - 16233.33) / 16233.33 * 100 ≈ 13.96 (not 14.1)
   - With threshold_pct=15.0, `abs(13.96) > 15.0` is False, so anomaly would be False — contradicting the comment.

   **Fix:** Lowered `threshold_pct` to `10.0` so the example correctly demonstrates anomaly detection firing, and corrected the comment's `change_percent` to `13.96` to match the function's actual output.

## Review Notes

- The `fetch_k8s_costs` snippet uses `requests` without importing it in that block. This is acceptable for an illustrative example (the boto3 snippet earlier already established Python context), but a reader copy-pasting the snippet in isolation would need to add `import requests`.
- The Prometheus query references `label_team`, which only exists if pod team labels are joined onto `container_memory_usage_bytes` (e.g., via `kube_pod_labels` and `group_left`) or surfaced through cAdvisor relabeling. The post calls all code "simplified examples," so this is acceptable framing, but in a real cluster the user would need a join or recording rule.
- The `generate_showback_report` function calls helpers (`aggregate_by_dimension`, `get_top_n`, `calculate_untagged_percentage`) that are not defined in the post. This is consistent with the post's illustrative style and is signaled by "Sample Report Structure," so I left it as-is.
- AWS Cost Explorer requires tag activation as cost allocation tags before they appear in `GroupBy` results. This is operational context, not a code error, and is reasonably out of scope for the post.
- All numeric tallies in the JSON output example (`by_team`, `by_service`, `by_environment` totals all equal $45,230.50; `untagged_percentage` of 13.3 matches 6000/45230.50) verified correct. Shared cost allocation example math (platform=$5000, payments=$3000, search=$2000) verified correct.
