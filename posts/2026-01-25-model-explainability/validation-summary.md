# Validation Summary: How to Configure Model Explainability

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Python
- SHAP
- LIME
- scikit-learn
- FastAPI
- Pydantic
- NumPy
- pandas
- Matplotlib
- Mermaid

## Sources Consulted
- SHAP TreeExplainer documentation: https://shap.readthedocs.io/en/latest/generated/shap.TreeExplainer.html
- SHAP KernelExplainer documentation: https://shap.readthedocs.io/en/latest/generated/shap.KernelExplainer.html
- SHAP DeepExplainer documentation: https://shap.readthedocs.io/en/latest/generated/shap.DeepExplainer.html
- SHAP release notes: https://shap.readthedocs.io/en/latest/release_notes.html
- LIME tabular explainer documentation: https://lime-ml.readthedocs.io/en/latest/lime.html
- scikit-learn partial_dependence documentation: https://scikit-learn.org/stable/modules/generated/sklearn.inspection.partial_dependence.html
- scikit-learn PartialDependenceDisplay documentation: https://scikit-learn.org/stable/modules/generated/sklearn.inspection.PartialDependenceDisplay.html
- scikit-learn permutation_importance documentation: https://scikit-learn.org/stable/modules/generated/sklearn.inspection.permutation_importance.html
- FastAPI response_model documentation: https://fastapi.tiangolo.com/tutorial/response-model/
- Pydantic BaseModel documentation: https://pydantic.dev/docs/validation/latest/api/pydantic/base_model/

## Issues Found
- The SHAP example only handled multi-output SHAP values returned as lists. Current SHAP versions can return multi-output values as arrays with the output dimension last, so the code could flatten class outputs together and produce incorrect feature contributions. Added helper methods to select the positive class from either list or ndarray outputs and to select the matching expected value.
- The SHAP tree explainer used the default raw output while the example reported `predict_proba` probabilities. Updated the tree explainer initialization to use background data and `model_output="probability"` for classifiers so SHAP contributions align with the probability prediction being reported.
- The intrinsic importance example flattened multi-class `coef_`, which can mismatch feature names by mixing class and feature axes. Updated it to average absolute coefficients across classes before zipping with feature names.
- The partial dependence example used the older `result['values']` key. Current scikit-learn documents `grid_values`, so the code now reads `result['grid_values']`.
- The H-statistic helper computed one-way PDPs with 50 grid points and the two-way PDP with 25 grid points, causing incompatible array shapes. Added a shared `grid_resolution` parameter and passed it consistently.
- The FastAPI explanation endpoint built feature arrays from request dictionary order, which may differ from the order used when the explainers were trained. Updated each branch to build feature arrays using the corresponding explainer's `feature_names`.

## Review Notes
All Python snippets parse successfully with `python3 ast.parse`. The ML libraries are not installed in this workspace, so runtime execution of SHAP, LIME, and scikit-learn examples was not possible locally; API behavior was checked against official documentation.
