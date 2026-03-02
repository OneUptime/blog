# How to Set Up PyTorch on Ubuntu with CUDA

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PyTorch, CUDA, GPU, Machine Learning

Description: A practical guide to installing PyTorch with CUDA support on Ubuntu, verifying GPU acceleration, and running your first GPU-accelerated training loop.

---

PyTorch is the dominant deep learning framework in research and increasingly in production. Its dynamic computation graph and Pythonic interface make it easier to debug and iterate on models compared to static graph frameworks. CUDA support lets it run on NVIDIA GPUs, which can be 10-50x faster than CPU for typical training workloads.

## Version Compatibility

PyTorch publishes a compatibility matrix for CUDA versions. As of 2026:

| PyTorch | CUDA versions supported |
|---|---|
| 2.3.x | 11.8, 12.1 |
| 2.2.x | 11.8, 12.1 |
| 2.1.x | 11.8, 12.1 |

Always use the official PyTorch installer at `https://pytorch.org/get-started/locally/` to get the exact installation command for your desired combination.

## Prerequisites

- Ubuntu 20.04 or 22.04
- NVIDIA GPU with CUDA capability 3.7+ (GTX 900 series or newer)
- NVIDIA driver installed (520+ for CUDA 11.8, 525+ for CUDA 12.x)
- Python 3.9 or newer
- sudo privileges

## Step 1: Install NVIDIA Drivers

```bash
# Check if GPU is detected
lspci | grep -i nvidia

# Install recommended driver
sudo ubuntu-drivers autoinstall

# Or install a specific version
sudo apt-get install -y nvidia-driver-535

sudo reboot

# Verify after reboot
nvidia-smi
```

## Step 2: Install CUDA (Optional with PyTorch pip packages)

With pip-installed PyTorch, CUDA libraries are bundled in the package. You only need the NVIDIA driver, not a separate CUDA installation. However, if you need `nvcc` for custom CUDA extensions:

```bash
# Add NVIDIA CUDA repository
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update

# Install CUDA toolkit (for nvcc, headers, libs - not needed for basic PyTorch use)
sudo apt-get install -y cuda-toolkit-12-1

# Add to PATH
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
```

## Step 3: Create a Python Virtual Environment

```bash
# Install Python and venv
sudo apt-get install -y python3 python3-pip python3-venv

# Create environment
python3 -m venv ~/pytorch-env

# Activate
source ~/pytorch-env/bin/activate

# Upgrade pip
pip install --upgrade pip
```

## Step 4: Install PyTorch with CUDA

Generate the exact install command from the PyTorch website, or use these:

```bash
# Install PyTorch 2.3 with CUDA 12.1 support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# For CUDA 11.8
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# CPU-only (for testing on machines without GPU)
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

## Step 5: Verify the Installation

```python
#!/usr/bin/env python3
import torch

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"GPU count: {torch.cuda.device_count()}")
    for i in range(torch.cuda.device_count()):
        print(f"  GPU {i}: {torch.cuda.get_device_name(i)}")
        props = torch.cuda.get_device_properties(i)
        print(f"    VRAM: {props.total_memory / 1e9:.1f} GB")

# Run a tensor operation on GPU
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"\nUsing device: {device}")

x = torch.randn(1000, 1000, device=device)
y = torch.randn(1000, 1000, device=device)
z = torch.matmul(x, y)
print(f"Matrix multiplication result shape: {z.shape}")
print(f"Tensor device: {z.device}")
```

## Building and Training a Neural Network

```python
#!/usr/bin/env python3
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import time

# Use GPU if available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Training on: {device}")

# Define a model
class SimpleNet(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(SimpleNet, self).__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_size // 2, output_size)
        )

    def forward(self, x):
        return self.layers(x)

# Create synthetic data
print("Generating data...")
X = torch.randn(50000, 128)
y = torch.randint(0, 10, (50000,))

# Create DataLoader
dataset = TensorDataset(X, y)
loader = DataLoader(dataset, batch_size=512, shuffle=True, num_workers=4, pin_memory=True)
# pin_memory=True speeds up CPU->GPU data transfers

# Initialize model and move to GPU
model = SimpleNet(128, 512, 10).to(device)
print(f"\nModel parameters: {sum(p.numel() for p in model.parameters()):,}")

# Optimizer and loss
optimizer = optim.Adam(model.parameters(), lr=1e-3)
criterion = nn.CrossEntropyLoss()

# Training loop
print("\nStarting training...")
start_time = time.time()

for epoch in range(10):
    model.train()
    total_loss = 0
    correct = 0

    for batch_X, batch_y in loader:
        # Move batch to GPU
        batch_X = batch_X.to(device, non_blocking=True)
        batch_y = batch_y.to(device, non_blocking=True)

        # Forward pass
        optimizer.zero_grad()
        output = model(batch_X)
        loss = criterion(output, batch_y)

        # Backward pass
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        correct += (output.argmax(1) == batch_y).sum().item()

    avg_loss = total_loss / len(loader)
    accuracy = correct / len(dataset) * 100
    print(f"Epoch {epoch+1:2d}: loss={avg_loss:.4f}, accuracy={accuracy:.1f}%")

