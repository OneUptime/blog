# Validation Summary: How to Preserve the Labels You Need with `sum by()` and `sum without()`

## Status
validated

## Post Type
Technical guide with PromQL examples and a promtool unit-test fixture.

## Technologies Covered
- Prometheus monitoring and metric labels
- PromQL aggregation, selectors, counter rates, and vector matching
- promtool expression testing and YAML configuration
- Remote write label processing

## Sources Consulted
- [Prometheus aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)
- [Prometheus vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching)
- [Prometheus instant vector selectors](https://prometheus.io/docs/prometheus/latest/querying/basics/#instant-vector-selectors)
- [Prometheus rate function](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [promtool command reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/#promtool-test-rules)
- [Prometheus remote write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Author profile](https://github.com/nawazdhandala), checked through the post's GitHub link.

## Issues Found
No technical issues found.

## Review Notes
- Verified aggregation syntax and manually checked the example results: service total 15, west total 10, and east total 5. The two regional expressions produce identical labels and values for the supplied input.
- Confirmed that adding a pool dimension changes grouping with `without (instance)` while `by (service, region)` continues to combine pools. Ungrouped `sum` combines all selected dimensions. The table's ellipses are expression placeholders.
- Confirmed that grouping does not invent missing labels and that an empty-value matcher also selects series lacking that label.
- Verified that counter rates should be calculated before aggregation to preserve reset detection.
- Verified the utilization expression's grouping and the stated assumptions about matching pool coverage and positive capacity. Default vector matching can omit unmatched label sets; `group_left` enables an intentional many-to-one match with higher cardinality on the left.
- Remote write relabeling occurs before sending samples and after external labels are applied, supporting the warning that remotely added labels may be unavailable in local queries.
- Checked the YAML fields, single-sample input values, evaluation at `0m`, expected label sets, and expected values against the unit-testing reference. Direct expression tests do not require a separate recording-rule file. The command `promtool test rules labels.test.yml` matches the CLI reference and assumes promtool is on PATH.
- Runtime limitation: promtool is not installed in the review environment, so the fixture was reviewed against documentation and its arithmetic checked manually; it was not executed.
- The linked documentation and author profile resolve to the intended resources. No explicit version claims or deprecated features required correction. README.md was left unchanged.
