# Validation Summary: How to Implement TensorFlow Serving

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- TensorFlow
- Keras
- TensorFlow SavedModel
- TensorFlow Serving
- Docker
- gRPC
- REST APIs
- Protocol Buffers text configuration
- Kubernetes
- Istio VirtualService
- Prometheus
- Python

## Sources Consulted
- TensorFlow Serving with Docker: https://www.tensorflow.org/tfx/serving/docker
- TensorFlow Serving REST API: https://www.tensorflow.org/tfx/serving/api_rest
- TensorFlow Serving configuration: https://www.tensorflow.org/tfx/serving/serving_config
- Keras model export API: https://keras.io/api/models/model_saving_apis/export/
- TensorFlow `tf.keras.Model` API: https://www.tensorflow.org/api_docs/python/tf/keras/Model
- Keras TensorFlow Serving example: https://keras.io/examples/keras_recipes/tf_serving/
- Google Cloud TensorFlow Serving Prometheus guidance: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/exporters/tf-serving
- Grafana TensorFlow Serving integration metrics reference: https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-tensorflow/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Istio VirtualService documentation: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The model export example used `model.save(export_path)` for a SavedModel directory. In current Keras, `model.export(..., format="tf_saved_model")` is the documented inference export API for TensorFlow Serving, so the post now uses `model.export()` with an explicit input signature.
- The model example used `input_shape` directly on a `Dense` layer, which is no longer the preferred Keras pattern. It now uses an explicit `keras.Input` layer named `features`.
- The gRPC examples used brittle tensor names (`dense_input` and `dense_1`) that would not match the documented SavedModel signature from the updated export. They now use `features` for input and `output_0` for output.
- The post implied automatic rollback. TensorFlow Serving provides model version policies and versioned access, but rollback is controlled by configuration/deployment choices, so the wording was corrected.
- The version-specific REST example did not mention that multiple versions must be loaded by server configuration before they can be queried. A short note now clarifies this requirement.
- The Prometheus section implied metrics were available without enabling monitoring. TensorFlow Serving requires a `MonitoringConfig` passed via `--monitoring_config_file`, so the post now includes that configuration and Docker flag.
- The PromQL examples used non-matching metric names such as `tensorflow_serving_request_count` and histogram buckets that are not the documented TensorFlow Serving metric names. They were replaced with documented colon-prefixed TensorFlow Serving metrics and average latency/error-rate queries.

## Review Notes
The Docker, REST endpoint, model configuration, batching configuration, Kubernetes resource shape, and Istio traffic-splitting examples are broadly consistent with official documentation. The Kubernetes GPU example still assumes the cluster has the NVIDIA device plugin/runtime support and that the `ml-serving` namespace and PVC exist.
