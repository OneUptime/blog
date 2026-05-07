# How to Use ROCm in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ROCm, AMD, Podman, GPU Computing, HIP, Container

Description: A comprehensive guide to using AMD ROCm inside Podman containers for GPU-accelerated computing, covering HIP programming, library usage, and machine learning workloads.

---

> ROCm in containers delivers AMD GPU compute power through an open-source stack, giving developers freedom from vendor lock-in while maintaining high performance.

ROCm (Radeon Open Compute) is AMD's open-source software platform for GPU computing. It provides a CUDA-like programming experience through HIP (Heterogeneous-Computing Interface for Portability), along with optimized math libraries, profiling tools, and support for popular machine learning frameworks. Running ROCm inside Podman containers simplifies environment management and ensures reproducibility across different systems. This guide covers everything from basic setup to writing and running HIP code inside containers.

---

## ROCm Architecture Overview

The ROCm stack consists of several layers:

- **AMDGPU Kernel Driver** - The Linux kernel driver for AMD GPUs (runs on host)
- **ROCr Runtime** - The HSA (Heterogeneous System Architecture) runtime
- **HIP** - The programming interface, compatible with CUDA syntax
- **ROCm Libraries** - Math libraries like rocBLAS, rocFFT, MIOpen
- **Framework Integration** - PyTorch, TensorFlow, and JAX support

The kernel driver runs on the host, while everything else can live inside the container.

## Prerequisites

### Host Setup

```bash
# Verify your AMD GPU is detected and the amdgpu driver is loaded

lspci -k | grep -A 3 -i "VGA.*AMD"
# Should show "Kernel driver in use: amdgpu"

# Verify the compute devices are available
ls -la /dev/kfd /dev/dri/renderD*
# /dev/kfd is the Kernel Fusion Driver (required for compute)
# /dev/dri/renderD128+ are the render nodes

# Ensure user has proper group access
groups | grep -o 'render\|video'
# Both 'render' and 'video' should appear

# If not in the groups:
sudo usermod -aG render,video $USER
# Log out and back in
```

### Install Podman

```bash
# Fedora/RHEL
sudo dnf install -y podman

# Ubuntu/Debian
sudo apt-get install -y podman
```

## Running ROCm Containers

### Basic ROCm Container

```bash
# Pull the ROCm development image
podman pull rocm/dev-ubuntu-22.04:latest

# Run with GPU access and verify
# For rootless Podman, keep the caller's supplementary groups inside the container
# (this requires the crun OCI runtime)
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --security-opt seccomp=unconfined \
  --group-add keep-groups \
  rocm/dev-ubuntu-22.04:latest \
  bash -c "rocm-smi && echo '---' && rocminfo | head -40"
```

### Available ROCm Container Images

```bash
# Development image - includes compilers (hipcc), headers, and libraries
podman pull rocm/dev-ubuntu-22.04:latest

# PyTorch with ROCm
podman pull rocm/pytorch:latest

# TensorFlow with ROCm
podman pull rocm/tensorflow:latest

# JAX with ROCm
podman pull rocm/jax-community:latest

# Small terminal image with the prerequisites to build HIP applications
# but without the full ROCm library set
podman pull rocm/rocm-terminal:latest
```

## Writing and Compiling HIP Code

HIP is AMD's GPU programming language that mirrors CUDA syntax. Code written in HIP can run on both AMD and NVIDIA GPUs.

### A Simple HIP Program

```bash
# Create a HIP source file
mkdir -p /tmp/rocm-demo
cat > /tmp/rocm-demo/vector_add.hip.cpp << 'EOF'
#include <hip/hip_runtime.h>
#include <stdio.h>
#include <stdlib.h>

// HIP kernel for vector addition (syntax identical to CUDA)
__global__ void vectorAdd(const float *a, const float *b, float *c, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        c[idx] = a[idx] + b[idx];
    }
}

int main() {
    const int N = 1000000;
    size_t size = N * sizeof(float);

    // Query GPU properties
    hipDeviceProp_t prop;
    hipGetDeviceProperties(&prop, 0);
    printf("GPU: %s\n", prop.name);
    printf("Compute Units: %d\n", prop.multiProcessorCount);
    printf("Global Memory: %.1f GB\n", prop.totalGlobalMem / 1073741824.0);
    printf("Max Threads Per Block: %d\n", prop.maxThreadsPerBlock);
    printf("Architecture: %s\n", prop.gcnArchName);

    // Allocate host memory
    float *h_a = (float*)malloc(size);
    float *h_b = (float*)malloc(size);
    float *h_c = (float*)malloc(size);

    // Initialize input data
    for (int i = 0; i < N; i++) {
        h_a[i] = (float)i;
        h_b[i] = (float)(i * 2);
    }

    // Allocate device memory
    float *d_a, *d_b, *d_c;
    hipMalloc(&d_a, size);
    hipMalloc(&d_b, size);
    hipMalloc(&d_c, size);

    // Copy to device
    hipMemcpy(d_a, h_a, size, hipMemcpyHostToDevice);
    hipMemcpy(d_b, h_b, size, hipMemcpyHostToDevice);

    // Launch kernel
    int blockSize = 256;
    int gridSize = (N + blockSize - 1) / blockSize;
    printf("Launching: %d blocks x %d threads\n", gridSize, blockSize);

    hipLaunchKernelGGL(vectorAdd, dim3(gridSize), dim3(blockSize), 0, 0,
                       d_a, d_b, d_c, N);

    // Copy result back
    hipMemcpy(h_c, d_c, size, hipMemcpyDeviceToHost);

    // Verify
    int errors = 0;
    for (int i = 0; i < N; i++) {
        if (h_c[i] != h_a[i] + h_b[i]) errors++;
    }
    printf("Result: %s (%d errors)\n", errors == 0 ? "PASS" : "FAIL", errors);

    // Cleanup
    hipFree(d_a); hipFree(d_b); hipFree(d_c);
    free(h_a); free(h_b); free(h_c);

    return 0;
}
EOF

# Compile and run inside a ROCm container
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --security-opt seccomp=unconfined \
  --group-add keep-groups \
  -v /tmp/rocm-demo:/workspace:Z \
  rocm/dev-ubuntu-22.04:latest \
  bash -c "cd /workspace && hipcc -o vector_add vector_add.hip.cpp && ./vector_add"
```

