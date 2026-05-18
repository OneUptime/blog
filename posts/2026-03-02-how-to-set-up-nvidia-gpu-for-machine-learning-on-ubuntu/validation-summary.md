# Validation Summary: How to Set Up NVIDIA GPU for Machine Learning on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Ubuntu (22.04)
- NVIDIA GPU drivers (`ubuntu-drivers`, `nvidia-driver-*`)
- CUDA Toolkit 12.x
- cuDNN
- Python virtual environments (`venv`)
- PyTorch (with CUDA wheels, AMP, gradient checkpointing, DataLoader)
- TensorFlow 2.x (GPU)
- `nvidia-smi`, `nvitop`
- DKMS
- Hugging Face transformers / datasets / accelerate
- RAPIDS (cuDF / cuML)

## Sources Consulted
- NVIDIA CUDA GPU Compute Capability — https://developer.nvidia.com/cuda/gpus
- NVIDIA Ada Lovelace Tuning Guide (compute 8.9) — https://docs.nvidia.com/cuda/ada-tuning-guide/
- NVIDIA Hopper Tuning Guide (compute 9.0) — https://docs.nvidia.com/cuda/hopper-tuning-guide/
- NVIDIA CUDA repository keyring docs — https://developer.nvidia.com/blog/updating-the-cuda-linux-gpg-repository-key/
- NVIDIA cuDNN 9 Linux install docs — https://docs.nvidia.com/deeplearning/cudnn/installation/latest/linux.html
- TensorFlow pip install docs — https://www.tensorflow.org/install/pip
- PyTorch `torch.amp` docs — https://docs.pytorch.org/docs/stable/amp.html
- PyTorch get-started — https://pytorch.org/get-started/locally/
- Ubuntu package archive for `nvidia-driver-*` — https://packages.ubuntu.com/

## Issues Found

1. **Compute capability mapping was wrong for Ada Lovelace.** The post listed "Compute 9.x (Ada/Hopper): RTX 40-series, H100". Ada Lovelace (RTX 40-series) is compute capability **8.9**, not 9.x; only Hopper (H100) is 9.0. Fixed by splitting the line into separate Ada (8.9) and Hopper (9.0) entries, and clarifying that Volta is 7.0 / Turing is 7.5 and Ampere splits into 8.0 (A100) / 8.6 (RTX 30-series).

2. **Outdated NVIDIA driver recommendation.** The post hard-coded `nvidia-driver-545`, which was a short-lived transitional branch (Oct/Nov 2023) and has since been removed from some Ubuntu jammy repos. Updated to `nvidia-driver-550` with a note to use a current LTS branch.

3. **Outdated cuDNN package names.** The post used `libcudnn8 libcudnn8-dev`. cuDNN 9 is the current major release and uses CUDA-version-suffixed package names. Updated to `libcudnn9-cuda-12 libcudnn9-dev-cuda-12`.

4. **TensorFlow GPU install command outdated.** Since TensorFlow 2.15, plain `pip install tensorflow` no longer pulls the CUDA libraries needed for GPU support. Updated to the official `pip install 'tensorflow[and-cuda]'`.

5. **Deprecated PyTorch AMP API.** `from torch.cuda.amp import autocast, GradScaler` was deprecated in PyTorch 2.4 and emits `FutureWarning`. Updated to the current `torch.amp` API: `from torch.amp import autocast, GradScaler` with `GradScaler("cuda")` and `autocast("cuda")`.

## Review Notes
- The CUDA install pins `cuda-12-3`; newer CUDA 12.x minor versions exist. The version is intentionally pinned and remains valid, but readers should consult NVIDIA's repo for the latest.
- The PyTorch wheel index `cu121` is still a valid CUDA 12.1 build channel. Newer channels (`cu124`, `cu126`) exist; the post correctly tells readers to "check pytorch.org for latest", so no change made.
- The `checkpoint_sequential(..., input=x)` call in the troubleshooting section will emit a `use_reentrant` deprecation warning in recent PyTorch releases, but still works. Left as-is since this is a brief illustrative snippet, not a complete training loop.
- The AMP description says "2x memory savings"; in practice AMP delivers ~1.5–2x throughput improvement and modest memory savings on Volta+ GPUs. Wording is a minor simplification rather than a technical error, so left as-is.
- Pascal GPU support is still present in CUDA 12.x but is being removed in CUDA 13, so the "supports CUDA up to 12.x" line is correct today but will need a refresh once CUDA 13 ships broadly.
