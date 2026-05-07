# How to Use CUDA in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CUDA, Podman, NVIDIA, GPU Computing, Deep Learning, Container

Description: Learn how to set up and use NVIDIA CUDA inside Podman containers for GPU-accelerated computing, including building custom CUDA images and running real-world workloads.

---

> CUDA in Podman containers brings the full power of NVIDIA GPU programming into reproducible, portable environments that work the same way on every machine.

CUDA (Compute Unified Device Architecture) is NVIDIA's parallel computing platform and programming model. It allows developers to use NVIDIA GPUs for general-purpose computing with dramatic performance gains. Running CUDA workloads inside Podman containers ensures that your CUDA applications, along with all their dependencies and specific library versions, are packaged into reproducible units. This guide covers setting up CUDA in Podman, choosing the right base images, building custom CUDA containers, and running practical compute workloads.

---

## Understanding CUDA Container Architecture

When running CUDA inside a container, the architecture consists of three layers:

1. **Host NVIDIA Driver** - Installed on the host OS, provides the kernel-mode driver
2. **Container Toolkit / CDI** - Maps GPU devices and user-mode driver components into the container
3. **CUDA Toolkit in Container** - The CUDA libraries, compilers, and runtime inside the container image

The host driver version determines the maximum CUDA version you can use. The CUDA toolkit version inside the container must be compatible with the host driver.

```bash
# Check your host driver version and maximum supported CUDA version

nvidia-smi
# Look for "CUDA Version: 12.x" in the top-right corner
# This is the CUDA driver API version supported by the driver, not the CUDA Toolkit version installed in the container
```

## Setting Up CUDA Support

### Install Prerequisites

```bash
# Install the NVIDIA Container Toolkit and generate CDI specs
sudo dnf install -y nvidia-container-toolkit   # Fedora/RHEL
# or
sudo apt-get install -y nvidia-container-toolkit  # Ubuntu/Debian

# Generate CDI specification
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml

# Verify
nvidia-ctk cdi list
```

### CUDA Container Image Tiers

NVIDIA provides three tiers of CUDA images, each building on the previous:

```bash
# base: Minimal CUDA runtime (libcudart only)
# Size: ~120 MB - Use for running pre-compiled CUDA binaries
podman pull nvidia/cuda:12.3.0-base-ubuntu22.04

# runtime: base + CUDA math libraries (cuBLAS, cuFFT, cuRAND, cuSOLVER, cuSPARSE) + NCCL
# Size: ~1.4 GB - Use for running applications that need CUDA math libraries
podman pull nvidia/cuda:12.3.0-runtime-ubuntu22.04

# devel: runtime + nvcc compiler + headers + static libraries
# Size: ~3.6 GB - Use for compiling CUDA code from source
podman pull nvidia/cuda:12.3.0-devel-ubuntu22.04
```

## Compiling and Running CUDA Code

### A Simple CUDA Program

```bash
# Create a CUDA source file
mkdir -p /tmp/cuda-demo
cat > /tmp/cuda-demo/vector_add.cu << 'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <cuda_runtime.h>

// CUDA kernel for vector addition
__global__ void vectorAdd(const float *a, const float *b, float *c, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        c[idx] = a[idx] + b[idx];
    }
}

int main() {
    const int N = 1000000;
    size_t size = N * sizeof(float);

    // Print GPU info
    int deviceCount;
    cudaGetDeviceCount(&deviceCount);
    printf("CUDA devices found: %d\n", deviceCount);

    cudaDeviceProp prop;
    cudaGetDeviceProperties(&prop, 0);
    printf("GPU: %s\n", prop.name);
    printf("Compute capability: %d.%d\n", prop.major, prop.minor);
    printf("Total global memory: %.1f GB\n", prop.totalGlobalMem / 1073741824.0);

    // Allocate host memory
    float *h_a = (float*)malloc(size);
    float *h_b = (float*)malloc(size);
    float *h_c = (float*)malloc(size);

    // Initialize input vectors
    for (int i = 0; i < N; i++) {
        h_a[i] = i * 1.0f;
        h_b[i] = i * 2.0f;
    }

    // Allocate device memory
    float *d_a, *d_b, *d_c;
    cudaMalloc(&d_a, size);
    cudaMalloc(&d_b, size);
    cudaMalloc(&d_c, size);

    // Copy data to device
    cudaMemcpy(d_a, h_a, size, cudaMemcpyHostToDevice);
    cudaMemcpy(d_b, h_b, size, cudaMemcpyHostToDevice);

    // Launch kernel with 256 threads per block
    int threadsPerBlock = 256;
    int blocksPerGrid = (N + threadsPerBlock - 1) / threadsPerBlock;
    printf("Launching kernel: %d blocks x %d threads\n", blocksPerGrid, threadsPerBlock);

    vectorAdd<<<blocksPerGrid, threadsPerBlock>>>(d_a, d_b, d_c, N);

    // Copy result back to host
    cudaMemcpy(h_c, d_c, size, cudaMemcpyDeviceToHost);

    // Verify result
    int errors = 0;
    for (int i = 0; i < N; i++) {
        if (h_c[i] != h_a[i] + h_b[i]) errors++;
    }
    printf("Result: %s (%d errors out of %d elements)\n",
           errors == 0 ? "PASS" : "FAIL", errors, N);

    // Cleanup
    cudaFree(d_a); cudaFree(d_b); cudaFree(d_c);
    free(h_a); free(h_b); free(h_c);

    return 0;
}
EOF

# Compile and run inside a CUDA devel container
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -v /tmp/cuda-demo:/workspace:Z \
  nvidia/cuda:12.3.0-devel-ubuntu22.04 \
  bash -c "cd /workspace && nvcc -o vector_add vector_add.cu && ./vector_add"
```

