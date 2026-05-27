# Validation Summary: How to Orchestrate Multi-Step ML Workflows with Vertex AI Pipelines and TFX

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Pipelines
- TensorFlow Extended (TFX)
- TensorFlow Transform
- TensorFlow Model Analysis
- TensorFlow SavedModel
- Python
- Google Cloud AI Platform Python SDK

## Sources Consulted
- TFX `CsvExampleGen` API reference: https://www.tensorflow.org/tfx/api_docs/python/tfx/v1/components/CsvExampleGen
- TFX `Transform` API reference: https://www.tensorflow.org/tfx/api_docs/python/tfx/components/Transform
- TFX `Trainer` guide: https://www.tensorflow.org/tfx/guide/trainer
- TFX Keras component tutorial: https://www.tensorflow.org/tfx/tutorials/tfx/components_keras
- TFX `Evaluator` API reference: https://www.tensorflow.org/tfx/api_docs/python/tfx/v1/components/Evaluator
- TFX Evaluator guide: https://tensorflow.github.io/tfx/guide/evaluator/
- TFX `LatestBlessedModelStrategy` API reference: https://www.tensorflow.org/tfx/api_docs/python/tfx/v1/dsl/experimental/LatestBlessedModelStrategy
- TFX `KubeflowV2DagRunner` API reference: https://www.tensorflow.org/tfx/api_docs/python/tfx/v1/orchestration/experimental/KubeflowV2DagRunner
- Vertex AI run a pipeline documentation: https://cloud.google.com/vertex-ai/docs/pipelines/run-pipeline
- Vertex AI schedule pipeline runs documentation: https://cloud.google.com/vertex-ai/docs/pipelines/schedule-pipeline-run
- Google Cloud AI Platform `PipelineJob` Python reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.PipelineJob
- TensorFlow Keras saving and export guide: https://www.tensorflow.org/guide/keras/serialization_and_saving

## Issues Found
- The install command used `tfx[kfp]` and described it as installing the Vertex AI pipeline runner. Updated it to install `tfx` and `google-cloud-aiplatform`, matching the official TFX and Vertex AI SDK packages used in the examples.
- The TFX imports used older/non-public paths for the latest blessed model resolver. Updated the code to use the public `tfx.v1` API and `LatestBlessedModelStrategy`.
- The Evaluator example compared against a baseline but did not define a TFMA `EvalConfig` or validation thresholds. Added a minimal `EvalConfig` with `BinaryAccuracy` and `ExampleCount`, matching the official Evaluator pattern.
- The trainer module called `_input_fn` without defining it. Added an input function that uses TFX `DataAccessor` and `tfxio.TensorFlowDatasetOptions`.
- The trainer saved the Keras model without exporting transform-aware serving/evaluation signatures. Added serving and `transform_features` signatures so raw `tf.Example` records can be transformed consistently for serving and TFMA evaluation.
- The orchestration snippet imported `KubeflowV2DagRunner` from an internal path. Updated it to use `tfx.orchestration.experimental.KubeflowV2DagRunner`, which is the documented public API.
- The architecture diagram implied that the sample pushes to a registry and deploys an endpoint. Updated the wording to reflect the sample's TFX `Pusher` behavior: pushing a blessed model to the configured serving model destination.

## Review Notes
The snippets are syntactically valid Python after the edits. They are still a simplified tutorial example: a real production pipeline should pin compatible TensorFlow, TFX, TFMA, and Python versions, configure IAM/service accounts, choose a container image for Vertex execution, and add deployment-specific steps if automatic Vertex endpoint deployment is required.
