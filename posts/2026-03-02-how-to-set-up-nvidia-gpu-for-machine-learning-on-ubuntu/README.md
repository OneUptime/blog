# How to Set Up NVIDIA GPU for Machine Learning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVIDIA, Machine Learning, CUDA, Python

Description: Complete guide to configuring an NVIDIA GPU on Ubuntu for machine learning workloads, including driver installation, CUDA, cuDNN, and framework setup for PyTorch and TensorFlow.

---

Setting up an NVIDIA GPU for machine learning on Ubuntu involves several layers: the hardware driver, the CUDA runtime, cuDNN for deep learning primitives, and finally your ML framework of choice. Each layer has to be compatible with the others, and version mismatches are the most common source of problems. This guide covers a working, tested configuration from bare metal to running your first GPU-accelerated model.

## Checking GPU Compatibility

Not every NVIDIA GPU supports every CUDA version. Before anything else, confirm your GPU's compute capability:

```bash
# See your GPU model
lspci | grep -i nvidia

# Look up compute capability at:
# https://developer.nvidia.com/cuda-gpus
```

As a rule of thumb:
- Compute 6.x (Pascal): GTX 10-series, supports CUDA up to 12.x
- Compute 7.x (Volta/Turing): V100, RTX 20-series, supports CUDA up to 12.x
- Compute 8.x (Ampere): A100, RTX 30-series, full CUDA 12.x support
- Compute 9.x (Ada/Hopper): RTX 40-series, H100, requires CUDA 11.8+

## Installing the NVIDIA Driver

```bash
# Update package lists
sudo apt-get update

# Check recommended driver for your GPU
ubuntu-drivers devices

# Install the recommended driver automatically
sudo ubuntu-drivers autoinstall

# Or install a specific driver version
sudo apt-get install -y nvidia-driver-545
```

After installation, reboot and verify:

```bash
sudo reboot
# After reboot:
nvidia-smi
```

A clean `nvidia-smi` output showing your GPU, driver version, and CUDA version confirms the driver is working.

## Installing CUDA Toolkit

Install CUDA from the NVIDIA repository for the best compatibility with your driver:

```bash
# Add NVIDIA repository (Ubuntu 22.04 example)
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update

# Install CUDA 12.3 (match to your driver's supported CUDA version)
sudo apt-get install -y cuda-12-3
```

Configure the environment:

```bash
# Add to ~/.bashrc
cat >> ~/.bashrc << 'EOF'
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
EOF

source ~/.bashrc

# Verify
nvcc --version
```

## Installing cuDNN

cuDNN provides highly optimized routines for neural network operations (convolutions, pooling, etc.). It's required by TensorFlow and strongly recommended for PyTorch.

```bash
# Install cuDNN via apt (NVIDIA repo must be configured)
sudo apt-get install -y libcudnn8 libcudnn8-dev

# Verify cuDNN installation
cat /usr/include/cudnn_version.h | grep CUDNN_MAJOR -A 2
```

## Setting Up a Python Environment

Using a virtual environment keeps your ML packages isolated from system Python:

```bash
# Install Python and venv support
sudo apt-get install -y python3 python3-pip python3-venv

# Create a dedicated ML environment
python3 -m venv ~/ml-env

# Activate it
source ~/ml-env/bin/activate

# Upgrade pip
pip install --upgrade pip
```

## Installing PyTorch with GPU Support

PyTorch is the most flexible framework for research and production. Install the CUDA-enabled version:

```bash
# Install PyTorch with CUDA 12.1 support (check pytorch.org for latest)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Verify GPU is detected
python3 -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'CUDA version: {torch.version.cuda}')
print(f'GPU name: {torch.cuda.get_device_name(0)}')
print(f'GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB')
"
```

## Installing TensorFlow with GPU Support

TensorFlow 2.x includes GPU support in the main package:

