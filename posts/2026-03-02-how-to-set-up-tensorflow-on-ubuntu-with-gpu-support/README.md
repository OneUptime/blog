# How to Set Up TensorFlow on Ubuntu with GPU Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TensorFlow, GPU, CUDA, Machine Learning

Description: Step-by-step guide to installing NVIDIA CUDA, cuDNN, and TensorFlow on Ubuntu for GPU-accelerated machine learning training and inference.

---

TensorFlow with GPU support can be dramatically faster than CPU-only training - often 10x to 50x for typical neural network workloads. Getting the GPU stack configured correctly requires matching versions of CUDA, cuDNN, and TensorFlow. This guide walks through a clean setup on Ubuntu.

## Version Compatibility

TensorFlow, CUDA, and cuDNN must be version-matched. As of TensorFlow 2.x:

| TensorFlow | CUDA | cuDNN |
|---|---|---|
| 2.16.x | 12.3 | 8.9.x |
| 2.15.x | 12.2 | 8.9.x |
| 2.14.x | 11.8 | 8.7.x |
| 2.13.x | 11.8 | 8.6.x |

Always check the official TensorFlow compatibility table at `https://www.tensorflow.org/install/source#gpu` before installing.

## Prerequisites

- Ubuntu 20.04 or 22.04
- NVIDIA GPU (RTX, A-series, V100, A100, etc.)
- At least 8GB of GPU VRAM for typical training workloads
- sudo privileges

## Step 1: Install NVIDIA Drivers

```bash
# Check if an NVIDIA GPU is present
lspci | grep -i nvidia

# Check current driver status
nvidia-smi  # Will fail if no driver installed

# Install the recommended NVIDIA driver via Ubuntu's driver tool
sudo ubuntu-drivers autoinstall

# Or manually select a specific version
sudo apt-get install -y nvidia-driver-535  # Check ubuntu-drivers devices for available versions

sudo reboot
```

After rebooting:

```bash
# Verify the driver is loaded
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.x.x    Driver Version: 535.x.x    CUDA Version: 12.2       |
# +-----------------------------------------------------------------------------+
# | GPU  Name        Persistence-M| ...                                         |
```

## Step 2: Install CUDA Toolkit

The easiest way to install CUDA on Ubuntu is via the NVIDIA CUDA repository:

```bash
# Example: Install CUDA 12.3
# First, remove any existing CUDA installation
sudo apt-get purge -y 'cuda*' 'libcuda*' 'nvidia-cuda*'

# Add the CUDA repository keyring
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update

# Install CUDA toolkit
sudo apt-get install -y cuda-toolkit-12-3
# (installs nvcc, libraries, headers)

# OR install the full CUDA package (includes drivers)
# sudo apt-get install -y cuda-12-3
```

Add CUDA to your PATH:

```bash
# Add to ~/.bashrc
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc

# Verify CUDA installation
nvcc --version
# nvcc: NVIDIA (R) Cuda compiler driver
# Cuda compilation tools, release 12.3, V12.3.x
```

## Step 3: Install cuDNN

cuDNN is NVIDIA's deep learning primitive library. With the CUDA keyring already added:

```bash
# Install cuDNN 8.9 for CUDA 12
sudo apt-get install -y libcudnn8=8.9.7.29-1+cuda12.2
sudo apt-get install -y libcudnn8-dev=8.9.7.29-1+cuda12.2

# Pin the version to prevent automatic upgrades
sudo apt-mark hold libcudnn8 libcudnn8-dev

# Verify cuDNN
cat /usr/include/cudnn_version.h | grep -i "#define CUDNN_MAJOR" -A 2
```

## Step 4: Install TensorFlow

Using a Python virtual environment is strongly recommended:

```bash
# Install Python 3 and venv
sudo apt-get install -y python3 python3-pip python3-venv

# Create a virtual environment
python3 -m venv ~/tensorflow-env

# Activate it
source ~/tensorflow-env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install TensorFlow with GPU support
# TensorFlow 2.13+ uses a single package for both CPU and GPU
pip install tensorflow==2.16.2

# Verify GPU detection
python3 -c "import tensorflow as tf; print('GPUs:', tf.config.list_physical_devices('GPU'))"
# Expected: GPUs: [PhysicalDevice(name='/physical_device:GPU:0', device_type='GPU')]
```

## Verifying the GPU Is Used

```python
#!/usr/bin/env python3
import tensorflow as tf

# List available GPUs
gpus = tf.config.list_physical_devices('GPU')
print(f"GPUs available: {len(gpus)}")
for gpu in gpus:
    print(f"  {gpu}")

# Run a simple operation on the GPU
with tf.device('/GPU:0'):
    a = tf.constant([[1.0, 2.0], [3.0, 4.0]])
    b = tf.constant([[5.0, 6.0], [7.0, 8.0]])
    c = tf.matmul(a, b)
    print(f"\nMatrix multiplication result:\n{c.numpy()}")

# Enable memory growth to avoid TensorFlow allocating all GPU memory at once
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)
print("\nMemory growth enabled")
```

## Training a Simple Model

