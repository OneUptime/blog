# Version a Model and Its Preprocessing as One Deployable Artifact

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLflow, Machine Learning, Model Versioning, Python

Description: Package fitted preprocessing and prediction together with a raw-input signature, pinned dependencies, and reload tests that catch training-serving differences.

A model can load successfully and still produce incorrect predictions because serving prepares its inputs differently from training. A category may map to another column, a missing value may use a different replacement, or a numerical feature may be scaled twice.

Version the fitted preprocessing and predictor together. The consumer should submit the documented raw features to one artifact, rather than reconstructing training transformations in application code.

This tutorial uses a scikit-learn `Pipeline` registered with MLflow. The tested versions are **MLflow 3.18.0**, **scikit-learn 1.9.1**, **pandas 3.1.1**, **NumPy 2.4.6**, **skops 0.16.0**, and **Python 3.11**.

## Include learned transformation state

Preprocessing is more than a list of function names. Some transformations learn values from training data, and those values affect every subsequent prediction.

| Transformation | State that must travel with the model |
|---|---|
| Missing-value replacement | The fitted median or other replacement statistic |
| Standardization | The fitted mean and scale |
| Categorical encoding | Learned categories and their output-column order |
| Feature selection | Which features were retained and their order |
| Text processing | The vocabulary, tokenizer assets, and relevant configuration |

