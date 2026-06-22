# Validation Summary: How to Set Up Steam and Proton for Gaming on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Steam for Linux
- Steam Play
- Proton
- Proton-GE
- NVIDIA, AMD, and Intel Linux graphics drivers
- Vulkan, Mesa RADV, DXVK, VKD3D, and WineD3D
- GameMode
- MangoHud
- Gamescope
- Steam Input and Linux game controller drivers
- Protontricks

## Sources Consulted
- Valve Steam for Linux launcher repository: https://repo.steampowered.com/steam/
- Valve Proton README and runtime configuration documentation: https://github.com/ValveSoftware/Proton
- Valve Proton changelog for logging behavior: https://github.com/ValveSoftware/Proton/wiki/Changelog
- GloriousEggroll Proton-GE installation documentation and releases: https://github.com/GloriousEggroll/proton-ge-custom
- Flathub Steam package page: https://flathub.org/apps/com.valvesoftware.Steam
- MangoHud README and manpage: https://github.com/flightlessmango/MangoHud and https://www.mankier.com/1/mangohud
- GameMode README: https://github.com/FeralInteractive/gamemode
- xpadneo README: https://github.com/atar-axis/xpadneo
- Ubuntu package metadata checked locally with `apt-cache policy` on Ubuntu 24.04 for `steam`, `steam-installer`, `mangohud`, `gamescope`, `gamemode`, `mesa-vulkan-drivers`, `mesa-utils`, `protontricks`, and related packages.

## Issues Found
- The Steam `.deb` download used a CDN URL and filename that did not match Valve's documented Ubuntu launcher package. Changed it to `https://repo.steampowered.com/steam/steam_latest.deb` and updated the install command accordingly.
- The Ubuntu APT install snippet implied i386 support was automatic. Added explicit `multiverse` and `i386` setup before installing Steam.
- The NVIDIA PPA was described as an official NVIDIA PPA. Changed the wording to the Ubuntu Graphics Drivers PPA.
- The AMD section recommended installing `amdvlk` from Ubuntu repositories for older GCN GPUs. That package was not available in the checked Ubuntu 24.04 repository set, and Mesa RADV is the normal default. Replaced the command with a caveat that AMDVLK is optional.
- `glxinfo` was used without installing the package that provides it. Added `mesa-utils`.
- The stable Proton example was stale. Updated the example from Proton 9.0 to Proton 10.0.
- The manual Proton-GE install used a hardcoded old GE-Proton release. Replaced it with commands that fetch the latest release tarball from the GitHub API.
- The launch options included unsupported or misleading variables: `PROTON_VERSION`, `DXVK_ASYNC`, `PROTON_USE_WINED3D=0`, and `PROTON_NO_ESYNC=0`/`PROTON_NO_FSYNC=0`. Replaced them with supported guidance and troubleshooting-oriented examples.
- Proton logging paths were incorrect. Updated Proton log references from `/tmp/proton_$USER/` to `~/steam-APPID.log`.
- The GameMode install comment incorrectly mentioned a GNOME Shell extension. Removed that claim.
- The AMD ACO shader compiler advice used the obsolete `RADV_PERFTEST=aco` recommendation. Replaced it with a note that ACO is the default on current Mesa.
- The xpadneo prerequisites were incomplete. Added `linux-headers-$(uname -r)` and `bluez`.
- The PlayStation controller section recommended `pip install ds4drv`, which is not generally needed for Steam and is problematic on current Ubuntu Python installations. Replaced it with Steam's built-in support guidance.
- The MangoHud installation recommended an external PPA even though Ubuntu packages MangoHud. Changed the primary install command to `sudo apt install mangohud`.
- The MangoHud config heredoc used a quoted delimiter, leaving `$USER` unexpanded in `output_folder`. Changed it so the path expands when the command is run.
- The Gamescope install command assumed `gamescope` is available on all Ubuntu releases. Added an `apt-cache policy gamescope` check before installation.
- The Gamescope and MangoHud combination examples used unsupported normal MangoHud wrapping. Replaced them with Gamescope's MangoApp integration.
- The best-practices summary repeated stale `DXVK_ASYNC` and unsupported Gamescope/MangoHud launch options. Updated those examples.
- Protontricks installation via plain `pip install` was replaced with Ubuntu repository installation as the non-Flatpak alternative.

## Review Notes
Several recommendations remain hardware-, driver-, desktop-session-, and game-specific, especially NVIDIA X11 composition settings, Gamescope HDR, FSR, and Proton-GE usage. They are now presented with narrower caveats, but readers should still check ProtonDB and project release notes for individual games.
