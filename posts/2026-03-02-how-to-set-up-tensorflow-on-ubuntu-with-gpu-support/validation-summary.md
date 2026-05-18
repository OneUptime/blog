# Validation Summary: How to Set Up TensorFlow on Ubuntu with GPU Support

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- TensorFlow 2.x (specifically 2.13–2.16)
- NVIDIA CUDA Toolkit (12.2 / 12.3)
- NVIDIA cuDNN 8.9
- NVIDIA drivers (535+)
- Ubuntu 20.04 / 22.04
- Python virtual environments (venv)
- Keras (mixed precision, MirroredStrategy)
- TensorBoard
- nvidia-smi (dmon, query-gpu)

## Sources Consulted
- TensorFlow official install/source GPU compatibility table: https://www.tensorflow.org/install/source#gpu
- TensorFlow mixed precision guide: https://www.tensorflow.org/guide/mixed_precision
- TensorFlow `tf.config` API reference (set_memory_growth, set_logical_device_configuration, optimizer.set_jit)
- TensorFlow distribute MirroredStrategy docs: https://www.tensorflow.org/api_docs/python/tf/distribute/MirroredStrategy
- TensorBoard Keras callback docs: https://www.tensorflow.org/api_docs/python/tf/keras/callbacks/TensorBoard
- NVIDIA CUDA installation guide for Linux (apt-based install via cuda-keyring)
- NVIDIA cuDNN apt package versioning (libcudnn8 8.9.7.29-1+cuda12.2)
- nvidia-smi CLI documentation (dmon `-s um` for utilization/memory, --query-gpu options)
- NVIDIA CUDA forward/minor-version compatibility documentation

## Issues Found

1. **Bug: `set_memory_growth` called after GPU initialization** ("Verifying the GPU Is Used" section). The original code ran `tf.matmul` on the GPU first and then called `tf.config.experimental.set_memory_growth(gpu, True)`. This raises `RuntimeError: Physical devices cannot be modified after being initialized` because memory growth must be configured before any GPU is initialized. Fixed by moving the `set_memory_growth` block above the `tf.matmul` example so it runs first.

2. **Misleading comment about float32 in mixed precision section.** The original comment said "The last softmax layer stays in float32 automatically", which contradicts both the official TensorFlow mixed precision guide and the explicit `dtype='float32'` argument shown in the code right below. Changed the comment to "You must explicitly set dtype='float32' on the final layer" to match the code and the official guidance.

## Review Notes
- The TensorFlow / CUDA / cuDNN compatibility table matches the official TF source page for versions 2.13–2.16.
- Driver 535 supports CUDA 12.2 natively; the post installs CUDA 12.3 toolkit. This combination works in practice because of CUDA minor-version forward compatibility within the 12.x major release (apps built against any 12.x toolkit can run on a 525+ driver). The displayed `CUDA Version: 12.2` in the sample `nvidia-smi` output reflects the max version the driver advertises, not a hard incompatibility. Worth being aware of if readers want a stricter match — driver 545+ aligns directly with CUDA 12.3.
- The `libcudnn8=8.9.7.29-1+cuda12.2` apt pin is a real valid version of cuDNN 8.9.7.
- Passing `input_shape=(784,)` to the first `Dense` layer still works in TF 2.16 / Keras 3 but is being phased out in favor of an explicit `Input(shape=(784,))` layer. Not broken, just slightly older style.
- `tf.config.experimental.set_memory_growth` is still in the `experimental` namespace as of TF 2.16 and remains the documented API — no change needed.
- `tf.config.set_logical_device_configuration` and `tf.config.LogicalDeviceConfiguration` are the current (non-experimental) APIs; correctly used.
- The `nvidia-smi dmon -s um -d 1` invocation is valid (`u` = utilization, `m` = memory groups).
- The "single package for both CPU and GPU" claim for TF 2.13+ is accurate — the separate `tensorflow-gpu` shim was removed and `pip install tensorflow` is the unified package.
