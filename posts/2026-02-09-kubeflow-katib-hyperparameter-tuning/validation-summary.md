# Validation Summary: How to Build an End-to-End MLOps Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubeflow Katib
- Katib Experiment CRDs
- Katib hyperparameter tuning algorithms
- Katib neural architecture search
- Katib early stopping and metrics collection
- Docker
- Python
- scikit-learn
- PyTorch
- Prometheus and PrometheusRule
- Kubeflow Pipelines

## Sources Consulted
- Kubeflow Katib installation documentation: https://www.kubeflow.org/docs/components/katib/installation/
- Kubeflow Katib Experiment configuration documentation: https://www.kubeflow.org/docs/components/katib/user-guides/hp-tuning/configure-experiment/
- Kubeflow Katib HP tuning algorithm documentation: https://www.kubeflow.org/docs/components/katib/user-guides/hp-tuning/configure-algorithm/
- Kubeflow Katib Trial template documentation: https://www.kubeflow.org/docs/components/katib/user-guides/trial-template/
- Kubeflow Katib metrics collector documentation: https://www.kubeflow.org/docs/components/katib/user-guides/metrics-collector/
- Kubeflow Katib early stopping documentation: https://www.kubeflow.org/docs/components/katib/user-guides/early-stopping/
- Kubeflow Katib NAS algorithm documentation: https://www.kubeflow.org/docs/components/katib/user-guides/nas/configure-algorithm/
- Kubeflow Katib UI documentation: https://www.kubeflow.org/docs/components/katib/user-guides/katib-ui/
- Kubeflow Katib GitHub source for Prometheus metric names: https://github.com/kubeflow/katib
- scikit-learn release and API documentation: https://scikit-learn.org/

## Issues Found
- The Katib standalone install command used the older `v0.16.0` reference and omitted `.git` in the kustomize URL. Updated it to the official stable Katib install command format using `v0.17.0`.
- The scikit-learn example tuned `learning_rate` while using `RandomForestClassifier`, which does not use that hyperparameter. Changed the estimator to `GradientBoostingClassifier`, where `learning_rate`, `n_estimators`, and `max_depth` are valid model parameters.
- The Dockerfile pinned an older scikit-learn release and installed NumPy explicitly even though the sample did not use NumPy directly. Updated the dependency to `scikit-learn==1.7.2` and removed the unnecessary NumPy pin.
- The early-stopping training snippet emitted intermediate metrics without timestamps. Katib early stopping requires timestamped training logs to determine metric order, so the snippet now prefixes each metric line with a UTC timestamp.
- The PyTorch example referenced undefined `train_loader` and `val_loader` variables. Added simple `TensorDataset` and `DataLoader` setup so the snippet is syntactically complete and runnable as a minimal example.
- The Prometheus section listed non-existent Katib metric names such as `katib_experiment_running_total`, `katib_experiment_succeeded_trials_total`, `katib_experiment_failed_trials_total`, and `katib_trial_duration_seconds`. Replaced them with metrics exported by Katib controller source: `katib_experiments_current`, `katib_trial_succeeded_total`, `katib_trial_failed_total`, and `katib_trials_current`.
- The Prometheus alert used the non-existent `katib_experiment_failed_trials_total` metric. Updated it to use `katib_trial_failed_total`.
- The Kubeflow Pipelines snippet returned an undefined `best_params` variable. Added a placeholder serialized value so the example no longer contains an undefined return value.
- Removed an unused `components` import from the Kubeflow Pipelines snippet.

## Review Notes
Some snippets remain abbreviated by design, especially the Bayesian optimization and NAS examples where `trialTemplate` is represented as a placeholder. They are acceptable as partial configuration examples, but a future revision could add complete manifests for copy-paste use.
