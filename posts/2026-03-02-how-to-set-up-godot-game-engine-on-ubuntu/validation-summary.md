# Validation Summary: How to Set Up Godot Game Engine on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Godot Engine 4 (4.2.2-stable used as the example version)
- Ubuntu 20.04 / 22.04
- GDScript
- Flatpak / snap packaging
- Vulkan and OpenGL (Compatibility) renderers
- Git version control
- Godot export pipeline (Linux desktop, Web)
- Godot Asset Library API

## Sources Consulted
- Godot 4 Renderers docs: https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html
- Godot 4 Exporting for Web: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- Godot Compiling for Web (source of emscripten requirement): https://docs.godotengine.org/en/stable/engine_details/development/compiling/compiling_for_web.html
- Godot Exporting Projects (templates path): https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html
- GitHub Godot.gitignore (.godot/ vs .import/): https://github.com/github/gitignore/blob/main/Godot.gitignore
- Godot Asset Library API: https://github.com/godotengine/godot-asset-library/blob/master/API.md
- Godot GitHub releases: https://github.com/godotengine/godot/releases
- Snapcraft Godot 4 package: https://snapcraft.io/godot-4
- Linux export rename to "Linux" in 4.3: https://github.com/godotengine/godot/issues/89012

## Issues Found

1. **"2D" renderer option in New Project dialog (incorrect).**
   - Original: "Select '2D' as the renderer (or 'Mobile' for simpler 2D projects)".
   - Godot 4's New Project dialog offers only three renderers: Forward+, Mobile, and Compatibility. There is no "2D" renderer option (2D is a project type concept, not a renderer).
   - Fixed by changing the 2D project step to recommend the "Compatibility" renderer (OpenGL 3.3) and clarifying the renderer descriptions in the 3D section.

2. **Web export preset name (incorrect for Godot 4).**
   - Original: `godot --headless --export-release "HTML5" ...`
   - In Godot 4 the preset was renamed from "HTML5" (Godot 3.x) to "Web". The CLI argument must match the preset name.
   - Fixed by changing the preset to `"Web"` and renaming the section heading from "Export for Web (HTML5/WebGL)" to "Export for Web".

3. **emscripten requirement for Web export (incorrect).**
   - Original: `sudo apt install -y emscripten # Web export requires additional setup`.
   - Emscripten is only required when compiling the Godot Web export template from source. The official prebuilt Web templates that the editor downloads contain compiled WASM/JS, so end users do not need emscripten on their system to export to web.
   - Fixed by removing the `apt install emscripten` step and adding a short clarifying comment explaining when emscripten actually is needed.

4. **`.gitignore` missing `.godot/` folder (Godot 3 vs Godot 4).**
   - Original ignore list included only `.import/`, which was the Godot 3.x import-cache folder.
   - Godot 4 stores imported asset metadata in `.godot/` (per the official `github/gitignore` repo). Omitting it would cause large auto-generated caches to be committed.
   - Fixed by adding a `# Godot 4+ specific ignores` block with `.godot/` at the top of the ignore list. Kept `.import/` for users with older project history.

## Review Notes

- **Linux export preset name is version-sensitive.** The post uses `"Linux/X11"` in the headless export command. This is correct for Godot 4.0–4.2.x (the post pins 4.2.2-stable as the example), but the preset was renamed to just `"Linux"` in Godot 4.3 (godotengine/godot#89012). Readers who follow the post's advice to "Check https://godotengine.org/download/linux/ for the latest version" and download Godot 4.3+ will need to use `"Linux"` instead. Not changed because it is correct for the example version pinned in the post.
- The GDScript player snippet (`CharacterBody2D`, `Input.get_axis`, `move_and_slide()` without arguments, `velocity` property) is correct Godot 4 API. None of the deprecated Godot 3 patterns (`KinematicBody2D`, `move_and_slide(velocity, ...)`) are present.
- `--rendering-driver opengl3` is a valid Godot 4 flag (other accepted values include `vulkan`, `d3d12`, `metal`).
- The snap package `godot-4` exists and is published by Snapcrafters; a separate `godot4` (no dash) package also exists.
- The download URL `https://github.com/godotengine/godot/releases/download/4.2.2-stable/Godot_v4.2.2-stable_linux.x86_64.zip` is the correct release asset path.
- The export templates path `~/.local/share/godot/export_templates/<version>/` is correct.
- The Asset Library API base URL and query parameters (`page`, `filter`) are correct per the official API doc.
- Minor nit (not changed): the `nvidia-driver-535` package is a specific version; users should generally use `ubuntu-drivers autoinstall` or whichever recommended NVIDIA driver matches their GPU and kernel. The post already qualifies it with "or current version", which is acceptable guidance.
