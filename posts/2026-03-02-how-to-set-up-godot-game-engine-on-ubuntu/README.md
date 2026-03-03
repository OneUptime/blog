# How to Set Up Godot Game Engine on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Godot, Game Development, Development Tools

Description: Install and configure the Godot game engine on Ubuntu, set up a 2D or 3D project, export games for Linux and other platforms, and integrate with version control.

---

Godot is a fully open-source game engine with strong 2D capabilities and a growing 3D feature set. Unlike Unity or Unreal, Godot has no licensing fees, no royalties, and the engine itself is small enough to be stored in version control alongside your project. It runs well on Ubuntu and its native Linux support is first-class.

## System Requirements

Godot 4 runs on modest hardware:

- Ubuntu 20.04 or 22.04 (64-bit)
- CPU: x86-64 with SSE4.2 support (Godot 4), any x86-64 (Godot 3)
- GPU: Vulkan 1.0 capable (Godot 4), OpenGL 3.3 (Godot 4 Compatibility mode), OpenGL 2.1 (Godot 3)
- RAM: 4GB minimum, 8GB+ for larger projects
- Storage: Under 100MB for the engine itself

```bash
# Check Vulkan support (for Godot 4)
sudo apt install -y vulkan-tools
vulkaninfo 2>/dev/null | grep "deviceName"

# Check OpenGL support (fallback for older GPUs)
sudo apt install -y mesa-utils
glxinfo | grep "OpenGL version"
```

## Downloading Godot

Godot is distributed as a single executable - no installation needed. Download from the official website or use the Flatpak version:

### Option 1: Direct Download

```bash
# Download Godot 4 (stable) from the official site
# Check https://godotengine.org/download/linux/ for the latest version

wget https://github.com/godotengine/godot/releases/download/4.2.2-stable/Godot_v4.2.2-stable_linux.x86_64.zip

# Extract the archive
unzip Godot_v4.2.2-stable_linux.x86_64.zip

# Make executable and move to a convenient location
chmod +x Godot_v4.2.2-stable_linux.x86_64
sudo mv Godot_v4.2.2-stable_linux.x86_64 /usr/local/bin/godot

# Verify it works
godot --version
```

### Option 2: Flatpak (Recommended for Easy Updates)

```bash
# Install Flatpak if not already installed
sudo apt install -y flatpak

# Add the Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Godot via Flatpak
flatpak install flathub org.godotengine.Godot

# Run Godot
flatpak run org.godotengine.Godot
```

### Option 3: snap

```bash
sudo snap install godot-4

# Run
godot-4
```

## Creating a Desktop Launcher

If you used the direct download, create a desktop entry:

```bash
# Download or create a Godot icon
wget https://godotengine.org/assets/press/icon_color.svg \
  -O /home/$USER/.local/share/icons/godot.svg

# Create desktop entry
cat > /home/$USER/.local/share/applications/godot.desktop << 'EOF'
[Desktop Entry]
Name=Godot Engine
Comment=Open source 2D and 3D game engine
Exec=/usr/local/bin/godot %F
Icon=godot
Terminal=false
Type=Application
Categories=Development;IDE;
MimeType=application/x-godot-project;
EOF

update-desktop-database ~/.local/share/applications/
```

## Starting Godot and Creating a Project

Launch Godot to open the Project Manager:

```bash
godot
```

The Project Manager shows your existing projects and lets you create new ones.

### Creating a 2D Project

1. Click "New Project"
2. Enter a project name
3. Choose a project path
4. Select "2D" as the renderer (or "Mobile" for simpler 2D projects)
5. Click "Create & Edit"

The Godot editor opens with the default scene.

### Creating a 3D Project

For 3D games:

1. Click "New Project"
2. Select "Forward+" renderer (Vulkan, best quality) or "Mobile" (lighter, compatible with more hardware)
3. Click "Create & Edit"

## Understanding Godot's Scene System

Godot organizes everything as scenes containing nodes. A scene might be:

- A single game character (CharacterBody2D with Sprite2D and CollisionShape2D children)
- A complete game level
- A user interface screen

Nodes are the building blocks. Common node types:

```text
Node2D
├── Sprite2D (displays a texture)
├── CollisionShape2D (defines collision boundaries)
├── AnimationPlayer (handles animations)
└── Area2D (detects overlaps)
```

## Writing Your First Script

Godot uses GDScript (similar to Python) as its primary scripting language. It also supports C# and GDNative (C/C++).

Create a simple character script:

