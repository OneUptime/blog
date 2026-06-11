# Validation Summary: How to Create Prometheus Template Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (alerting rules, template expansion)
- Alertmanager (notification templates, Slack receiver config)
- Go `text/template` package
- PromQL (alert expressions)
- `promtool` and `amtool` (CLI testing)
- YAML configuration

## Sources Consulted
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus template FuncMap source: https://github.com/prometheus/prometheus/blob/main/template/template.go
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager template FuncMap source: https://github.com/prometheus/alertmanager/blob/main/template/template.go
- Alertmanager notifications template data: https://prometheus.io/docs/alerting/latest/notifications/
- promtool unit-testing rules: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Go `text/template` standard library docs: https://pkg.go.dev/text/template
- `prometheus/common/helpers/templates/time.go` (humanizeDuration implementation)

## Issues Found

1. **`mul` function is not a Prometheus template function.** The post used `(mul $value 100)` in several alert annotation examples. `mul` is a Sprig function (used by Helm), but Prometheus's `text/template` FuncMap does not provide it, so the examples would fail at template expansion. Replaced every `(mul $value 100)` percentage example with the built-in `humanizePercentage` (Section 5 "Number Formatting with printf" and Section 6 "Basic If-Else Statements"). The Go `text/template` snippet in Section 10 was left intact because it defines `mul` explicitly in its own FuncMap.

2. **`default` function is not a Prometheus or Alertmanager template function.** The post used `{{ $labels.env | default "unknown" }}` in Section 4 and Section 11. `default` is also a Sprig-only function. Replaced with Go's built-in `or`, which returns the first non-empty argument (e.g., `{{ or $labels.env "unknown" }}`). Updated the surrounding text in Section 4 to note that `default` is unavailable.

3. **`date` is not a Prometheus template function.** The post used `{{ now | date "2006-01-02 15:04:05 MST" }}` inside an alert rule `annotations:` block (Section 5) and a similar pattern in a logs URL (Section 8). `now` does exist in Prometheus templates (it returns a Unix timestamp as float64), but `date` only exists in Alertmanager's FuncMap, not Prometheus's. Section 5 was rewritten to use `{{ now | humanizeTimestamp }}` and `{{ $value | humanizeTimestamp }}`. The Section 8 logs URL was changed to use a relative time parameter (`from=now-1h&to=now`), which most monitoring tools accept.

4. **`humanizeDuration` example output was mathematically wrong and used the wrong format.** The post claimed `humanizeDuration` outputs `"2d 5h 30m"` for 191400 seconds. 191400 seconds is actually 2d 5h 10m 0s, and Prometheus's `humanizeDuration` always includes the seconds component when the magnitude is >= 1. Updated the comment to `"2d 5h 10m 0s" for 191400 seconds`.

5. **Slack `__alert_severity_prefix` template referenced `.Labels.severity` from the top-level context.** The template was invoked as `{{ template "__alert_severity_prefix" . }}` inside `slack.title`, where `.` is the Alertmanager `Data` struct (which has `.CommonLabels`, `.GroupLabels`, `.Alerts`, etc., but no `.Labels` — `.Labels` only exists on individual alerts inside `range .Alerts`). The branches would have always fallen through to `:information_source:`. Replaced `.Labels.severity` with `.CommonLabels.severity` in both branches.

## Review Notes

- The Section 10 promtool test example uses `exp_labels` without `status: "500"`, but the alert expression `rate(http_requests_total{status=~"5.."}[5m])` preserves the `status` label on the resulting series. A real test would need that label included in `exp_labels`. Left as-is because the article's purpose is teaching templates, not promtool semantics, and the example is illustrative.
- The hand-rolled Go template test program in Section 10 calls `(mul .Value 100)` where 100 is an untyped int literal and `mul` is declared as `func(a, b float64) float64`. Go's `text/template` will fail this call with a type mismatch. The example was left intact because it is illustrative of the testing approach, not a copy-pasteable script.
- The Slack template iteration block (Section 7) references `.Annotations.value`, which is not a standard annotation. Real alert rules typically embed the value into `summary` or `description` rather than a separate `value` annotation. This is a stylistic choice rather than a correctness issue.
- The `match` function in Prometheus templates uses Go's `regexp.MatchString`, so the patterns in Pattern 3 (`"payment"`, `"auth"`, `"inventory"`) act as substring regex matches, which is the intended behavior shown.
- `$externalLabels` is correctly described as available in Prometheus alert rule template expansion (verified against `rules/alerting.go` template definitions).