```python
#!/usr/bin/env python3
import tensorflow as tf
from tensorflow.keras import layers, models
import numpy as np
import time

# Enable memory growth
gpus = tf.config.list_physical_devices('GPU')
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)

# Generate synthetic data
print("Generating training data...")
X_train = np.random.randn(10000, 784).astype(np.float32)
y_train = np.random.randint(0, 10, 10000)

# Build a simple dense neural network
model = models.Sequential([
    layers.Dense(512, activation='relu', input_shape=(784,)),
    layers.Dropout(0.2),
    layers.Dense(256, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(128, activation='relu'),
    layers.Dense(10, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# Train with GPU
print("\nTraining on GPU...")
start_time = time.time()

model.fit(
    X_train, y_train,
    epochs=5,
    batch_size=256,
    validation_split=0.1
)

elapsed = time.time() - start_time
print(f"\nTraining completed in {elapsed:.2f} seconds")
```

## GPU Memory Management

By default, TensorFlow allocates all GPU memory it can find at startup. Control this behavior:

```python
# Option 1: Enable memory growth (allocates incrementally)
for gpu in tf.config.list_physical_devices('GPU'):
    tf.config.experimental.set_memory_growth(gpu, True)

# Option 2: Set a hard limit on GPU memory
gpu = tf.config.list_physical_devices('GPU')[0]
tf.config.set_logical_device_configuration(
    gpu,
    [tf.config.LogicalDeviceConfiguration(memory_limit=4096)]  # 4GB limit
)

# Option 3: Use XLA JIT compilation for faster execution
tf.config.optimizer.set_jit(True)
```

## Mixed Precision Training

Mixed precision uses FP16 for computations where possible, significantly reducing memory usage and improving throughput on modern GPUs (Volta and newer):

```python
from tensorflow.keras import mixed_precision

# Enable mixed precision globally
policy = mixed_precision.Policy('mixed_float16')
mixed_precision.set_global_policy(policy)

# Model outputs should use float32 for numerical stability
# The last softmax layer stays in float32 automatically

model = models.Sequential([
    layers.Dense(512, activation='relu'),
    layers.Dense(10, dtype='float32', activation='softmax')  # Explicit float32
])
```

## Multi-GPU Training

For servers with multiple GPUs:

```python
# Distribute training across all available GPUs
strategy = tf.distribute.MirroredStrategy()

print(f"Number of replicas: {strategy.num_replicas_in_sync}")

with strategy.scope():
    # Build and compile model within strategy scope
    model = models.Sequential([
        layers.Dense(512, activation='relu'),
        layers.Dense(10, activation='softmax')
    ])
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy')

# Training automatically splits batches across GPUs
model.fit(X_train, y_train, epochs=5, batch_size=512)  # Batch size is global
```

## Monitoring GPU Usage During Training

```bash
# Watch GPU utilization in real time
watch -n 1 nvidia-smi

# For more detailed metrics
nvidia-smi dmon -s um -d 1
# Shows: utilization, memory

# Log GPU stats to a file during a training run
nvidia-smi --query-gpu=timestamp,utilization.gpu,memory.used,temperature.gpu \
  --format=csv --loop=5 > gpu_stats.csv &

# Run your training
python train.py

# Stop the logging
kill %1
```

## TensorBoard for Training Visualization

```python
from tensorflow.keras.callbacks import TensorBoard
import datetime

# Create a unique log directory
log_dir = "logs/fit/" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

tensorboard_callback = TensorBoard(
    log_dir=log_dir,
    histogram_freq=1,    # Record weight histograms every epoch
    profile_batch='2,5'  # Profile GPU performance on batches 2-5
)

model.fit(
    X_train, y_train,
    epochs=10,
    callbacks=[tensorboard_callback]
)
```

```bash
# Launch TensorBoard (in the virtual environment)
tensorboard --logdir logs/fit/

# Access at http://localhost:6006
# Use SSH tunnel for remote servers:
ssh -L 6006:localhost:6006 user@gpu-server
```

## Troubleshooting

**"No module named 'tensorflow'" after installation:**
```bash
# Verify you are in the virtual environment
which python
# Should show ~/tensorflow-env/bin/python

# Activate if not active
source ~/tensorflow-env/bin/activate
```

**"Could not load dynamic library 'libcudart.so'" or similar:**
```bash
# Check CUDA library path
ldconfig -p | grep cuda

# Ensure LD_LIBRARY_PATH is set
echo $LD_LIBRARY_PATH

# Rebuild the library cache
sudo ldconfig
```

**GPU not detected by TensorFlow:**
```bash
# Check driver and CUDA are working
nvidia-smi
nvcc --version

# Check CUDA version TensorFlow expects
python3 -c "import tensorflow as tf; print(tf.sysconfig.get_build_info())"

# Look for CUDA version mismatches in TF logs
python3 -c "import tensorflow as tf" 2>&1 | head -30
```

**Out of memory during training:**
- Reduce batch size
- Enable memory growth
- Use mixed precision training
- Reduce model size for initial testing

Once the CUDA stack is correctly installed and versions match, TensorFlow GPU training works reliably. The biggest time sink is typically getting the version numbers right - mismatched CUDA and cuDNN versions cause cryptic errors that are hard to diagnose without knowing to check compatibility first.
