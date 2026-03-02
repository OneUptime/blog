# How to Install and Configure Vulkan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Vulkan, GPU, Graphics, Gaming

Description: Complete guide to installing and configuring the Vulkan graphics API on Ubuntu for both NVIDIA and AMD GPUs, including verification tools and running Vulkan applications.

---

Vulkan is a low-overhead, cross-platform graphics and compute API. Compared to OpenGL, Vulkan gives applications more direct control over the GPU, enabling better performance and more predictable behavior. On Ubuntu, installing Vulkan requires both the driver-level support (ICD - Installable Client Driver) and the runtime libraries. This guide covers the full setup for NVIDIA and AMD GPUs.

## Understanding the Vulkan Stack

Vulkan has several components:

- **Vulkan Loader**: The central dispatcher (`libvulkan.so.1`) that sits between your application and the GPU drivers
- **ICD (Installable Client Driver)**: The actual Vulkan implementation from GPU vendors (NVIDIA, AMD, Intel)
- **Vulkan Validation Layers**: Debug layers that catch API misuse during development
- **Vulkan Tools**: `vulkaninfo`, `vkvia` for verification

## Installing Vulkan Packages

### For NVIDIA GPUs

NVIDIA's Vulkan support is included in the proprietary driver. Install the driver and Vulkan headers:

```bash
# Install NVIDIA driver (if not already installed)
sudo apt-get update
sudo apt-get install -y nvidia-driver-545  # or latest recommended version

# Install Vulkan loader and NVIDIA ICD
sudo apt-get install -y libvulkan1 libvulkan-dev vulkan-tools

# NVIDIA ICD is typically installed with the driver at:
# /usr/share/vulkan/icd.d/nvidia_icd.json
ls /usr/share/vulkan/icd.d/
```

### For AMD GPUs

AMD's Vulkan support comes through the RADV driver (Mesa) for open-source, or the AMDVLK proprietary driver:

```bash
# RADV (Mesa Vulkan driver) - included in Mesa, most up-to-date
sudo apt-get install -y mesa-vulkan-drivers libvulkan1 vulkan-tools

# For 32-bit support (needed for Steam and Proton)
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install -y mesa-vulkan-drivers:i386 libvulkan1:i386

# AMDVLK (AMD's official open-source Vulkan driver)
# Download from https://github.com/GPUOpen-Drivers/AMDVLK/releases
wget https://github.com/GPUOpen-Drivers/AMDVLK/releases/download/v-2024.Q4.1/amdvlk_2024.Q4.1_amd64.deb
sudo dpkg -i amdvlk_2024.Q4.1_amd64.deb
```

### For Intel Integrated Graphics

```bash
# Intel Vulkan driver (ANV) is in Mesa
sudo apt-get install -y mesa-vulkan-drivers intel-media-va-driver libvulkan1
```

## Installing Vulkan Validation Layers and SDK

Validation layers are essential for development. The Vulkan SDK from LunarG provides a comprehensive package:

```bash
# Add LunarG repository
wget -qO- https://packages.lunarg.com/lunarg-signing-key-pub.asc | sudo tee /etc/apt/trusted.gpg.d/lunarg.asc
sudo wget -qO /etc/apt/sources.list.d/lunarg-vulkan-jammy.list http://packages.lunarg.com/vulkan/lunarg-vulkan-jammy.list

sudo apt-get update
sudo apt-get install -y vulkan-sdk

# Or install just the components you need
sudo apt-get install -y \
    libvulkan-dev \        # Development headers
    vulkan-tools \         # vulkaninfo, vkcube
    spirv-tools \          # SPIR-V shader tools
    glslang-tools \        # GLSL to SPIR-V compiler
    vulkan-validationlayers  # Validation layers
```

## Verifying the Vulkan Installation

```bash
# Run vulkaninfo to see full GPU capabilities
vulkaninfo

# Condensed summary view
vulkaninfo --summary

# Example output:
# Instance Version: 1.3.268
# GPU0:
#   apiVersion = 1.3.268
#   driverVersion = 535.161.7.0
#   vendorID = 0x10de
#   deviceID = 0x2206
#   deviceType = PHYSICAL_DEVICE_TYPE_DISCRETE_GPU
#   deviceName = NVIDIA GeForce RTX 3080
```

Run the demo cube:

