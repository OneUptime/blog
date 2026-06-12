# Validation Summary: How to Monitor Models with MLflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow Tracking and Model Registry
- MLflow PyFunc model loading
- Python
- pandas
- NumPy
- SciPy statistical tests
- scikit-learn metrics
- Model monitoring, data drift, prediction drift, and performance monitoring

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- MLflow Python API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.html
- MLflow PyFunc documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.pyfunc.html
- MLflow Model Registry workflow documentation: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- SciPy `ks_2samp` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html
- SciPy `chisquare` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mstats.chisquare.html
- scikit-learn `roc_auc_score` documentation: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.roc_auc_score.html
- pandas `DataFrame.select_dtypes` documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.select_dtypes.html
- pandas `read_parquet` documentation: https://pandas.pydata.org/docs/reference/api/pandas.read_parquet.html

## Issues Found
- The examples used `datetime.utcnow()`, which is deprecated as of Python 3.12. Replaced it with `datetime.now(timezone.utc)` and updated the imports to use timezone-aware UTC datetimes.
- The MLflow model loading example used the deprecated model stage URI `models:/churn-predictor/Production`. Replaced it with the current alias-style URI `models:/churn-predictor@champion`, matching MLflow's recommendation to migrate from stages to aliases.
- The prediction logging wrapper stored the last path segment as `model_version`, which is not necessarily a concrete model version when using model stages or aliases. Renamed the recorded field to `model_reference` and store the full model URI.
- `drift_ratio` divided by `total_features` without guarding against an empty result set. Added a zero-feature guard to avoid division by zero.
- The data-quality `outlier_ratio` divided outlier cell counts by row count, so the value could exceed 1 when multiple numeric columns had outliers. Changed the denominator to the number of numeric cells and added guards for empty data.

## Review Notes
The examples are illustrative and assume production storage, batch jobs, and alert delivery are implemented elsewhere. The statistical thresholds shown, including p-value and PSI thresholds, are reasonable examples but should be calibrated for each model, sample size, and business use case.
