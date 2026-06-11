# Validation Summary: How to Create Model Testing Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- pytest
- NumPy
- pandas
- scikit-learn metrics and calibration APIs
- GitHub Actions
- Codecov GitHub Action
- AWS CLI
- Kubernetes CLI
- Requests
- Python tracemalloc

## Sources Consulted
- scikit-learn calibration_curve API documentation: https://scikit-learn.org/stable/modules/generated/sklearn.calibration.calibration_curve.html
- scikit-learn accuracy_score API documentation: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.accuracy_score.html
- scikit-learn data representation guidance for estimator inputs: https://scikit-learn.org/stable/getting_started.html
- pytest documentation for custom command-line options and fixtures: https://docs.pytest.org/en/stable/example/simple.html
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Actions job dependency documentation: https://docs.github.com/actions/using-jobs/using-jobs-in-a-workflow
- GitHub Actions upload-artifact action documentation: https://github.com/actions/upload-artifact
- Python tracemalloc documentation: https://docs.python.org/3/library/tracemalloc.html

## Issues Found
- The model-quality snippet imported `calibration_curve` from `sklearn.metrics`, but the official scikit-learn API exposes it from `sklearn.calibration`. Removed the incorrect import and kept `from sklearn.calibration import calibration_curve`.
- Several model-quality and robustness tests passed the full `test_data` DataFrame, including the `target` column, to `model.predict` and `model.predict_proba`. Updated those tests to use the `test_features` fixture, matching scikit-learn's expected feature matrix input.
- The slice-test fixture requested `trained_model`, but the provided `conftest.py` defines the fixture as `model`. Updated the slice-test fixture to use `model`.
- The integration-test snippet used `np.float64` and `np.int64` without importing NumPy. Added `import numpy as np`.
- The HTTP latency test computed P95 with a hard-coded sorted-list index. Replaced it with `np.percentile(latencies, 95)` for correctness and consistency with the later performance tests.
- The performance tests wrapped a one-row pandas DataFrame in a list before calling `model.predict`, producing an inappropriate nested input shape for typical scikit-learn-style estimators. Updated those calls to pass `sample_input` directly.
- The tracemalloc memory-leak example compared peak memory to current memory after the loop, which can produce false failures because current traced memory may be very small after temporary allocations are freed. Updated it to compare before and after snapshots, and changed batch memory scaling to record peak traced memory during prediction.
- The GitHub Actions workflow downloaded a `trained-model` artifact without creating it in an earlier job. Added model build and upload steps before the downstream download step.
- The downstream GitHub Actions jobs ran on fresh runners but did not set up Python or install dependencies. Added setup and install steps to the quality, slice, performance, and integration jobs.
- The slice and performance jobs depended on model and test-data fixtures but did not retrieve the model artifact or test data. Added artifact and test-data download steps.

## Review Notes
The snippets are still illustrative and depend on project-specific modules such as `preprocessing`, `features`, `prediction_service`, `data_pipeline`, `model_server`, and custom scripts. The Python snippets were syntax-checked with `ast.parse`, and the workflow YAML was parsed successfully. Runtime execution was not possible in this repo because the referenced project-specific modules and scikit-learn test dependencies are not installed here.
