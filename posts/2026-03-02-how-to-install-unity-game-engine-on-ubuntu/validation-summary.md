# Validation Summary: How to Install Unity Game Engine on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Unity Hub (Linux)
- Unity Editor (2022.3 LTS referenced)
- Ubuntu 20.04 / 22.04 LTS
- APT package manager
- Visual Studio Code (with C# extension)
- .NET SDK
- Unity Editor CLI (batch mode builds)
- Unity Hub CLI (`--headless` install)

## Sources Consulted
- Unity Hub Linux install documentation — https://docs.unity.com/en-us/hub/install-hub-linux
- Unity Hub CLI reference — https://docs.unity.com/en-us/hub/hub-cli
- Unity Editor command-line arguments — https://docs.unity3d.com/2022.3/Documentation/Manual/EditorCommandLineArguments.html
- Unity pricing/license tier eligibility — https://unity.com/products/pricing-updates
- Unity Support: Personal license eligibility — https://support.unity.com/hc/en-us/articles/28114350573460
- Ubuntu jammy package archive — https://packages.ubuntu.com/jammy/ (libgconf-2-4, libgl1-mesa-glx)
- Microsoft .NET support policy — https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
- endoflife.date for .NET — https://endoflife.date/dotnet
- Unity release archive — https://unity.com/releases/editor/archive

## Issues Found

1. **Unity Personal license revenue threshold was outdated.** Post stated "$100,000 annually" — Unity raised the Personal tier threshold to **$200,000** in the 2023 pricing updates and that figure remains current. Updated to $200,000.

2. **2D Core template described as URP-based.** Post said *"2D Core: For 2D games using the universal render pipeline"*. In Unity Hub, **2D Core** uses the **built-in render pipeline**; the URP-based 2D template is a separate "Universal 2D" / "2D (URP)" template. Corrected to "built-in render pipeline".

3. **Non-existent package `libgconf2-4` in the dependency list.** Only `libgconf-2-4` exists as a real Ubuntu package; `libgconf2-4` is not a valid package name and would cause `apt install` to fail. Removed the bogus duplicate line.

4. **`.NET SDK 7.0` recommendation is outdated.** .NET 7.0 reached end-of-support on **May 14, 2024** (STS release). Updated to `dotnet-sdk-8.0` (LTS) which is the current widely-available LTS on Microsoft's Ubuntu package feed.

## Review Notes

- The `libgconf-2-4` package is legacy and will not exist on **Ubuntu 24.04 (noble)** — it was kept in the post because the post scopes itself to 20.04 / 22.04 where it is still available. A future revision targeting 24.04+ should drop it.
- Similarly, `libgl1-mesa-glx` is a transitional dummy package on 22.04 (just pulls in `libgl1`) and was removed in 24.04. Left as-is for now since the post targets 20.04/22.04.
- `.NET 8.0 LTS` reaches end-of-support on **November 10, 2026**. After that date, the recommended replacement is `dotnet-sdk-10.0` (LTS, supported through Nov 2028). Worth revisiting later in 2026.
- The Unity Hub CLI invocation pattern shown (`unityhub --headless …`) works, though Unity's docs also document an alternative `unityhub -- --headless …` form using `--` as a separator from Hub's own flags. Either typically works; left unchanged.
- All Unity Editor CLI arguments used (`-batchmode`, `-nographics`, `-quit`, `-projectPath`, `-buildLinux64Player`, `-logFile`) are valid per the official Editor command-line reference.
- The APT key handling, signed-by sources entry, and VS Code/Microsoft repo setup are all syntactically correct and follow the modern (post-`apt-key`) pattern.
