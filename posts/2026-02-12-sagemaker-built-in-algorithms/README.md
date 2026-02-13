# How to Use SageMaker Built-In Algorithms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SageMaker, Machine Learning, Algorithms

Description: Explore Amazon SageMaker's built-in algorithms for common ML tasks including classification, regression, clustering, and natural language processing.

---

One of SageMaker's biggest time-savers is its library of built-in algorithms. Instead of writing training code from scratch, you pick an algorithm, point it at your data, set some hyperparameters, and let SageMaker handle the rest. These algorithms are pre-optimized for distributed training on AWS infrastructure, which means they'll often train faster than equivalent implementations you'd write yourself.

Let's look at the most useful built-in algorithms and how to use them in practice.

## Why Use Built-In Algorithms?

There are three good reasons to reach for a built-in algorithm before writing custom code:

1. **No training script needed** - You configure everything through hyperparameters. No code to debug.
2. **Distributed training out of the box** - Most built-in algorithms support multi-instance training without any configuration changes.
3. **Optimized implementations** - These aren't just wrappers around open-source libraries. AWS has tuned them for performance on SageMaker infrastructure.

The tradeoff is flexibility. If you need a very specific model architecture or training loop, you'll want to bring your own code. But for standard ML tasks, built-in algorithms are hard to beat for speed of iteration.

## The Algorithm Lineup

SageMaker offers algorithms across several categories. Here's a quick reference.

| Category | Algorithms |
|----------|-----------|
| Classification/Regression | XGBoost, Linear Learner, KNN |
| Clustering | K-Means |
| Time Series | DeepAR |
| NLP | BlazingText, Sequence-to-Sequence |
| Image | Image Classification, Object Detection, Semantic Segmentation |
| Anomaly Detection | Random Cut Forest, IP Insights |
| Dimensionality Reduction | PCA |
| Recommendation | Factorization Machines |

Let's dive into the most commonly used ones with working examples.

## XGBoost

XGBoost is probably the most popular algorithm on SageMaker - and for good reason. It handles tabular data incredibly well and works for both classification and regression. SageMaker's implementation supports distributed training across multiple instances.

```python
import sagemaker
from sagemaker import image_uris
from sagemaker.inputs import TrainingInput

session = sagemaker.Session()
role = sagemaker.get_execution_role()
bucket = session.default_bucket()
region = session.boto_region_name

# Get the XGBoost container
xgb_image = image_uris.retrieve(
    framework='xgboost',
    region=region,
    version='1.7-1'
)

# Configure the estimator
xgb = sagemaker.estimator.Estimator(
    image_uri=xgb_image,
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge',
    output_path=f's3://{bucket}/xgboost-output',
    sagemaker_session=session
)

# Set hyperparameters - objective determines classification vs regression
xgb.set_hyperparameters(
    objective='binary:logistic',   # For binary classification
    num_round=300,                  # Number of boosting rounds
    max_depth=6,                    # Max tree depth
    eta=0.1,                        # Learning rate
    subsample=0.8,                  # Row sampling ratio
    colsample_bytree=0.8,          # Column sampling ratio
    min_child_weight=3,            # Minimum sum of instance weight in a child
    eval_metric='auc',             # Evaluation metric
    early_stopping_rounds=20       # Stop if no improvement for 20 rounds
)

# Train it
xgb.fit({
    'train': TrainingInput(f's3://{bucket}/data/train', content_type='text/csv'),
    'validation': TrainingInput(f's3://{bucket}/data/validation', content_type='text/csv')
})
```

For regression, just change the objective to `reg:squarederror` and the eval_metric to `rmse`.

## Linear Learner

Linear Learner is your go-to for when you want a fast, interpretable model. It supports linear regression, binary classification, and multiclass classification. Under the hood, it uses stochastic gradient descent with automatic tuning of the learning rate.

```python
# Get the Linear Learner container
ll_image = image_uris.retrieve(
    framework='linear-learner',
    region=region,
    version='1'
)

linear_learner = sagemaker.estimator.Estimator(
    image_uri=ll_image,
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge',
    output_path=f's3://{bucket}/linear-learner-output',
    sagemaker_session=session
)

# Linear Learner hyperparameters
linear_learner.set_hyperparameters(
    predictor_type='binary_classifier',  # or 'regressor' or 'multiclass_classifier'
    feature_dim=20,                       # Number of input features
    mini_batch_size=200,                  # Batch size for training
    epochs=15,                            # Number of passes through data
    num_models=32,                        # Trains multiple models in parallel
    loss='auto',                          # Automatically picks the right loss function
    l1_regularization_weight=0.001,       # L1 regularization
    learning_rate=0.01                    # SGD learning rate
)

# Linear Learner uses RecordIO format for best performance
# But it also accepts CSV
linear_learner.fit({
    'train': TrainingInput(f's3://{bucket}/data/train', content_type='text/csv'),
    'validation': TrainingInput(f's3://{bucket}/data/validation', content_type='text/csv')
})
```

A nice feature of Linear Learner is the `num_models` parameter. It trains multiple models with different hyperparameter settings in parallel and picks the best one. It's like getting a mini hyperparameter search for free.

## K-Means Clustering

For unsupervised clustering tasks, SageMaker's K-Means is significantly faster than scikit-learn's implementation on large datasets because it supports distributed training.

