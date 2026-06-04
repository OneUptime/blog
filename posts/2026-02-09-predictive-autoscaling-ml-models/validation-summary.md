# Validation Summary: How to Implement Predictive Autoscaling with Kubernetes and ML Models

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, RBAC, and Horizontal Pod Autoscaling
- Prometheus and PromQL
- Prophet time series forecasting
- Kubernetes Python client
- KEDA ScaledObject, Prometheus scaler, and CPU scaler
- TensorFlow/Keras LSTM models
- scikit-learn MinMaxScaler
- Prometheus Python client metrics

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Prophet quick start documentation: https://facebook.github.io/prophet/docs/quick_start.html
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.0/querying/api/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.15/scalers/prometheus/
- KEDA CPU scaler documentation: https://keda.sh/docs/2.20/scalers/cpu/
- TensorFlow Keras LSTM API documentation: https://www.tensorflow.org/api_docs/python/tf/keras/layers/LSTM
- scikit-learn MinMaxScaler documentation: https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.MinMaxScaler.html

## Issues Found
- The dependency snippet omitted packages used later in the post (`prometheus-client`, `numpy`, `scikit-learn`, and `tensorflow`). Added them and changed the code fence from `python` to `text` because the snippet is a requirements file, not Python code.
- The PromQL query used `avg(rate(container_cpu_usage_seconds_total...))`, but the replica calculation treats the forecast as total CPU demand. Changed it to `sum(rate(...))` and filtered out empty/image-less container series so the predicted value matches the scaling calculation.
- The replica calculation used `int(...)`, which rounds down and can under-provision. Changed it to `math.ceil(...)` so fractional required capacity scales up.
- The Kubernetes Deployment manifest provided `PROMETHEUS_URL`, `NAMESPACE`, and `DEPLOYMENT` environment variables, but the Python code ignored them. Updated the main block to read those values with `os.getenv`.
- The LSTM prediction method trained on scaled data but initialized prediction with unscaled `recent_data`. Updated it to transform recent inputs before prediction and to update the rolling sequence with `np.concatenate` while preserving the expected 3D LSTM input shape.
- The KEDA Prometheus trigger query returned a vector that could contain multiple series. Updated it to `sum(rate(...))`, matching KEDA's expected single metric value pattern.
- The KEDA integration text stated that the shown scaler adjusts `minReplicaCount`, but the earlier Python code scales the Deployment directly. Changed the wording to describe this as a possible predictive-scaler pattern.
- The prediction-error snippet used `np` and `datetime` without imports, divided by zero when actual usage was zero, and passed an undefined `predicted` variable. Added the imports, a zero-actual guard, and used the stored predicted value.

## Review Notes
The HPA sync-period claim is accurate for the Kubernetes default. The KEDA CPU trigger syntax is valid, but it depends on Metrics Server and CPU requests or limits on the target workload. In a production KEDA hybrid implementation, the predictive component should patch the ScaledObject `minReplicaCount` through the Kubernetes custom objects API rather than patching Deployment replicas directly.
