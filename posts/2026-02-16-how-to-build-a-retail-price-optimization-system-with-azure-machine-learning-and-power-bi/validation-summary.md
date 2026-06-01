# Validation Summary: How to Build a Retail Price Optimization System with Azure Machine Learning

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- pandas
- LightGBM
- scikit-learn
- MLflow
- SciPy
- Azure Machine Learning
- Power BI
- DAX
- Azure SQL Database

## Sources Consulted
- scikit-learn TimeSeriesSplit documentation: https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html
- LightGBM LGBMRegressor documentation: https://lightgbm.readthedocs.io/en/v3.2.1/pythonapi/lightgbm.LGBMRegressor.html
- MLflow LightGBM autolog documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.lightgbm.html
- SciPy optimize tutorial for minimize_scalar bounded optimization: https://docs.scipy.org/doc/scipy/tutorial/optimize.html
- Microsoft Learn DAX syntax reference: https://learn.microsoft.com/en-us/dax/dax-syntax-reference
- Microsoft Learn SUMX function documentation: https://learn.microsoft.com/en-sg/dax/sumx-function-dax
- Microsoft Learn DIVIDE function guidance: https://learn.microsoft.com/en-us/dax/best-practices/dax-divide-function-operator
- Microsoft Learn Azure Machine Learning overview: https://learn.microsoft.com/en-us/azure/machine-learning/overview-what-is-azure-machine-learning
- Microsoft Learn Power BI scheduled refresh for Azure SQL databases: https://learn.microsoft.com/en-us/power-bi/connect-data/service-admin-troubleshooting-scheduled-refresh-azure-sql-databases

## Issues Found
- The `feature_cols` list was defined inside `train_demand_model` but referenced later by `calculate_elasticity` and `optimize_price`, which would raise `NameError` if the snippets were used together. I changed it to a shared `FEATURE_COLS` constant and updated all references.
- The post correctly explained that `TimeSeriesSplit` trains on earlier observations and validates on later observations, but the code did not sort the dataset by date before splitting. Since scikit-learn splits by row order, I added `data.sort_values("date").reset_index(drop=True)` before building `X` and `y`.

## Review Notes
- The code snippets are illustrative and still assume that production data includes the referenced columns, such as `revenue`, `cost`, `is_promotion`, and encoded categorical fields after preprocessing.
- The Python snippets were checked with `python3` AST parsing after the fixes.
- MLflow LightGBM autologging is current, but MLflow documents compatibility by LightGBM version; production usage should pin compatible package versions.