```python
# Get K-Means container
kmeans_image = image_uris.retrieve(
    framework='kmeans',
    region=region,
    version='1'
)

kmeans = sagemaker.estimator.Estimator(
    image_uri=kmeans_image,
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge',
    output_path=f's3://{bucket}/kmeans-output',
    sagemaker_session=session
)

kmeans.set_hyperparameters(
    k=10,                    # Number of clusters
    feature_dim=20,          # Number of features
    mini_batch_size=500,     # Mini-batch size
    init_method='kmeans++',  # Initialization method
    max_iterations=100,      # Maximum iterations
    tol=0.0001              # Convergence tolerance
)

# K-Means only needs a training channel (unsupervised)
kmeans.fit({
    'train': TrainingInput(f's3://{bucket}/data/train', content_type='text/csv')
})
```

## DeepAR for Time Series Forecasting

DeepAR is one of the more unique built-in algorithms. It's a recurrent neural network designed for time series forecasting, and it can learn across multiple related time series simultaneously.

```python
import json

# Get DeepAR container
deepar_image = image_uris.retrieve(
    framework='forecasting-deepar',
    region=region,
    version='1'
)

deepar = sagemaker.estimator.Estimator(
    image_uri=deepar_image,
    role=role,
    instance_count=1,
    instance_type='ml.c5.2xlarge',
    output_path=f's3://{bucket}/deepar-output',
    sagemaker_session=session
)

# DeepAR hyperparameters
deepar.set_hyperparameters(
    time_freq='H',                  # Hourly data
    context_length=72,              # Look at 72 hours of history
    prediction_length=24,           # Predict next 24 hours
    num_cells=40,                   # RNN hidden state size
    num_layers=2,                   # Number of RNN layers
    likelihood='gaussian',          # Output distribution
    epochs=100,
    mini_batch_size=32,
    learning_rate=0.001,
    dropout_rate=0.05
)

# DeepAR expects JSON Lines format
deepar.fit({
    'train': TrainingInput(f's3://{bucket}/timeseries/train', content_type='application/jsonlines'),
    'test': TrainingInput(f's3://{bucket}/timeseries/test', content_type='application/jsonlines')
})
```

DeepAR's data format is JSON Lines where each line represents one time series.

```json
{"start": "2024-01-01 00:00:00", "target": [1.2, 3.4, 5.6, 7.8, 9.0, ...]}
{"start": "2024-01-01 00:00:00", "target": [2.1, 4.3, 6.5, 8.7, 0.9, ...]}
```

## BlazingText for NLP

BlazingText implements Word2Vec and text classification algorithms. It's incredibly fast - it can process millions of words per second.

```python
# Get BlazingText container
bt_image = image_uris.retrieve(
    framework='blazingtext',
    region=region,
    version='1'
)

blazingtext = sagemaker.estimator.Estimator(
    image_uri=bt_image,
    role=role,
    instance_count=1,
    instance_type='ml.c5.2xlarge',
    output_path=f's3://{bucket}/blazingtext-output',
    sagemaker_session=session
)

# For text classification (supervised mode)
blazingtext.set_hyperparameters(
    mode='supervised',        # 'skipgram', 'cbow', or 'supervised'
    epochs=10,
    min_count=2,              # Minimum word frequency
    learning_rate=0.05,
    vector_dim=100,           # Embedding dimension
    word_ngrams=2,            # Use bigrams
    early_stopping=True,
    patience=4
)

blazingtext.fit({
    'train': TrainingInput(f's3://{bucket}/text/train', content_type='text/plain')
})
```

BlazingText's supervised mode expects data in a specific format: each line has `__label__LABELNAME followed by the text`.

```
__label__positive This movie was fantastic and I loved every minute
__label__negative Terrible film, waste of time
```

## Random Cut Forest for Anomaly Detection

Random Cut Forest (RCF) is SageMaker's unsupervised anomaly detection algorithm. Feed it normal data, and it learns what "normal" looks like. Then it assigns anomaly scores to new data points.

```python
# Get RCF container
rcf_image = image_uris.retrieve(
    framework='randomcutforest',
    region=region,
    version='1'
)

rcf = sagemaker.estimator.Estimator(
    image_uri=rcf_image,
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge',
    output_path=f's3://{bucket}/rcf-output',
    sagemaker_session=session
)

rcf.set_hyperparameters(
    num_samples_per_tree=256,  # Samples per tree
    num_trees=100,              # Number of trees
    feature_dim=10              # Number of features
)

rcf.fit({
    'train': TrainingInput(f's3://{bucket}/data/train', content_type='text/csv')
})
```

This is really useful for monitoring applications. If your system generates metrics, you can train RCF on historical data and use it to detect anomalies in real-time. Pair it with [OneUptime's monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) for a robust anomaly detection pipeline.

## Choosing the Right Algorithm

Here's a simple decision framework:

- **Tabular data, need accuracy** - Start with XGBoost
- **Tabular data, need speed or interpretability** - Use Linear Learner
- **Time series** - DeepAR
- **Text classification** - BlazingText
- **Anomaly detection** - Random Cut Forest
- **Clustering** - K-Means
- **Images** - Image Classification or Object Detection

You can also use [SageMaker Automatic Model Tuning](https://oneuptime.com/blog/post/2026-02-12-sagemaker-automatic-model-tuning-hyperparameter-optimization/view) to find the best hyperparameters for whichever algorithm you choose.

## Wrapping Up

Built-in algorithms are the fastest path from data to model on SageMaker. They handle the training code, distributed computing, and infrastructure for you. Start with these when tackling a new problem, and only move to custom training scripts when you need something the built-in algorithms can't provide. The consistent API across all algorithms means switching between them is just a matter of changing the image URI and hyperparameters.
