# Validation Summary: How to Install CUDA and cuDNN on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu 22.04 LTS
- NVIDIA GPU drivers
- NVIDIA CUDA Toolkit
- NVIDIA cuDNN
- DKMS
- PyTorch
- TensorFlow

## Sources Consulted
- NVIDIA CUDA Installation Guide for Linux 12.3.1: https://docs.nvidia.com/cuda/archive/12.3.1/cuda-installation-guide-linux/index.html
- NVIDIA CUDA Toolkit Release Notes and driver compatibility: https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/index.html
- NVIDIA Data Center Drivers CUDA toolkit, driver, and architecture matrix: https://docs.nvidia.com/datacenter/tesla/drivers/595/cuda-toolkit-driver-and-architecture-matrix.html
- NVIDIA cuDNN Installation Guide for Linux: https://docs.nvidia.com/deeplearning/cudnn/installation/latest/linux.html
- PyTorch Get Started installation guide: https://pytorch.org/get-started/locally/
- TensorFlow pip installation guide: https://www.tensorflow.org/install/pip

## Issues Found
- The DKMS cleanup command could fail or prompt incorrectly because `dkms remove` needs a target scope. Added `--all` and `xargs -r` so it removes matched NVIDIA module versions and does nothing when there are no matches.
- The driver installation section used `nvidia-driver-535` while describing NVIDIA's CUDA repository. Updated the package search and install commands to use the CUDA repository's `cuda-drivers-535` package naming.
- The CUDA toolkit installation commands used `cuda-12-3` and `cuda`, which install broader CUDA meta-packages and may include driver packages. Updated them to `cuda-toolkit-12-3` and `cuda-toolkit` for toolkit-only installation after the driver step.
- The CUDA sample verification used `/usr/local/cuda/samples/...`, but CUDA samples are now distributed from the NVIDIA `cuda-samples` GitHub repository. Updated the commands to clone the matching `v12.3` samples and build `deviceQuery` from its current path.
- The cuDNN package commands used lower-level package names. Updated the CUDA 12 cuDNN install command to NVIDIA's documented `cudnn9-cuda-12` meta-package and kept the samples package for verification.
- The cuDNN version check assumed a single header location. Updated it to check common direct and multiarch include paths.
- The multiple CUDA versions and troubleshooting examples still referenced broader CUDA meta-packages. Updated them to `cuda-toolkit-11-8` and `cuda-toolkit-12-3`.
- The PyTorch install command used the unavailable `cu123` wheel index. Updated it to a currently documented CUDA wheel family, `cu126`.
- The TensorFlow GPU install command used `pip3 install tensorflow`, but current TensorFlow Linux GPU installation uses the `tensorflow[and-cuda]` extra. Updated the command.

## Review Notes
- The article remains version-specific. Future updates should re-check the currently supported CUDA wheel versions for PyTorch and TensorFlow's tested CUDA/cuDNN versions.
- The CUDA driver shown by `nvidia-smi` was correctly described as the maximum CUDA version supported by the installed driver, not the installed toolkit version.
