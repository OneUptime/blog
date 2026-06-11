# Validation Summary: How to Create Edge Inference

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Edge inference architecture
- TensorFlow Lite / LiteRT post-training quantization
- PyTorch pruning and knowledge distillation
- NVIDIA TensorRT
- Google Coral Edge TPU / PyCoral
- Python asyncio batching
- Python memory management and monitoring
- psutil
- NumPy

## Sources Consulted
- TensorFlow Lite / LiteRT post-training quantization documentation: https://developers.google.com/edge/litert/conversion/tensorflow/quantization/post_training_quantization
- TensorFlow Lite Python Interpreter API documentation: https://www.tensorflow.org/api_docs/python/tf/lite/Interpreter
- NVIDIA TensorRT Python API documentation: https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/python-api-docs.html
- NVIDIA TensorRT ICudaEngine Python API documentation: https://docs.nvidia.com/deeplearning/tensorrt/latest/_static/python-api/infer/Core/Engine.html
- PyTorch pruning tutorial: https://docs.pytorch.org/tutorials/intermediate/pruning_tutorial.html
- PyTorch global_unstructured pruning API documentation: https://docs.pytorch.org/docs/stable/generated/torch.nn.utils.prune.global_unstructured.html
- PyCoral image classification example: https://github.com/google-coral/pycoral/blob/master/examples/classify_image.py
- Coral / PyCoral reference documentation: https://developers.google.com/coral
- Python asyncio event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html

## Issues Found
- The TensorRT example used older binding-oriented APIs such as `get_binding_shape`, `get_binding_dtype`, `binding_is_input`, `execute_v2`, `config.max_workspace_size`, and `builder.build_engine`. Updated the example to use current named I/O tensor APIs, `set_memory_pool_limit`, `build_serialized_network`, `set_tensor_address`, and `execute_async_v3`, matching current NVIDIA TensorRT Python documentation.
- The TensorRT build function accepted `max_batch_size` but did not use it. Added an optimization profile for dynamic input shapes so `max_batch_size` is meaningful.
- The adaptive batcher could process immediately one request at a time with the default `min_batch_size=1`, and if `min_batch_size` were raised it could leave requests waiting forever because no timeout task was scheduled. Added a timer task that processes queued requests after `max_wait_ms` and cancels it when immediate processing starts.
- The memory-managed inference sample used `callable` as a type annotation. Replaced it with `Callable[[], Any]` and imported `Callable`.
- The complete pipeline example used `time.time()` and `json.dumps()` without importing `time` or `json`. Added the missing imports.
- The PyTorch pruning sample imported `Iterator` but did not use it. Removed the unused import.

## Review Notes
The examples are illustrative and still require hardware-specific dependencies and models to run end to end, such as TensorRT/PyCUDA on NVIDIA hardware, a compiled Edge TPU TFLite model for Coral, and an existing `model_quantized.tflite` for the final pipeline. The TensorFlow Lite quantization and PyCoral examples align with official documentation, but real deployments should replace synthetic calibration data with representative production data.
