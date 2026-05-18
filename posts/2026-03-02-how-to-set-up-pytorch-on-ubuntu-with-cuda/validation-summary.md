# Validation Summary: How to Set Up PyTorch on Ubuntu with CUDA

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- PyTorch (2.1.x – 2.3.x)
- NVIDIA CUDA Toolkit (11.8, 12.1)
- NVIDIA Drivers (Linux)
- Python 3.9+ / venv / pip
- Ubuntu 20.04 / 22.04
- `torch.cuda` GPU API
- `torch.amp` (Automatic Mixed Precision)
- `torch.utils.data.DataLoader` / `TensorDataset`
- `torch.nn.DataParallel` and `torch.nn.parallel.DistributedDataParallel`
- `torchrun` distributed launcher
- `torch.profiler`
- `nvidia-smi` / `nvidia-smi dmon`

## Sources Consulted
- PyTorch "Get Started" install matrix: https://pytorch.org/get-started/locally/
- PyTorch previous versions and supported CUDA: https://pytorch.org/get-started/previous-versions/
- `torch.amp` documentation (autocast / GradScaler): https://pytorch.org/docs/stable/amp.html
- `torch.cuda` API reference: https://pytorch.org/docs/stable/cuda.html
- `torch.utils.data.DataLoader` reference: https://pytorch.org/docs/stable/data.html
- DistributedDataParallel + `torchrun` docs: https://pytorch.org/docs/stable/elastic/run.html and https://pytorch.org/docs/stable/notes/ddp.html
- `torch.profiler` docs: https://pytorch.org/docs/stable/profiler.html
- NVIDIA CUDA Toolkit installation guide (Ubuntu/Debian network repo and cuda-keyring package): https://docs.nvidia.com/cuda/cuda-installation-guide-linux/
- NVIDIA CUDA Compatibility / minimum driver version table: https://docs.nvidia.com/deploy/cuda-compatibility/
- Ubuntu `ubuntu-drivers` and `nvidia-driver-535` package: Ubuntu archive / `ubuntu-drivers-common` documentation
- `nvidia-smi` man page (including `dmon` subcommand metrics `u`, `m`)

## Issues Found
1. **Deprecated AMP API in the Mixed Precision example.** The post imported `autocast` and `GradScaler` from `torch.cuda.amp`. These have been deprecated since PyTorch 2.4 (mid-2024) in favor of the device-agnostic `torch.amp` API, which emits a `FutureWarning` on use. For a 2026-dated article this is the wrong API to teach.
   - Fix: replaced `from torch.cuda.amp import autocast, GradScaler` / `GradScaler()` / `with autocast():` with `torch.amp.GradScaler('cuda')` and `with torch.amp.autocast('cuda'):`. Per `torch.amp` docs this is the supported, non-deprecated form.
2. **Missing `import os` in the DistributedDataParallel example.** The snippet calls `os.environ['LOCAL_RANK']` without importing `os`, which would raise `NameError` as written.
   - Fix: added `import os` at the top of that code block.

## Review Notes
- The PyTorch / CUDA support table only lists PyTorch 2.1.x – 2.3.x. By the article's stated date (March 2026), PyTorch 2.5 and 2.6 are also out and add CUDA 12.4 (and PyTorch 2.6 adds CUDA 12.6) wheels. The table is correct for what it claims, just incomplete; I did not extend it because the post's narrative everywhere else (install commands, driver guidance) is consistent with the 2.3-era matrix and rewriting would go beyond fixing errors.
- The prerequisite "CUDA capability 3.7+ (GTX 900 series or newer)" mixes two reference points: sm_37 is specifically Tesla K80 (Kepler datacenter); GTX 900-series consumer cards are Maxwell sm_5.0/5.2. PyTorch CUDA 11.8 wheels do still include sm_37, so 3.7+ as the floor is technically right, but the parenthetical example is a higher capability than the stated floor. Not a code-breaking error, so left as is.
- "NVIDIA driver 525+ for CUDA 12.x" is correct under CUDA Minor Version Compatibility (CUDA 12.0's 525.60.13+ driver can run later 12.x runtimes when the runtime libs are bundled, as PyTorch wheels do). Worth being aware of if a user installs a system CUDA 12.1+ toolkit standalone — in that case the strict per-version minimums (530+ for 12.1, 535+ for 12.2, etc.) apply.
- In PyTorch 2.6+, `torch.load(...)` defaults to `weights_only=True`. The checkpoint-restore example (which loads a dict containing the optimizer state) will need `weights_only=False` (or an `add_safe_globals` allowlist) on 2.6+ to deserialize the optimizer state. The `model_weights.pth` path (pure `state_dict`) is unaffected. Not changed because it works on 2.3.x as written and the post is pinned to that version range; users on 2.6+ may need to add the flag.
- `torch.utils.checkpoint.checkpoint_sequential` emits a `UserWarning` since PyTorch 2.1 if `use_reentrant` is not explicitly passed. The default still works but explicit `use_reentrant=False` is recommended for new code.
- `nvidia-smi dmon -s um -d 2` is valid: `u` = utilization, `m` = memory; `-d` is the sampling interval.
- The `cuda-keyring_1.1-1_all.deb` URL under `ubuntu2204/x86_64/` is the current NVIDIA-published keyring package and is correct.
