# Validation Summary: How to Build Model Interpretability

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Python
- scikit-learn
- SHAP / TreeExplainer
- LIME / LimeTabularExplainer
- pandas
- NumPy
- Matplotlib
- MLOps explanation logging and drift monitoring

## Sources Consulted
- scikit-learn `permutation_importance` documentation: https://scikit-learn.org/stable/modules/generated/sklearn.inspection.permutation_importance.html
- scikit-learn impurity-based feature importance example and warnings: https://scikit-learn.org/stable/auto_examples/inspection/plot_permutation_importance.html
- scikit-learn `RandomForestClassifier` documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
- scikit-learn `GradientBoostingClassifier` documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.GradientBoostingClassifier.html
- SHAP `TreeExplainer` documentation: https://shap.readthedocs.io/en/latest/generated/shap.TreeExplainer.html
- SHAP release notes for the 0.45+ multi-output return-shape change: https://shap.readthedocs.io/en/latest/release_notes.html
- LIME tabular explainer API documentation: https://lime-ml.readthedocs.io/en/latest/lime.html
- LIME project repository: https://github.com/marcotcr/lime
- Interpretable Machine Learning book: https://christophm.github.io/interpretable-ml-book/
- UK ICO guidance on automated decision-making safeguards: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/rights-related-to-automated-decision-making-including-profiling/

## Issues Found
- The SHAP examples only handled the older list return format for binary/multi-output models. Current SHAP returns multi-output values as an `np.ndarray` with the output axis last, so RandomForest explanations could flatten class and feature axes together. Added helper selection logic for both old and current SHAP return formats.
- The SHAP `expected_value` handling assumed arrays always had at least two elements. For models such as `GradientBoostingClassifier`, SHAP can expose a one-element expected value array, which caused an index error. Added scalar/single-output-safe base value selection.
- The `check_additivity` argument in `calculate_shap_values` was documented but not passed to `TreeExplainer.shap_values`. Updated the tree-model path to use it.
- LIME explanations were generated with the default label `1`, then read with default label `1`, which fails or explains the wrong class when the predicted class is `0`. Updated LIME code to request and read the predicted label explicitly.
- LIME feature-name parsing used `feature_rule.split()[0]`, which breaks for interval rules such as `-1.0 < income <= 0.5`. Updated parsing to match known feature names, checking longer names first to avoid prefix collisions.
- The tree feature importance explanation said impurity reduction was specifically "Gini or entropy" across all tree models. Updated it to the more general "split criterion" wording, which also covers boosting trees.
- The compliance bullet referred directly to meeting GDPR's "right to explanation." Updated the wording to the more precise claim that interpretability supports GDPR transparency and automated-decision safeguards.

## Review Notes
- Smoke-tested all six Python code blocks with current local installs: scikit-learn 1.9.0, SHAP 0.52.0, pandas 3.0.3, NumPy 2.4.6, Matplotlib 3.10.9, and LIME from PyPI.
- Also ran a focused RandomForest SHAP test to verify the current multi-output ndarray path.
- The production service example emits scikit-learn warnings because it converts named DataFrame inputs to NumPy arrays before prediction. The examples still run correctly, but a future improvement could preserve DataFrame feature names in the service path.