## Using ROCm Math Libraries

ROCm includes GPU-optimized versions of common math libraries:

```bash
# Create a rocBLAS example
cat > /tmp/rocm-demo/rocblas_gemm.cpp << 'EOF'
#include <hip/hip_runtime.h>
#include <rocblas/rocblas.h>
#include <stdio.h>
#include <stdlib.h>

int main() {
    const int M = 1024, N = 1024, K = 1024;
    size_t sizeA = M * K * sizeof(float);
    size_t sizeB = K * N * sizeof(float);
    size_t sizeC = M * N * sizeof(float);

    // Allocate host memory
    float *h_A = (float*)malloc(sizeA);
    float *h_B = (float*)malloc(sizeB);
    float *h_C = (float*)malloc(sizeC);

    // Initialize matrices with random values
    for (int i = 0; i < M * K; i++) h_A[i] = (float)(rand() % 10) / 10.0f;
    for (int i = 0; i < K * N; i++) h_B[i] = (float)(rand() % 10) / 10.0f;

    // Allocate device memory
    float *d_A, *d_B, *d_C;
    hipMalloc(&d_A, sizeA);
    hipMalloc(&d_B, sizeB);
    hipMalloc(&d_C, sizeC);

    // Copy data to device
    hipMemcpy(d_A, h_A, sizeA, hipMemcpyHostToDevice);
    hipMemcpy(d_B, h_B, sizeB, hipMemcpyHostToDevice);

    // Create rocBLAS handle
    rocblas_handle handle;
    rocblas_create_handle(&handle);

    // Perform matrix multiplication: C = alpha * A * B + beta * C
    float alpha = 1.0f, beta = 0.0f;

    // Time the operation
    hipEvent_t start, stop;
    hipEventCreate(&start);
    hipEventCreate(&stop);
    hipEventRecord(start);

    rocblas_sgemm(handle,
                  rocblas_operation_none, rocblas_operation_none,
                  M, N, K,
                  &alpha,
                  d_A, M,
                  d_B, K,
                  &beta,
                  d_C, M);

    hipEventRecord(stop);
    hipEventSynchronize(stop);

    float elapsed_ms;
    hipEventElapsedTime(&elapsed_ms, start, stop);

    // Calculate GFLOPS
    double gflops = (2.0 * M * N * K) / (elapsed_ms * 1e6);
    printf("Matrix multiplication %dx%d: %.2f ms (%.1f GFLOPS)\n",
           M, N, elapsed_ms, gflops);

    // Cleanup
    rocblas_destroy_handle(handle);
    hipFree(d_A); hipFree(d_B); hipFree(d_C);
    free(h_A); free(h_B); free(h_C);

    return 0;
}
EOF

# Compile and run with rocBLAS
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --security-opt seccomp=unconfined \
  --group-add keep-groups \
  -v /tmp/rocm-demo:/workspace:Z \
  rocm/dev-ubuntu-22.04:latest \
  bash -c "cd /workspace && hipcc -o rocblas_gemm rocblas_gemm.cpp -lrocblas && ./rocblas_gemm"
```

## Running PyTorch with ROCm