A scikit-learn pipeline fits intermediate transformers before fitting the final estimator. Its prediction path applies the fitted transformations before calling the predictor. Saving only the final estimator loses that surrounding behavior. [Pipeline reference](https://scikit-learn.org/1.9/modules/generated/sklearn.pipeline.Pipeline.html)

Fit these components on training data only. Fitting an imputer or scaler on the test set leaks information into evaluation. Put the pipeline inside the cross-validation or tuning workflow so each training fold learns its own preprocessing state. [Avoiding data leakage](https://scikit-learn.org/stable/common_pitfalls.html)

## Define the artifact's input boundary

For the example, raw requests contain two fields:

- `tenure_months`: a floating-point value; missing values are handled by the fitted numeric imputer.
- `plan`: a string category, such as `basic` or `plus`.

The artifact owns replacement, scaling, category encoding, and prediction. The serving application owns request parsing, authentication, and obtaining those raw features.

```mermaid
flowchart LR
    A[Raw feature request] --> B[Raw input signature]
    B --> C[Saved preprocessing state]
    C --> D[Saved predictor]
    D --> E[Prediction]
```

The preprocessing and predictor in this diagram are serialized as one fitted pipeline. Consumers should not standardize `tenure_months` or encode `plan` before calling it.

The signature must describe raw inputs. A signature describing the already-encoded matrix would expose internal feature layout and encourage callers to duplicate preprocessing. MLflow signatures describe input, output, and parameter formats and can validate supported input structure during loading and inference. [Model signatures](https://mlflow.org/docs/latest/ml/model/signatures/)

## Train and register the complete pipeline

Use the pinned packages in a virtual environment. Configure `MLFLOW_TRACKING_URI`, `MLFLOW_REGISTRY_URI`, an existing `EXPERIMENT_NAME`, and `REGISTERED_MODEL` through your environment, with normal registry and artifact credentials.

The following fixture is deliberately small. It demonstrates packaging and behavior, not a useful usage-forecasting model or an accuracy evaluation.

```python
import os
import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from mlflow.models import ModelSignature
from mlflow.types import ColSpec, Schema
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

train = pd.DataFrame({
    'tenure_months': [1.0, 2.0, 4.0, 6.0, 8.0, np.nan],
    'plan': ['basic', 'basic', 'plus', 'plus', 'basic', 'plus'],
})
usage = np.array([10.0, 14.0, 28.0, 35.0, 30.0, 25.0])
numeric = Pipeline([
    ('impute', SimpleImputer(strategy='median')),
    ('scale', StandardScaler()),
])
preprocess = ColumnTransformer([
    ('numeric', numeric, ['tenure_months']),
    ('plan', OneHotEncoder(handle_unknown='ignore', sparse_output=False), ['plan']),
], remainder='drop')
bundle = Pipeline([('preprocess', preprocess), ('model', Ridge(alpha=1.0))])
bundle.fit(train, usage)
signature = ModelSignature(
    inputs=Schema([ColSpec('double', 'tenure_months'), ColSpec('string', 'plan')]),
    outputs=Schema([ColSpec('double')]),
)
mlflow.set_tracking_uri(os.environ['MLFLOW_TRACKING_URI'])
mlflow.set_registry_uri(os.environ['MLFLOW_REGISTRY_URI'])
mlflow.set_experiment(os.environ['EXPERIMENT_NAME'])
with mlflow.start_run():
    logged = mlflow.sklearn.log_model(
        bundle, name='usage_pipeline', signature=signature,
        input_example=train.head(2),
        serialization_format='skops',
        skops_trusted_types=['numpy.dtype'],
        pip_requirements=['mlflow==3.18.0', 'scikit-learn==1.9.1',
                          'pandas==3.1.1', 'numpy==2.4.6', 'skops==0.16.0'],
    )
    version = mlflow.register_model(logged.model_uri, os.environ['REGISTERED_MODEL'])
    print(f'models:/{version.name}/{version.version}')
```

`ColumnTransformer` applies the numeric pipeline to `tenure_months` and the encoder to `plan`. Selection by column name avoids depending on the order in which those named columns arrive. The final Ridge estimator receives the transformed matrix. [ColumnTransformer](https://scikit-learn.org/1.9/modules/generated/sklearn.compose.ColumnTransformer.html)

The example explicitly uses `skops` serialization. This fitted pipeline contains a NumPy dtype that requires the narrow `skops_trusted_types=['numpy.dtype']` entry in the tested environment. This is an explicit trust decision for the locally constructed artifact, not an instruction to accept every type from an unknown file. Review the serialized types when the pipeline changes. [MLflow serialization options](https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html), [skops persistence](https://skops.readthedocs.io/en/stable/persistence.html)

The numeric training median is 4.0. That learned value stays inside the artifact; serving does not recompute it from the incoming batch.

`handle_unknown='ignore'` makes an unseen plan produce zeros for that feature's encoded columns. This is an explicit example policy, not a claim that unknown categories are always acceptable. Choose rejection, an unknown bucket, or another evaluated treatment according to the application, and monitor unexpected-category rates. [OneHotEncoder behavior](https://scikit-learn.org/1.9/modules/generated/sklearn.preprocessing.OneHotEncoder.html)

The explicit signature requires both named columns. A missing numeric value inside the column can be imputed; a missing required column is a different contract violation.

## Load one version and pass raw requests

Set `MODEL_URI` to the numeric URI printed during registration. Load the version in the intended inference environment:

```python
import os
import mlflow
import numpy as np
import pandas as pd

mlflow.set_tracking_uri(os.environ['MLFLOW_TRACKING_URI'])
mlflow.set_registry_uri(os.environ['MLFLOW_REGISTRY_URI'])
loaded = mlflow.pyfunc.load_model(os.environ['MODEL_URI'])
raw_requests = pd.DataFrame({
    'tenure_months': [3.0, np.nan, 5.0],
    'plan': ['basic', 'plus', 'enterprise'],
})
print(loaded.predict(raw_requests))
```

This produces three predictions: one for a known plan, one with a missing numeric value, and one with an unseen plan. The result is useful only within the demonstration's assumptions; the point is that all three pass through the same saved preprocessing and predictor.

Do not call `fit` or `fit_transform` while serving. Those methods learn new state and can make predictions depend on which requests happened to arrive together. The loaded artifact should use its existing fitted state.

MLflow's scikit-learn logging supports the Python-function flavor for estimators that implement `predict`, which lets the registered pipeline be loaded through `mlflow.pyfunc`. [scikit-learn flavor](https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html)

## Test the serialized boundary, not just the in-memory object

Run acceptance checks against the saved and reloaded artifact. Comparing only the original pipeline with itself cannot detect missing serialization dependencies or a serving wrapper that changes inputs.

Useful checks include:

| Case | Expected outcome for this example |
|---|---|
| Ordinary raw input | Original and reloaded pipeline predictions agree within a chosen numeric tolerance |
| Numeric value missing | The saved training median is used |
| Unseen plan | The documented unknown-category policy is applied |
| Named columns reordered | Predictions remain equivalent |
| Required `plan` column missing | Input validation fails |
| Numeric field contains incompatible text | Input validation fails |
| A new process loads the artifact | Predictions match without access to the old in-memory pipeline |

Also inspect that preprocessing statistics remain unchanged after inference. A request batch should not silently refit the scaler or extend the category vocabulary.

Local checks for this article executed both snippets and compared original, native scikit-learn, MLflow Python-function, and fresh-process loading. Predictions matched, the training median and scaling mean remained intact, unknown categories encoded as documented, and missing-column and incompatible-type inputs were rejected.

## Treat dependencies and external assets as part of the release

A pipeline object packages its fitted components, but it is not an operating system image. The example pins its direct Python requirements. For production, resolve and retain transitive dependencies and the actual inference image as well. Scikit-learn documents that loading persisted models across different library versions is unsupported and can fail or change behavior. [Model persistence](https://scikit-learn.org/1.9/model_persistence.html)

If a custom transformer requires a vocabulary file or other asset, package and version that asset through the model's supported artifact mechanism. An absolute path on the training machine or a mutable remote URL is not a reproducible release dependency.

A transformer that queries an external feature service remains dependent on that service. Specify its feature definitions and versioning contract rather than assuming serialization snapshots the service's behavior.

Finally, treat a preprocessing change as a model release even when the final estimator's weights are unchanged. Changing a replacement statistic, category policy, or input normalization can change predictions. Register the new complete artifact, evaluate it through the raw-input contract, and retain the previous complete artifact for recovery.

The local tests used SQLite and local artifacts in the existing pinned Python environment. They did not rebuild a fresh package environment, exercise a hosted inference service, or establish production prediction quality.
