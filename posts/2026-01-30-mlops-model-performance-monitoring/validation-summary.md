# Validation Summary: How to Create Model Performance Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- pandas
- NumPy
- scikit-learn
- Evidently
- whylogs / WhyLabs
- SciPy statistical tests
- Slack incoming webhooks
- PagerDuty Events API v2
- OneUptime incident API
- Mermaid diagrams

## Sources Consulted
- Evidently: Report API, https://docs.evidentlyai.com/docs/library/report
- Evidently: Data Definition, https://docs.evidentlyai.com/docs/library/data_definition
- Evidently: Data Drift Preset, https://docs.evidentlyai.com/metrics/preset_data_drift
- Evidently: Classification Preset, https://docs.evidentlyai.com/metrics/preset_classification
- Evidently: Migration Guide, https://docs.evidentlyai.com/faq/migration
- scikit-learn: `make_classification`, https://scikit-learn.org/stable/modules/generated/sklearn.datasets.make_classification.html
- scikit-learn: `train_test_split`, https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html
- scikit-learn: `RandomForestClassifier`, https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
- scikit-learn: model evaluation metrics, https://scikit-learn.org/stable/modules/model_evaluation.html
- whylogs documentation, https://whylogs.readthedocs.io/
- whylogs Data Validation with Metric Constraints, https://whylogs.readthedocs.io/en/stable/examples/advanced/Metric_Constraints.html
- whylogs WhyLabs writer API, https://whylogs.readthedocs.io/en/stable/api/whylogs/api/writer/whylabs/index.html
- WhyLabs profiles overview, https://docs.whylabs.ai/docs/overview-profiles/
- WhyLabs whylogs overview, https://docs.whylabs.ai/docs/whylogs-overview/
- SciPy `ks_2samp`, https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html
- SciPy `entropy`, https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html
- Slack incoming webhooks, https://api.slack.com/messaging/webhooks
- PagerDuty Events API v2, https://developer.pagerduty.com/docs/events-api-v2/overview/
- OneUptime Incident API reference, https://oneuptime.com/reference/en/incident

## Issues Found
- The Evidently examples used the pre-0.7 legacy API (`evidently.report`, `evidently.metric_preset`, `ColumnMapping`, `DatasetDriftMetric`, `DataDriftTable`, and classification metric classes that no longer exist in the current public import paths). I updated the examples to the current Evidently 0.7 API using `Dataset`, `DataDefinition`, `BinaryClassification`, `Report`, `evidently.presets`, and current metrics such as `DriftedColumnsCount`, `Accuracy`, `Precision`, `Recall`, and `F1Score`.
- The Evidently drift example compared a current dataset containing a `prediction` column against reference data without that column, which fails in Evidently when schemas are inconsistent. I changed drift detection to compare only the monitored feature columns and use a feature-only `DataDefinition`.
- The comprehensive Evidently report returned the `Report` object even though current Evidently returns the computed snapshot from `report.run()`. I updated the method to return the snapshot and verified `save_html()` on that object.
- The whylogs install command used `whylogs[whylabs]`, but whylogs 1.6.4 does not provide that extra. I changed the command to `pip install whylogs`; the WhyLabs writer is available from the installed package.
- The whylogs validation example treated `constraints.validate()` as a rich validation object. In whylogs 1.6.4 it returns a boolean. I updated the code to call `validate()` for pass/fail and `generate_constraints_report()` for per-constraint details.
- The custom drift detector's PSI implementation did not include current values outside the reference histogram range. I updated the edge bins to `-np.inf` and `np.inf` so out-of-range current values are counted.
- The Jensen-Shannon divergence comment said the range was 0 to 1. With SciPy's natural-log `entropy`, the divergence range is 0 to `ln(2)`, so I corrected the explanation.
- The custom drift and alerting snippets used `pd` or `datetime` without importing them in those standalone blocks. I added the missing imports.
- The OneUptime alert example used a non-documented `/incidents` endpoint with a bearer authorization header. I updated it to the documented `POST /api/incident` endpoint, `ApiKey` header, and `data` request wrapper, with configurable project, severity, and initial state IDs.

## Review Notes
- All Python code blocks were checked with Python's AST parser and are syntactically valid.
- The updated Evidently walkthrough was executed against Evidently 0.7.21, pandas, scikit-learn, and SciPy in a temporary dependency target and completed successfully.
- The updated whylogs profiling and constraints example was executed against whylogs 1.6.4 and completed successfully.
- The custom drift detector and alerting snippet were import/runtime checked for the exercised paths. External alert delivery was not performed because it requires real Slack, PagerDuty, and OneUptime credentials.