```bash
# 3D spinning cube rendered with Vulkan
vkcube

# Offscreen rendering test
vkcube --c 100  # render 100 frames and exit
```

## Selecting the Active Vulkan ICD

If you have multiple GPUs or multiple ICDs installed, you can select which one to use:

```bash
# List available ICDs
ls /usr/share/vulkan/icd.d/
# Might show: nvidia_icd.json, radeon_icd.x86_64.json, amdvlk64.json, etc.

# Force a specific ICD via environment variable
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/radeon_icd.x86_64.json vulkaninfo --summary

# For AMD: choose between RADV (Mesa) and AMDVLK
# RADV is generally faster for gaming; AMDVLK may perform better for compute
VK_ICD_FILENAMES=/etc/vulkan/icd.d/amd_icd64.json vkcube  # AMDVLK
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/radeon_icd.x86_64.json vkcube  # RADV
```

## Setting Up Vulkan for Game Development

### Installing Development Dependencies

```bash
# Vulkan development headers and tools
sudo apt-get install -y \
    libvulkan-dev \
    glslang-dev \
    glslang-tools \
    libglm-dev \
    libglfw3-dev

# Compile a GLSL shader to SPIR-V
cat > shader.vert << 'EOF'
#version 450

layout(location = 0) out vec3 fragColor;

vec2 positions[3] = vec2[](
    vec2(0.0, -0.5),
    vec2(0.5, 0.5),
    vec2(-0.5, 0.5)
);

vec3 colors[3] = vec3[](
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0)
);

void main() {
    gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
    fragColor = colors[gl_VertexIndex];
}
EOF

# Compile to SPIR-V
glslangValidator -V shader.vert -o vert.spv
```

## Enabling Validation Layers During Development

```bash
# Enable validation layers via environment variable
VK_LOADER_DEBUG=all VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation ./your-vulkan-app

# Or in C/C++ code, enable them when creating the VkInstance:
# VkInstanceCreateInfo createInfo = {};
# const char* validationLayers[] = {"VK_LAYER_KHRONOS_validation"};
# createInfo.enabledLayerCount = 1;
# createInfo.ppEnabledLayerNames = validationLayers;
```

## Vulkan with DXVK and Wine for Windows Games

DXVK translates DirectX 11/12 calls to Vulkan, enabling Windows games to run on Linux:

```bash
# Install Wine and DXVK through Lutris or manually
sudo apt-get install -y wine64 wine32

# Install DXVK
curl -fsSL https://github.com/doitsujin/dxvk/releases/latest/download/dxvk-2.3.tar.gz | tar -xz
cd dxvk-2.3
./setup_dxvk.sh install --symlink

# Or use Proton (Steam's gaming layer) which includes DXVK
# Just enable Steam Play in Steam Settings -> Steam Play
```

## Performance Tuning

```bash
# Enable Radeon Performance Level (AMD only)
echo high | sudo tee /sys/class/drm/card0/device/power_dpm_force_performance_level

# For NVIDIA, enable maximum performance mode
sudo nvidia-smi --persistence-mode=1
sudo nvidia-smi --power-limit=350  # Set higher power limit

# Mesa-specific environment variables for AMD
AMD_VULKAN_ICD=RADV  # force RADV
RADV_PERFTEST=gpl    # enable graphics pipeline library (faster shader compilation)
```

## Troubleshooting

### vulkaninfo fails with "Cannot create Vulkan instance"

```bash
# Check that the loader finds ICDs
VK_LOADER_DEBUG=all vulkaninfo 2>&1 | head -50

# Verify ICD JSON files are valid
python3 -c "import json; json.load(open('/usr/share/vulkan/icd.d/nvidia_icd.json'))"

# Check library paths
ldconfig -p | grep libvulkan
```

### vkcube shows black screen

Usually a driver issue. Try:

```bash
# Force software rendering to confirm loader works
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json vkcube

# If software rendering works, the problem is in the GPU driver
# Reinstall the driver
sudo apt-get reinstall nvidia-driver-545
```

### Multiple GPU selection

```bash
# Select a specific GPU by index
DISPLAY=:0 vkcube  # uses first GPU

# In Vulkan code, enumerate all physical devices and select by properties
# vulkaninfo shows all available GPUs and their indices
```

Vulkan on Ubuntu is well-supported across all major GPU vendors. Once the ICD and loader are configured correctly, it provides a stable foundation for both gaming and GPU compute applications.
