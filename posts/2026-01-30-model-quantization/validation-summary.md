# Validation Summary: How to Build Model Quantization

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Model quantization
- NumPy
- PyTorch
- PyTorch quantization-aware training
- ONNX
- ONNX Runtime quantization
- NVIDIA TensorRT
- PyCUDA

## Sources Consulted
- ONNX QuantizeLinear operator documentation: https://onnx.ai/onnx/operators/onnx__QuantizeLinear.html
- ONNX Runtime quantization documentation: https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html
- PyTorch ONNX export documentation: https://docs.pytorch.org/docs/stable/onnx.html
- PyTorch torchao QAT API documentation: https://docs.pytorch.org/ao/stable/api_reference/api_ref_qat.html
- PyTorch QAT overview: https://pytorch.org/blog/quantization-aware-training/
- NVIDIA TensorRT IInt8EntropyCalibrator2 Python API documentation: https://docs.nvidia.com/deeplearning/tensorrt/10.16.0/_static/python-api/infer/Int8/EntropyCalibrator2.html
- NVIDIA TensorRT explicit quantization documentation: https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/work-quantized-types.html

## Issues Found
- The illustrative NumPy quantization formulas used Python `round()` on tensor-like values and did not clip asymmetric quantized values to the target integer range. Updated the examples to use `np.round()` and `np.clip()` to match ONNX linear quantization semantics.
- The asymmetric `Quantizer.calibrate()` implementation computed `zero_point` before guarding against a zero scale, which could divide by zero for constant tensors. Moved zero-point computation after the scale guard and clipped zero points to the representable range.
- The QAT example initialized running min/max to infinities but immediately applied exponential moving average arithmetic, which would keep the values infinite and break activation scale calculation. Added first-batch initialization, detached activation statistics, and clamped scales/zero points.
- The QAT comment described quantization parameters as learnable even though they are registered buffers. Updated the comment to avoid implying optimizer-trained parameters.
- The ONNX export example used `np.ndarray` and `nn.Module` type annotations without importing `numpy` or `torch.nn`. Added the missing imports.
- The TensorRT example used the legacy implicit INT8 calibration API without noting that TensorRT 10.1+ deprecates it in favor of explicit Q/DQ quantization. Added a version caveat and guidance for new TensorRT 10.x projects.
- The TensorRT calibrator snippet used `cuda` without importing PyCUDA, did not explicitly initialize the TensorRT calibrator base class as NVIDIA documents, and omitted calibration cache read/write methods. Added PyCUDA imports, explicit base initialization, cache methods, contiguous batch transfer, and full-batch handling.
- The TensorRT engine build path wrote the serialized engine without checking for build failure. Added a `None` check that raises a clear error.
- The layer sensitivity example could divide by zero for an all-zero layer. Added a minimum scale clamp.

## Review Notes
The custom TensorRT calibrator remains a legacy example for implicit INT8 calibration. The post now says so explicitly; a future update could replace that section with an explicit Q/DQ or NVIDIA ModelOpt workflow for TensorRT 10.x and later.