elapsed = time.time() - start_time
print(f"\nTraining completed in {elapsed:.2f}s ({elapsed/10:.2f}s per epoch)")
```

## Using Mixed Precision (AMP)

Automatic Mixed Precision (AMP) uses FP16 for most operations, reducing memory usage and speeding up training on Volta+ GPUs:

```python
import torch
from torch.cuda.amp import autocast, GradScaler

device = torch.device('cuda')
model = SimpleNet(128, 512, 10).to(device)
optimizer = optim.Adam(model.parameters())
criterion = nn.CrossEntropyLoss()

# GradScaler prevents gradients from underflowing in FP16
scaler = GradScaler()

for epoch in range(10):
    for batch_X, batch_y in loader:
        batch_X = batch_X.to(device)
        batch_y = batch_y.to(device)

        optimizer.zero_grad()

        # Forward pass in mixed precision
        with autocast():
            output = model(batch_X)
            loss = criterion(output, batch_y)

        # Scale loss and backward pass
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
```

## Saving and Loading Models

```python
# Save the model
checkpoint = {
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'loss': loss,
}
torch.save(checkpoint, 'model_checkpoint.pth')

# Load the model
model = SimpleNet(128, 512, 10)
checkpoint = torch.load('model_checkpoint.pth', map_location=device)
model.load_state_dict(checkpoint['model_state_dict'])
optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
model.to(device)
model.eval()

# For inference only (smaller file, no optimizer state)
torch.save(model.state_dict(), 'model_weights.pth')

# Load for inference
model = SimpleNet(128, 512, 10)
model.load_state_dict(torch.load('model_weights.pth', map_location=device))
model.eval()
```

## Multi-GPU Training with DataParallel

```python
# Simple multi-GPU training
if torch.cuda.device_count() > 1:
    print(f"Using {torch.cuda.device_count()} GPUs")
    model = nn.DataParallel(model)

model = model.to(device)
```

For more advanced distributed training use `torch.nn.parallel.DistributedDataParallel`:

```python
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

# Initialize process group
dist.init_process_group(backend='nccl')  # NCCL is fastest for GPU-to-GPU

local_rank = int(os.environ['LOCAL_RANK'])
model = SimpleNet(128, 512, 10).to(local_rank)
model = DDP(model, device_ids=[local_rank])

# Launch with: torchrun --nproc_per_node=NUM_GPUS train.py
```

## Profiling GPU Performance

```python
# PyTorch profiler
with torch.profiler.profile(
    activities=[
        torch.profiler.ProfilerActivity.CPU,
        torch.profiler.ProfilerActivity.CUDA,
    ],
    schedule=torch.profiler.schedule(wait=1, warmup=1, active=3),
    on_trace_ready=torch.profiler.tensorboard_trace_handler('./profiler_logs'),
    with_stack=True
) as prof:
    for step, (batch_X, batch_y) in enumerate(loader):
        if step > 5:
            break
        batch_X = batch_X.to(device)
        output = model(batch_X)
        prof.step()

print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=10))
```

## Monitoring GPU Usage

```bash
# Real-time GPU monitoring
watch -n 1 nvidia-smi

# During training, watch utilization
nvidia-smi dmon -s um -d 2

# Check GPU memory
python3 -c "
import torch
if torch.cuda.is_available():
    print(f'Allocated: {torch.cuda.memory_allocated()/1e9:.2f}GB')
    print(f'Reserved: {torch.cuda.memory_reserved()/1e9:.2f}GB')
    print(f'Total: {torch.cuda.get_device_properties(0).total_memory/1e9:.2f}GB')
"
```

## Troubleshooting

**torch.cuda.is_available() returns False:**
```bash
# Check driver is loaded
nvidia-smi

# Check CUDA libraries are visible to Python
python3 -c "import ctypes; ctypes.CDLL('libcuda.so.1')"

# Reinstall PyTorch with correct CUDA version
# Get your CUDA version: nvidia-smi | grep CUDA
pip uninstall torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**CUDA out of memory:**
```python
# Reduce batch size
# Enable gradient checkpointing (trades compute for memory)
from torch.utils.checkpoint import checkpoint_sequential
output = checkpoint_sequential(model.layers, segments=4, input=x)

# Clear cache between runs
torch.cuda.empty_cache()

# Check what is using memory
print(torch.cuda.memory_summary())
```

**Slow training despite GPU:**
- Check `pin_memory=True` on DataLoader for faster CPU->GPU transfers
- Ensure `num_workers > 0` in DataLoader for parallel data loading
- Check GPU utilization with `nvidia-smi` - low utilization means data loading is the bottleneck
- Use AMP (mixed precision) for Volta+ GPUs

PyTorch's strong ecosystem, readable API, and excellent debugging tools make it the go-to choice for deep learning work. Once your GPU stack is correctly configured, the performance improvement over CPU makes training practical even on personal hardware.
