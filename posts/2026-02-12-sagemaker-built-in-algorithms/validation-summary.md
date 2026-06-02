# Validation Summary: How to Use SageMaker Built-In Algorithms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker AI
- SageMaker Python SDK
- SageMaker built-in algorithms
- XGBoost
- Linear Learner
- K-Means
- DeepAR
- BlazingText
- Random Cut Forest
- Amazon S3 training inputs

## Sources Consulted
- AWS SageMaker AI built-in algorithms documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html
- AWS SageMaker AI XGBoost hyperparameters: https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost_hyperparameters.html
- AWS SageMaker AI prebuilt image support policy: https://docs.aws.amazon.com/sagemaker/latest/dg/pre-built-containers-support-policy.html
- SageMaker Python SDK image URI utility reference: https://sagemaker.readthedocs.io/en/stable/api/utility/image_uris.html
- AWS SageMaker AI Linear Learner algorithm and hyperparameters: https://docs.aws.amazon.com/sagemaker/latest/dg/linear-learner.html and https://docs.aws.amazon.com/sagemaker/latest/dg/ll_hyperparameters.html
- AWS SageMaker AI K-Means hyperparameters: https://docs.aws.amazon.com/sagemaker/latest/dg/k-means-api-config.html
- AWS SageMaker AI DeepAR algorithm input/output interface: https://docs.aws.amazon.com/sagemaker/latest/dg/deepar.html
- AWS SageMaker AI BlazingText algorithm and hyperparameters: https://docs.aws.amazon.com/sagemaker/latest/dg/blazingtext.html and https://docs.aws.amazon.com/sagemaker/latest/dg/blazingtext_hyperparameters.html
- AWS SageMaker AI Random Cut Forest algorithm and hyperparameters: https://docs.aws.amazon.com/sagemaker/latest/dg/randomcutforest.html and https://docs.aws.amazon.com/sagemaker/latest/dg/rcf_hyperparameters.html
- AWS SageMaker AI common data formats for training: https://docs.aws.amazon.com/sagemaker/latest/dg/cdf-training.html

## Issues Found
- The XGBoost example used image version `1.7-1`, which AWS lists as past its end-of-patch date. Updated the example to `3.0-5`, the current XGBoost framework image version shown in the SageMaker support policy.
- The Linear Learner example used `l1_regularization_weight`, which is not the built-in container hyperparameter name when using a generic `Estimator`. Changed it to `l1`.
- The Linear Learner explanation said it uses stochastic gradient descent with automatic learning-rate tuning. AWS documents multiple optimizer choices and defaults `optimizer='auto'` to Adam, so the wording was corrected to describe gradient-based optimizers and automatic settings.
- The K-Means example used `max_iterations` and `tol`, which are old SDK estimator-style names, not the hyperparameter names for the built-in algorithm container through a generic `Estimator`. Updated them to `local_lloyd_max_iter` and `local_lloyd_tol`.
- The K-Means and Random Cut Forest examples used plain `text/csv` for unsupervised training data. Updated the training inputs to `text/csv;label_size=0` to make the absence of label columns explicit for SageMaker's CSV parser.
- The DeepAR JSON example used ellipses inside a `json` code fence, which is not valid JSON. Replaced the sample arrays with complete values.
- The BlazingText example enabled `early_stopping=True` without providing a validation channel. AWS requires a validation channel for early stopping, so a `validation` input was added.
- The BlazingText format sentence had a missing closing backtick around `__label__LABELNAME`. Fixed the inline code formatting.
- The distributed training claim said most built-in algorithms support multi-instance training without configuration changes. This was softened to "many" and focused on avoiding custom distributed training code because support varies by algorithm and mode.
- Added a short production caveat to check the SageMaker prebuilt image support policy because several older built-in algorithm containers remain usable but are past end-of-patch.

## Review Notes
The examples assume data has already been prepared in each algorithm's required format and uploaded to the referenced S3 prefixes. The local environment did not have the SageMaker Python SDK installed, so code execution against SageMaker was not performed; validation was based on AWS documentation and the SageMaker SDK reference.