```bash
# Create a PyTorch training script
cat > /tmp/rocm-demo/train_model.py << 'EOF'
import torch
import torch.nn as nn
import torch.optim as optim
import time

# ROCm uses the CUDA API through HIP translation
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA/HIP backend available: {torch.cuda.is_available()}")
print(f"HIP runtime: {torch.version.hip}")
print(f"GPU count: {torch.cuda.device_count()}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")

    device = torch.device("cuda")

    # Define a CNN model
    model = nn.Sequential(
        nn.Conv2d(3, 32, 3, padding=1),
        nn.ReLU(),
        nn.MaxPool2d(2),
        nn.Conv2d(32, 64, 3, padding=1),
        nn.ReLU(),
        nn.MaxPool2d(2),
        nn.Flatten(),
        nn.Linear(64 * 8 * 8, 256),
        nn.ReLU(),
        nn.Linear(256, 10)
    ).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Synthetic training data (batch of 64 images, 3x32x32)
    batch_size = 64
    x = torch.randn(batch_size, 3, 32, 32, device=device)
    y = torch.randint(0, 10, (batch_size,), device=device)

    # Training loop
    model.train()
    start = time.time()
    for epoch in range(20):
        optimizer.zero_grad()
        output = model(x)
        loss = criterion(output, y)
        loss.backward()
        optimizer.step()

        if (epoch + 1) % 5 == 0:
            print(f"Epoch {epoch+1}/20, Loss: {loss.item():.4f}")

    elapsed = time.time() - start
    print(f"\nTraining time: {elapsed:.2f}s")
    print(f"GPU memory used: {torch.cuda.memory_allocated(0) / 1024**2:.1f} MB")
else:
    print("No GPU detected!")
EOF

# Run training on AMD GPU
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --ipc=host \
  --shm-size 8G \
  --security-opt seccomp=unconfined \
  --group-add keep-groups \
  -v /tmp/rocm-demo:/workspace:Z \
  rocm/pytorch:latest \
  python3 /workspace/train_model.py
```

## Building Custom ROCm Container Images

```bash
cat > /tmp/rocm-demo/Containerfile << 'EOF'
FROM rocm/dev-ubuntu-22.04:latest

# Install additional development tools
RUN apt-get update && apt-get install -y \
    python3-pip \
    cmake \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for GPU computing
RUN pip3 install --no-cache-dir \
    numpy \
    matplotlib \
    scipy

# Set up ROCm environment
ENV ROCM_PATH=/opt/rocm
ENV PATH=$ROCM_PATH/bin:$ROCM_PATH/hip/bin:$PATH
ENV LD_LIBRARY_PATH=$ROCM_PATH/lib:$LD_LIBRARY_PATH

WORKDIR /app

CMD ["bash"]
EOF

# Build the custom image
podman build -t my-rocm-dev:latest -f /tmp/rocm-demo/Containerfile /tmp/rocm-demo/
```

## ROCm Profiling in Containers

```bash
# Use rocprof for profiling HIP applications
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --security-opt seccomp=unconfined \
  --group-add keep-groups \
  -v /tmp/rocm-demo:/workspace:Z \
  rocm/dev-ubuntu-22.04:latest \
  bash -c "cd /workspace && hipcc -o vector_add vector_add.hip.cpp && \
           rocprof --stats ./vector_add"

# Collect an HSA-level trace
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --security-opt seccomp=unconfined \
  --group-add keep-groups \
  -v /tmp/rocm-demo:/workspace:Z \
  rocm/dev-ubuntu-22.04:latest \
  bash -c "cd /workspace && hipcc -o vector_add vector_add.hip.cpp && \
           rocprof --hsa-trace ./vector_add"
```

## Environment Variables for ROCm

```bash
# Useful ROCm environment variables
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --security-opt seccomp=unconfined \
  --group-add keep-groups \
  -e HIP_VISIBLE_DEVICES=0 \
  -e ROCR_VISIBLE_DEVICES=0 \
  -e GPU_MAX_HEAP_SIZE=100 \
  -e GPU_SINGLE_ALLOC_PERCENT=100 \
  rocm/dev-ubuntu-22.04:latest \
  rocminfo

# HIP_VISIBLE_DEVICES: Controls which GPUs are visible (like CUDA_VISIBLE_DEVICES)
# ROCR_VISIBLE_DEVICES: Controls which GPU indices or UUIDs the ROCr runtime exposes
# GPU_MAX_HEAP_SIZE: Maximum heap size as percentage of total memory
# GPU_SINGLE_ALLOC_PERCENT: Maximum single allocation as percentage of total memory
```

## Troubleshooting

```bash
# Check ROCm installation inside the container
podman run --rm -it \
  --device /dev/kfd:/dev/kfd \
  --device /dev/dri:/dev/dri \
  --security-opt seccomp=unconfined \
  --group-add keep-groups \
  rocm/dev-ubuntu-22.04:latest \
  bash -c "hipconfig --full && echo '---' && hipcc --version"

# Permission issues with /dev/kfd
# Verify device permissions on the host
ls -la /dev/kfd
# Should be: crw-rw---- 1 root render ...

# On SELinux systems with Podman, allow containers to use passed-through GPU devices
sudo setsebool -P container_use_devices=true

# Check kernel messages for GPU errors
dmesg | grep -i "amdgpu\|kfd" | tail -20
```

## Conclusion

ROCm in Podman containers provides a powerful open-source GPU computing environment that is easy to set up and reproduce. The HIP programming model offers near-identical syntax to CUDA, making it accessible to developers familiar with NVIDIA's ecosystem. With pre-built container images for popular frameworks like PyTorch and TensorFlow, you can get GPU-accelerated workloads running on AMD hardware quickly. The combination of Podman's daemonless, rootless-capable model and ROCm's open-source stack gives you a secure, transparent, and high-performance computing environment.
