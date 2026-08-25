# Replace Deprecated `invert_match` with Tail-Sampling `drop` and `not`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Configuration, Migration

Description: Replace ambiguous inverted attribute decisions with explicit positive complements and hard drop vetoes while preserving missing-attribute and multi-policy behavior.

---

The string, numeric, and boolean attribute policies still expose `invert_match` in current Collector Contrib configuration, but inversion-specific sampling decisions are deprecated. The tail-sampling documentation recommends expressing intent with `not` when selecting the complement of a match and `drop` when a match must veto every keep rule.

Those are different migrations. Choosing the wrong wrapper can turn an exclusion into a soft preference.

## Use `not` for a Positive Complement

An older rule might try to sample everything except health routes:

```yaml
- name: everything-except-health
  type: string_attribute
  string_attribute:
    key: http.route
    values: [/live, /ready]
    invert_match: true
```

Express the positive complement explicitly:

```yaml
- name: everything-except-health
  type: not
  not:
    not_sub_policy:
      name: is-health-route
      type: string_attribute
      string_attribute:
        key: http.route
        values: [/live, /ready]
```

The wrapped string policy returns `Sampled` if any resource or span attribute has a listed value. `not` turns that into `NotSampled`; when the wrapped policy does not match, `not` returns `Sampled`.

That outer `NotSampled` is not a global veto. A separate top-level error, latency, or probabilistic policy may still sample a health trace. Use this form when that override is intentional.

## Use `drop` for a Hard Exclusion

If a health-route match must veto every keep policy in the same decision, use a positive matcher inside `drop`:

```yaml
processors:
  tail_sampling:
    policies:
      - name: drop-health
        type: drop
        drop:
          drop_sub_policy:
            - name: health-route
              type: string_attribute
              string_attribute:
                key: http.route
                values: [/live, /ready]
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

When every `drop_sub_policy` matches, the wrapper returns `Dropped`. A dropped outcome takes precedence over sampled outcomes. Current source also orders top-level drop policies before ordinary policies during loading.

The subpolicy list has AND behavior, not OR behavior. To drop either of several route values, put them in one string policy's `values`. To require both a route and an environment, use two subpolicies.

## Preserve Error Exceptions Deliberately

Sometimes the actual requirement is “drop routine health traces, but retain a health trace if any span has `ERROR` status.” Keep the separate top-level `errors` policy, and encode the absence of an error as another condition of the drop:

```yaml
- name: drop-successful-health
  type: drop
  drop:
    drop_sub_policy:
      - name: health-route
        type: string_attribute
        string_attribute:
          key: http.route
          values: [/live, /ready]
      - name: no-error-anywhere
        type: not
        not:
          not_sub_policy:
            name: has-error
            type: status_code
            status_code:
              status_codes: [ERROR]
```

Use `sampling_strategy: trace-complete` and a sufficient `decision_wait` for this and any other trace-wide absence test. A span with `ERROR` status arriving after the decision cannot reverse an already dropped trace.

## Audit Missing-Attribute Semantics

For an ordinary string policy, a missing key does not match. Wrapping it in `not` therefore selects traces where `http.route` is missing as well as traces with other route values. Legacy `invert_match` also had important missing-key behavior, but exact historical outcomes varied with policy composition and feature-gate era.

Build a truth table for:

- excluded value present;
- different value present;
- key missing everywhere;
- conflicting values on different spans or resources; and
- another top-level policy matching the same trace.

If “key must exist and not equal X” is required, combine an explicit presence condition and the `not` policy in an `and` wrapper, or use an OTTL condition with a tested nil check. Do not assume logical negation implies attribute presence.

## Migrate with Decision Metrics

Run the old and new configurations against a recorded, non-sensitive trace-ID corpus in separate staging Collectors. Compare final exported trace IDs, not only per-policy votes.

The `otelcol_processor_tail_sampling_count_traces_sampled` metric has `policy`, `sampled`, and `decision` attributes in current generated telemetry. A policy voting not sampled does not prove the trace was dropped; use `otelcol_processor_tail_sampling_global_count_traces_sampled` for aggregate processor decisions and exporter output for final per-trace outcomes. Deprecated inversion decisions and feature gates have evolved across releases, so test the exact source and version being deployed.

Remove `invert_match` only after the missing-key and multi-policy cases match the intended-not necessarily the historical-behavior.

## Official Documentation

- [Tail-sampling policy decision flow and invert migration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#policy-decision-flow)
- [`not`, `drop`, and attribute policy configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [`not` policy implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/not.go)
- [`drop` policy implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/drop.go)
- [String attribute matching and missing-key behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/string_tag_filter.go)

## Conclusion

Replace `invert_match` with `not` when the complement is another positive sampling choice. Use `drop` when matching data must veto every keep rule. Explicitly test missing attributes, multiple span values, other top-level policies, and late errors-the migration is about preserving intent, not merely changing YAML syntax.