## Building Custom CUDA Container Images

### Containerfile for a CUDA Application

```bash
# Create a Containerfile for a custom CUDA application
cat > /tmp/cuda-demo/Containerfile << 'EOF'
# Use the devel image for building
FROM nvidia/cuda:12.3.0-devel-ubuntu22.04 AS builder

WORKDIR /app
COPY vector_add.cu .

# Compile the CUDA application
# -O2 for optimization, specify compute capability for your GPU
RUN nvcc -O2 \
    -gencode arch=compute_70,code=sm_70 \
    -gencode arch=compute_80,code=sm_80 \
    -gencode arch=compute_86,code=sm_86 \
    -gencode arch=compute_89,code=sm_89 \
    -gencode arch=compute_90,code=sm_90 \
    -o vector_add vector_add.cu

# Use the smaller runtime image for the final container
FROM nvidia/cuda:12.3.0-runtime-ubuntu22.04

WORKDIR /app
COPY --from=builder /app/vector_add .

CMD ["./vector_add"]
EOF

# Build the image with Podman
podman build -t my-cuda-app:latest -f /tmp/cuda-demo/Containerfile /tmp/cuda-demo/

# Run the compiled application
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  my-cuda-app:latest
```

### Containerfile for Python CUDA Applications

```bash
cat > /tmp/cuda-demo/Containerfile.python << 'EOF'
FROM nvidia/cuda:12.3.0-runtime-ubuntu22.04

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install CUDA-accelerated Python packages
RUN pip3 install --no-cache-dir \
    numpy \
    cupy-cuda12x \
    torch --index-url https://download.pytorch.org/whl/cu121

WORKDIR /app

CMD ["python3"]
EOF

# Build the Python CUDA image
podman build -t cuda-python:latest -f /tmp/cuda-demo/Containerfile.python /tmp/cuda-demo/
```

## Running CUDA with CuPy (NumPy on GPU)

```bash
# Create a CuPy benchmark script
cat > /tmp/cuda-demo/cupy_bench.py << 'EOF'
import cupy as cp
import numpy as np
import time

print(f"CuPy version: {cp.__version__}")
print(f"CUDA version: {cp.cuda.runtime.runtimeGetVersion()}")

device = cp.cuda.Device(0)
props = cp.cuda.runtime.getDeviceProperties(device.id)
print(f"GPU: {props['name'].decode()}")
print(f"GPU Memory: {device.mem_info[1] / 1024**3:.1f} GB total")

# Matrix multiplication benchmark: CPU vs GPU
sizes = [1000, 2000, 4000]

for n in sizes:
    # CPU benchmark with NumPy
    a_cpu = np.random.randn(n, n).astype(np.float32)
    b_cpu = np.random.randn(n, n).astype(np.float32)

    start = time.time()
    c_cpu = np.matmul(a_cpu, b_cpu)
    cpu_time = time.time() - start

    # GPU benchmark with CuPy
    a_gpu = cp.asarray(a_cpu)
    b_gpu = cp.asarray(b_cpu)

    # Warm-up run
    c_gpu = cp.matmul(a_gpu, b_gpu)
    cp.cuda.Stream.null.synchronize()

    start = time.time()
    c_gpu = cp.matmul(a_gpu, b_gpu)
    cp.cuda.Stream.null.synchronize()
    gpu_time = time.time() - start

    speedup = cpu_time / gpu_time
    print(f"\nMatrix size {n}x{n}:")
    print(f"  CPU (NumPy): {cpu_time:.4f}s")
    print(f"  GPU (CuPy):  {gpu_time:.4f}s")
    print(f"  Speedup:     {speedup:.1f}x")
EOF

# Run the benchmark
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -v /tmp/cuda-demo:/workspace:Z \
  cuda-python:latest \
  python3 /workspace/cupy_bench.py
```

