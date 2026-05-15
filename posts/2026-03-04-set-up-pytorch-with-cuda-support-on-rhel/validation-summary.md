# Validation Summary: How to Set Up PyTorch with CUDA Support on RHEL

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Python 3.11
- Python virtual environments and pip
- PyTorch
- CUDA
- NVIDIA GPU drivers
- Multi-GPU training with PyTorch

## Sources Consulted
- PyTorch Get Started / Start Locally: https://pytorch.org/get-started/locally/
- PyTorch Previous Versions: https://docs.pytorch.org/get-started/previous-versions/
- PyTorch `torch.cuda.is_available` API documentation: https://docs.pytorch.org/docs/stable/generated/torch.cuda.is_available.html
- PyTorch `torch.nn.DataParallel` API documentation: https://docs.pytorch.org/docs/stable/generated/torch.nn.DataParallel.html
- Red Hat Enterprise Linux 9 dynamic programming languages documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- NVIDIA CUDA 12.4 Toolkit release notes and driver compatibility tables: https://docs.nvidia.com/cuda/archive/12.4.0/cuda-toolkit-release-notes/

## Issues Found
- The prerequisites implied that a local CUDA Toolkit and `nvcc` must be installed and matched to the PyTorch build. PyTorch binary wheels are selected from the PyTorch CUDA wheel matrix and require a compatible NVIDIA driver; a local CUDA Toolkit is only needed for source builds or custom CUDA extensions. Updated the prerequisites to make the CUDA Toolkit check optional.
- The install examples used CUDA 12.4 and CUDA 12.1 wheel indexes, which are no longer the current CUDA examples in the PyTorch installation matrix. Updated the examples to CUDA 12.6 and CUDA 12.8 wheel indexes.
- The monitoring example labeled `torch.cuda.memory_reserved()` as "Memory cached". Updated the label to "Memory reserved", matching the PyTorch API.
- The troubleshooting note stated that the driver CUDA version should be greater than or equal to the PyTorch CUDA version. Reworded it to clarify that the CUDA version shown by `nvidia-smi` should be high enough for the installed PyTorch CUDA runtime.

## Review Notes
The `DataParallel` example is technically valid, but PyTorch documentation recommends `DistributedDataParallel` for multi-GPU training even on a single node. The post already mentions `DistributedDataParallel`, so no content change was required.
