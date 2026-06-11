# Validation Summary: How to Create Model Explainability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- scikit-learn
- SHAP
- LIME
- pandas
- NumPy
- matplotlib
- Mermaid

## Sources Consulted
- scikit-learn `permutation_importance` API documentation: https://scikit-learn.org/stable/modules/generated/sklearn.inspection.permutation_importance.html
- scikit-learn `partial_dependence` API documentation: https://scikit-learn.org/stable/modules/generated/sklearn.inspection.partial_dependence.html
- scikit-learn `PartialDependenceDisplay` API documentation: https://scikit-learn.org/stable/modules/generated/sklearn.inspection.PartialDependenceDisplay.html
- scikit-learn permutation feature importance user guide: https://scikit-learn.org/stable/modules/permutation_importance.html
- scikit-learn feature importance example: https://scikit-learn.org/stable/auto_examples/ensemble/plot_forest_importances.html
- SHAP `TreeExplainer` documentation: https://shap.readthedocs.io/en/latest/generated/shap.TreeExplainer.html
- LIME tabular explainer documentation: https://lime-ml.readthedocs.io/en/latest/lime.html
- LIME GitHub repository and installation guidance: https://github.com/marcotcr/lime

## Issues Found
- The SHAP examples assumed binary classifier SHAP values are returned as a list indexed by class. Current SHAP versions return a NumPy array for multiple-output models, shaped `(samples, features, outputs)` for scikit-learn binary classifiers. Updated the examples to select `shap_values[:, :, 1]` for the positive class and adjusted the complete example to handle both older list and current ndarray returns.
- The SHAP local explanation printed "Final prediction probability" from SHAP additivity. SHAP additivity is in the explainer's model output space, which is not always a probability. Updated the label to "Final model output".
- The partial dependence example used `pd_results['values']`. Current scikit-learn documents the returned grid under `pd_results['grid_values']`. Updated the code accordingly.
- The permutation importance example computed permutation importance on the training data while describing it as a reliability-oriented metric. Updated the helper to accept a supplied evaluation dataset and changed the call site to use the held-out test set.
- The setup block imported `GradientBoostingClassifier` but never used it. Removed the unused import.
- Two docstrings claimed the wrong return types (`dict` and `shap.Explanation`). Updated them to match the actual return values.

## Review Notes
Runtime checks were performed in an isolated package target directory with current `shap`, `lime`, `scikit-learn`, `pandas`, `numpy`, and `matplotlib`. The main feature importance, SHAP, LIME, and partial dependence API paths executed successfully. LIME/scikit-learn emits a non-fatal warning because the model is fitted with DataFrame feature names while LIME passes NumPy arrays to `predict_proba`; the examples still work as written.