```bash
# Install TensorFlow
pip install tensorflow

# Verify GPU detection
python3 -c "
import tensorflow as tf
gpus = tf.config.list_physical_devices('GPU')
print(f'TensorFlow version: {tf.__version__}')
print(f'GPUs available: {len(gpus)}')
for gpu in gpus:
    print(f'  GPU: {gpu.name}')
"
```

If TensorFlow doesn't find the GPU, check that CUDA and cuDNN versions match TensorFlow's requirements at https://www.tensorflow.org/install/source#gpu

## Running a Quick Benchmark

Test that GPU training actually runs faster than CPU with a simple benchmark:

```python
import torch
import time

# Create a large matrix multiplication task
size = 10000
a = torch.randn(size, size)
b = torch.randn(size, size)

# CPU benchmark
start = time.time()
c = torch.mm(a, b)
cpu_time = time.time() - start
print(f"CPU time: {cpu_time:.3f}s")

# GPU benchmark
a_gpu = a.cuda()
b_gpu = b.cuda()

# Warm up
torch.mm(a_gpu, b_gpu)
torch.cuda.synchronize()

start = time.time()
c_gpu = torch.mm(a_gpu, b_gpu)
torch.cuda.synchronize()
gpu_time = time.time() - start
print(f"GPU time: {gpu_time:.3f}s")
print(f"Speedup: {cpu_time/gpu_time:.1f}x")
```

Save this as `benchmark.py` and run it. On a modern GPU you should see 10-100x speedup depending on the GPU model.

## Monitoring GPU During Training

During model training, monitor GPU utilization to verify the GPU is actually doing work:

```bash
# Watch GPU stats every second
watch -n 1 nvidia-smi

# Or use nvitop for a better TUI (install with pip)
pip install nvitop
nvitop
```

Key metrics to watch:
- GPU-Util: should be high (70-100%) during training
- Memory-Usage: your batch size should fill most of the GPU memory
- Temperature: should stay below 85C under sustained load

## Optimizing Memory Usage

GPU memory is often the bottleneck. Common optimizations:

```python
import torch

# Enable automatic mixed precision (AMP) for 2x memory savings
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

# Training loop with AMP
with autocast():
    output = model(input)
    loss = criterion(output, target)

scaler.scale(loss).backward()
scaler.step(optimizer)
scaler.update()

# Free cache between experiments
torch.cuda.empty_cache()

# Monitor memory usage
print(f"Allocated: {torch.cuda.memory_allocated(0)/1e9:.2f} GB")
print(f"Reserved: {torch.cuda.memory_reserved(0)/1e9:.2f} GB")
```

## Installing Additional ML Libraries

With the base setup working, install common ML libraries:

```bash
# Scientific computing
pip install numpy scipy pandas matplotlib scikit-learn

# Hugging Face transformers (for LLMs and NLP)
pip install transformers datasets accelerate

# RAPIDS for GPU-accelerated data processing (optional, requires compatible GPU)
pip install cudf-cu12 cuml-cu12 --extra-index-url=https://pypi.nvidia.com
```

## Troubleshooting

### CUDA out of memory errors

Reduce batch size, enable AMP, or use gradient checkpointing:

```python
# Gradient checkpointing trades compute for memory
model = torch.utils.checkpoint.checkpoint_sequential(model, segments=4, input=x)
```

### Framework doesn't detect GPU after system update

A kernel update can break the NVIDIA module:

```bash
# Rebuild DKMS modules
sudo dkms autoinstall

# Verify
nvidia-smi
```

### Slow training despite GPU detection

Check that data loading isn't the bottleneck. Use `num_workers` in your DataLoader and pin memory:

```python
dataloader = DataLoader(
    dataset,
    batch_size=64,
    num_workers=4,    # parallel data loading
    pin_memory=True   # faster host-to-GPU transfer
)
```

With all these pieces in place, you have a solid ML development environment that can handle training from small experiments to large-scale model runs.