```gdscript
# player.gd - Simple 2D player movement script
extends CharacterBody2D

# Movement constants
const SPEED = 300.0
const JUMP_VELOCITY = -400.0

# Get the gravity from the project settings
var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta):
    # Add gravity
    if not is_on_floor():
        velocity.y += gravity * delta

    # Handle jump input
    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = JUMP_VELOCITY

    # Handle horizontal movement
    var direction = Input.get_axis("ui_left", "ui_right")
    if direction != 0:
        velocity.x = direction * SPEED
    else:
        # Decelerate smoothly
        velocity.x = move_toward(velocity.x, 0, SPEED)

    # Apply movement
    move_and_slide()
```

Attach this script to a CharacterBody2D node by clicking the script icon in the Inspector, then selecting "New Script".

## Setting Up Git Version Control

Godot projects work well with Git. Configure a proper `.gitignore`:

```bash
cd /path/to/your/godot/project

git init

# Create a .gitignore for Godot
cat > .gitignore << 'EOF'
# Godot-specific ignores
.import/
export.cfg
export_presets.cfg

# Imported translations
*.translation

# Mono-specific ignores
.mono/
data_*/
mono_crash.*.json

# System files
.DS_Store
Thumbs.db
EOF

git add .
git commit -m "Initial Godot project"
```

Godot stores project settings in `project.godot` (text format), scene files as `.tscn` (text format), and scripts as plain `.gd` or `.cs` files. This makes diffs readable and merges manageable.

## Configuring Godot for Linux Development

### Setting Up Vulkan

For the best Godot 4 performance on Ubuntu, ensure Vulkan is configured:

```bash
# Install Vulkan runtime libraries
sudo apt install -y libvulkan1 mesa-vulkan-drivers

# For NVIDIA GPUs
sudo apt install -y nvidia-driver-535  # or current version

# For AMD GPUs (usually covered by mesa-vulkan-drivers)
sudo apt install -y vulkan-tools

# Test Vulkan
vulkaninfo | head -20
```

### Troubleshooting GPU Issues

If Godot 4 crashes with Vulkan, use the OpenGL compatibility renderer:

```bash
# Launch Godot with the OpenGL Compatibility renderer
godot --rendering-driver opengl3

# Or set it in Project Settings > Rendering > Renderer > Rendering Method to "gl_compatibility"
```

## Exporting Your Game

Godot can export games to multiple platforms from Ubuntu.

### Installing Export Templates

Export templates must be downloaded before you can build releases:

1. In the Godot editor, go to Editor > Manage Export Templates
2. Click "Download and Install" for the current version
3. Wait for the download to complete

Templates are stored in `~/.local/share/godot/export_templates/`.

### Exporting a Linux Build

1. Go to Project > Export
2. Click "Add..." and select "Linux/X11"
3. Configure the export path and binary name
4. Click "Export Project"

For command-line exports:

```bash
# Export a Linux build from the command line
godot --headless --export-release "Linux/X11" /path/to/output/mygame.x86_64 \
  --path /path/to/project

# List available export presets
godot --headless --export-list --path /path/to/project
```

### Export for Web (HTML5/WebGL)

```bash
# Web export requires additional setup
sudo apt install -y emscripten

# Export to WebGL
godot --headless --export-release "HTML5" /path/to/output/index.html \
  --path /path/to/project
```

## Performance Profiling

Godot includes a built-in profiler:

1. Run your game with the editor open (press F5)
2. Click the "Profiler" tab in the bottom dock
3. Click "Start" to begin profiling
4. Interact with your game to generate data
5. Click "Stop" to view results

The profiler shows which functions take the most time, helping identify performance bottlenecks.

## Extending Godot with Plugins and Add-ons

The Godot Asset Library provides community add-ons:

```bash
# Access the Asset Library from inside Godot:
# Click "AssetLib" tab at the top of the editor
```

For command-line downloads:

```bash
# Download an asset from the Asset Library API
curl "https://godotengine.org/asset-library/api/asset?page=0&filter=platformer" | \
  python3 -m json.tool | grep '"title"'
```

## Keeping Godot Updated

For the direct download approach:

```bash
# Check current version
godot --version

# Download and replace the binary with the new version
wget https://github.com/godotengine/godot/releases/download/NEW_VERSION/Godot_vNEW_VERSION_linux.x86_64.zip
unzip Godot_vNEW_VERSION_linux.x86_64.zip
sudo mv Godot_vNEW_VERSION_linux.x86_64 /usr/local/bin/godot
sudo chmod +x /usr/local/bin/godot
```

For Flatpak:

```bash
flatpak update org.godotengine.Godot
```

Godot is an excellent choice for game development on Ubuntu, particularly for 2D games where its tooling is mature and well-regarded. The lack of licensing costs and the small engine footprint make it practical for both solo developers and small teams.