## CUDA Memory Management in Containers

When running CUDA containers, understanding memory limits is important:

```bash
# Check available GPU memory from inside a container
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi --query-gpu=memory.total,memory.used,memory.free --format=csv

# Limit which GPUs are visible to CUDA applications
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -e CUDA_VISIBLE_DEVICES=0 \
  nvidia/cuda:12.3.0-runtime-ubuntu22.04 \
  nvidia-smi
```

## CUDA Version Compatibility

The host driver version determines which CUDA versions you can use in containers:

```bash
# Check driver and CUDA compatibility
nvidia-smi | head -3

# CUDA 12.3 images normally require a driver from the 545 branch or newer.
# CUDA minor-version compatibility can allow CUDA 12.x applications to run on
# older 525+ drivers, but newer toolkit features may still require a newer driver.

# You can run older CUDA versions with newer drivers (backward compatible)
# For example, with driver 545.x:
podman run --rm --device nvidia.com/gpu=all --security-opt=label=disable nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
podman run --rm --device nvidia.com/gpu=all --security-opt=label=disable nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
podman run --rm --device nvidia.com/gpu=all --security-opt=label=disable nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi
# All three will work due to backward compatibility
```

## CUDA Debugging in Containers

```bash
# Enable CUDA error checking
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -e CUDA_LAUNCH_BLOCKING=1 \
  nvidia/cuda:12.3.0-devel-ubuntu22.04 \
  bash

# Inside the container, use Compute Sanitizer for memory debugging
# compute-sanitizer --tool memcheck ./my_cuda_app

# Enable synchronous launches and stable device ordering while debugging
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  -e CUDA_LAUNCH_BLOCKING=1 \
  -e CUDA_DEVICE_ORDER=PCI_BUS_ID \
  nvidia/cuda:12.3.0-devel-ubuntu22.04 \
  bash
```

## Running CUDA in Rootless Mode

Rootless Podman requires some additional setup for CUDA:

```bash
# Ensure your user is in the video group
sudo usermod -aG video $USER

# Generate CDI specs for rootless use
mkdir -p ~/.config/cdi
nvidia-ctk cdi generate --output=$HOME/.config/cdi/nvidia.yaml

# Run a CUDA container rootless
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi
```

## Troubleshooting CUDA in Containers

```bash
# Error: "CUDA driver version is insufficient for CUDA runtime version"
# Your host driver is too old for the CUDA version in the container
# Solution: Use an older CUDA image or update the host driver
nvidia-smi  # Check your driver version

# Error: "no CUDA-capable device is detected"
# GPU devices are not passed through correctly
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  bash -c "ls -la /dev/nvidia* && nvidia-smi"

# Error: "CUDA out of memory"
# Check GPU memory usage from the host
nvidia-smi
# Another container or process may be using GPU memory

# Verify CUDA is functional with a simple test
podman run --rm -it \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.0-devel-ubuntu22.04 \
  bash -c 'cat > /tmp/test.cu << "INNER_EOF"
#include <stdio.h>
__global__ void hello() { printf("Hello from CUDA thread %d!\n", threadIdx.x); }
int main() { hello<<<1,8>>>(); cudaDeviceSynchronize(); return 0; }
INNER_EOF
nvcc -o /tmp/test /tmp/test.cu && /tmp/test'
```

## Conclusion

Using CUDA in Podman containers provides a clean separation between your CUDA applications and the host system while maintaining full GPU performance. The multi-tier CUDA images let you choose the right balance between image size and functionality, and multi-stage builds help you create optimized production images. With CDI support and rootless operation, Podman makes CUDA containerization both practical and secure. Whether you are developing CUDA kernels, running deep learning training, or deploying inference services, containerized CUDA gives you reproducibility and portability without sacrificing performance.
