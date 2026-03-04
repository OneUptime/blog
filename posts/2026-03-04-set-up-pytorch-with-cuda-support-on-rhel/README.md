# How to Set Up PyTorch with CUDA Support on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PyTorch, CUDA, GPU, Machine Learning

Description: Install PyTorch with CUDA GPU acceleration on RHEL for training and running deep learning models with full NVIDIA GPU support.

---

PyTorch is a widely used machine learning framework. Setting it up with CUDA support on RHEL allows you to leverage NVIDIA GPUs for training and inference, drastically reducing computation time.

## Prerequisites

Ensure NVIDIA drivers and CUDA are installed:

```bash
# Check that the NVIDIA driver is loaded
nvidia-smi

# Check the CUDA version
nvcc --version
# Note the CUDA version (e.g., 12.4) for matching the PyTorch build
```

## Install Python and Create a Virtual Environment

```bash
# Install Python 3.11
sudo dnf install -y python3.11 python3.11-devel python3.11-pip

# Create a virtual environment for your project
python3.11 -m venv ~/pytorch-env
source ~/pytorch-env/bin/activate

# Upgrade pip
pip install --upgrade pip
```

## Install PyTorch with CUDA

Select the correct CUDA version from the PyTorch website. For CUDA 12.4:

```bash
# Install PyTorch with CUDA 12.4 support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# For CUDA 12.1
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

## Verify the Installation

```bash
# Test that PyTorch can see the GPU
python3 -c "
import torch
print('PyTorch version:', torch.__version__)
print('CUDA available:', torch.cuda.is_available())
print('CUDA version:', torch.version.cuda)
print('GPU count:', torch.cuda.device_count())
if torch.cuda.is_available():
    print('GPU name:', torch.cuda.get_device_name(0))
    # Run a simple tensor operation on GPU
    x = torch.rand(1000, 1000, device='cuda')
    y = torch.rand(1000, 1000, device='cuda')
    z = torch.matmul(x, y)
    print('GPU compute test passed. Result shape:', z.shape)
"
```

## Run a Simple Training Example

```python
#!/usr/bin/env python3
# simple_train.py - Basic neural network training on GPU
import torch
import torch.nn as nn
import torch.optim as optim

# Set device to GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Training on: {device}")

# Create a simple model
model = nn.Sequential(
    nn.Linear(784, 256),
    nn.ReLU(),
    nn.Linear(256, 10)
).to(device)

# Generate random training data (replace with real data in practice)
inputs = torch.randn(1000, 784).to(device)
targets = torch.randint(0, 10, (1000,)).to(device)

# Set up loss function and optimizer
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Training loop
for epoch in range(10):
    optimizer.zero_grad()
    outputs = model(inputs)
    loss = criterion(outputs, targets)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1}, Loss: {loss.item():.4f}")

print("Training complete")
```

```bash
# Run the training script
python3 simple_train.py
```

## Multi-GPU Training

```python
# For multi-GPU training, use DataParallel or DistributedDataParallel
import torch.nn as nn

# Simple DataParallel (for quick multi-GPU)
model = nn.DataParallel(model)
model = model.to(device)
```

## Monitor GPU During Training

```bash
# In a separate terminal, watch GPU usage
watch -n 1 nvidia-smi

# Or use the Python API
python3 -c "
import torch
print(f'Memory allocated: {torch.cuda.memory_allocated()/1e9:.2f} GB')
print(f'Memory cached: {torch.cuda.memory_reserved()/1e9:.2f} GB')
"
```

## Troubleshooting

```bash
# If CUDA is not detected, check the driver compatibility
python3 -c "import torch; print(torch.cuda.is_available())"

# Ensure the CUDA version matches
python3 -c "import torch; print('Compiled CUDA:', torch.version.cuda)"
nvidia-smi | head -3
# The driver CUDA version should be >= the PyTorch CUDA version
```

PyTorch with CUDA on RHEL gives you a stable, enterprise-supported platform for developing and training deep learning models.
