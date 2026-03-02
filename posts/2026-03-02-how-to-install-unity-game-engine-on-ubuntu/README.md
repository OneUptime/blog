# How to Install Unity Game Engine on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Unity, Game Development, Development Tools

Description: Install Unity Hub and the Unity Editor on Ubuntu for game development, configure the development environment, and set up project templates for 2D and 3D game projects.

---

Unity supports Linux development environments, though the experience is slightly different from Windows or macOS. The recommended approach uses Unity Hub, which manages multiple Unity Editor versions and projects. This guide covers getting Unity running on Ubuntu 20.04 and 22.04.

## System Requirements

Before installing, check your system meets Unity's requirements:

- Ubuntu 20.04 or 22.04 LTS (64-bit)
- CPU: x86-64 architecture with SSE2 instruction set support
- GPU: Graphics card with DX10 (shader model 4.0) or equivalent OpenGL 3.2+
- RAM: 8GB minimum, 16GB recommended for larger projects
- Storage: At least 10GB for the Unity Editor, more for project assets

```bash
# Check your CPU capabilities
grep -m 1 flags /proc/cpuinfo | grep -o 'sse2'

# Check GPU information
lspci | grep -E "VGA|3D|Display"

# Verify you are running 64-bit Ubuntu
uname -m
# Should output: x86_64
```

## Installing Required Dependencies

Unity requires several system libraries:

```bash
sudo apt update

# Install required libraries
sudo apt install -y \
  libgconf-2-4 \
  libgconf2-4 \
  libasound2 \
  libgtk2.0-0 \
  libgtk-3-0 \
  libgles2 \
  libcurl4 \
  xdg-utils \
  libpangocairo-1.0-0 \
  libgdk-pixbuf2.0-0 \
  libcairo-gobject2 \
  libcairo2

# For GPU acceleration (recommended)
sudo apt install -y \
  libgl1-mesa-glx \
  libgl1-mesa-dri \
  mesa-utils
```

## Installing Unity Hub

Unity Hub is the application manager for Unity. Download and install it from Unity's official repository:

```bash
# Add the Unity repository key
wget -qO - https://hub.unity3d.com/linux/keys/public | \
  sudo gpg --dearmor -o /usr/share/keyrings/Unity_Technologies_ApS.gpg

# Add the Unity repository
sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/Unity_Technologies_ApS.gpg] \
  https://hub.unity3d.com/linux/repos/deb stable main" \
  > /etc/apt/sources.list.d/unityhub.list'

# Update and install Unity Hub
sudo apt update
sudo apt install -y unityhub

# Verify installation
unityhub --version
```

## Launching Unity Hub

Start Unity Hub from the applications menu or terminal:

```bash
unityhub &
```

On first launch, Unity Hub prompts you to sign in with a Unity account. Create one at unity.com if you do not have one. A free Personal license covers independent development and use by developers earning under $100,000 annually.

## Activating a License

After signing in:

1. Click on the profile icon in the top right
2. Select "Manage Licenses"
3. Click "Add License"
4. Choose "Get a free Personal license" for individual use
5. Agree to the terms and activate

## Installing the Unity Editor

With Unity Hub set up, install an Editor version:

1. Click "Installs" in the left sidebar
2. Click "Install Editor"
3. Select a version - the latest LTS (Long Term Support) release is recommended for stability
4. Select the modules to install:
   - **Linux Build Support (Mono)**: Required to build Linux games
   - **Linux Build Support (IL2CPP)**: For optimized Linux builds
   - **WebGL Build Support**: For browser-based games
   - **Android Build Support**: If targeting Android
   - **Documentation**: Offline docs (optional)

Click "Install" and wait for the download to complete. The editor is about 3-5GB.

### Installing via Command Line

Unity Hub supports command-line installation, useful for CI/CD:

```bash
# List available Unity Editor versions
unityhub --headless editors --releases

# Install a specific version (replace VERSION with actual version number)
unityhub --headless install \
  --version 2022.3.20f1 \
  --changeset 0e25a174756c \
  --module linux-il2cpp \
  --module webgl

# Find the changeset ID on Unity's download archive
# https://unity.com/releases/editor/archive
```

## Creating Your First Project

In Unity Hub:

1. Click "New project" or "Projects > New project"
2. Select a template:
   - **2D Core**: For 2D games using the universal render pipeline
   - **3D Core**: Standard 3D template
   - **High Definition RP**: For photorealistic 3D (GPU-intensive)
   - **Universal RP**: Scalable graphics for various platforms
3. Set the project name and location
4. Click "Create project"

Unity will set up the project and launch the Editor. Initial compilation of the project takes a few minutes.

## Setting Up the Development Environment

### Configuring the Code Editor

Unity works best with a code editor that understands C# and Unity APIs. Visual Studio Code is well-supported on Ubuntu:

```bash
# Install Visual Studio Code
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/microsoft.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] \
  https://packages.microsoft.com/repos/vscode stable main" | \
  sudo tee /etc/apt/sources.list.d/vscode.list

sudo apt update
sudo apt install -y code

# Install the C# extension in VS Code
code --install-extension ms-dotnettools.csharp
```

In Unity, set VS Code as the external editor:

1. Go to Edit > Preferences
2. Select "External Tools"
3. Set "External Script Editor" to "Visual Studio Code"
4. Click "Regenerate project files"

### Installing .NET SDK for C# Development

Unity uses C# for scripting. The .NET SDK improves IntelliSense and debugging:

```bash
# Install .NET SDK
wget https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-7.0

# Verify
dotnet --version
```

## Running Unity from the Command Line

Unity can be launched without the Hub for scripted operations:

```bash
# Find the Unity Editor binary (version-specific path)
ls ~/.local/share/unityhub/

# Launch Unity with a specific project
/home/user/Unity/Hub/Editor/2022.3.20f1/Editor/Unity \
  -projectPath /home/user/Projects/MyGame

# Run Unity in batch mode (for CI/CD builds)
/home/user/Unity/Hub/Editor/2022.3.20f1/Editor/Unity \
  -batchmode \
  -nographics \
  -quit \
  -projectPath /home/user/Projects/MyGame \
  -buildLinux64Player /output/MyGame \
  -logFile /tmp/unity-build.log
```

## Building a Game for Linux

From within the Unity Editor:

1. Go to File > Build Settings
2. Select "Linux" as the platform
3. Click "Switch Platform" if not already on Linux
4. Set the Target Architecture to x86_64
5. Click "Build" and choose an output directory

For command-line builds in CI:

```bash
#!/bin/bash
# build.sh - Build script for Unity project

UNITY_PATH="/home/user/Unity/Hub/Editor/2022.3.20f1/Editor/Unity"
PROJECT_PATH="/home/user/Projects/MyGame"
BUILD_PATH="/home/user/builds/MyGame"

"$UNITY_PATH" \
  -batchmode \
  -nographics \
  -quit \
  -projectPath "$PROJECT_PATH" \
  -buildLinux64Player "$BUILD_PATH/MyGame.x86_64" \
  -logFile /tmp/unity-build.log

BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
    echo "Build succeeded"
else
    echo "Build failed - check /tmp/unity-build.log"
    cat /tmp/unity-build.log | tail -50
fi

exit $BUILD_RESULT
```

## Troubleshooting Common Issues

**Unity Hub fails to start**: Check for missing dependencies:

```bash
# Check for errors
journalctl -xe | grep unityhub

# Try running with verbose output
unityhub --verbose
```

**Graphics errors or black screen**: Install or update GPU drivers:

```bash
# For Intel graphics
sudo apt install -y intel-media-va-driver mesa-va-drivers

# For NVIDIA (install appropriate driver for your GPU)
ubuntu-drivers devices
sudo ubuntu-drivers autoinstall

# Test OpenGL support
glxinfo | grep "OpenGL version"
```

**Missing libc++ errors**:

```bash
sudo apt install -y libc++1 libc++abi1
```

**Unity Editor crashes on startup**: Try launching with software rendering:

```bash
# Launch with Mesa software rendering (slow but bypasses GPU issues)
LIBGL_ALWAYS_SOFTWARE=1 unityhub
```

Unity on Ubuntu is fully functional for game development, though some platform-specific features work better on Windows. For most 2D and 3D game projects targeting PC, mobile, or web platforms, Ubuntu provides a capable development environment with the added benefit of native Linux build support.
