# Validation Summary: How to Configure PipeWire for Low-Latency Audio on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- PipeWire
- WirePlumber
- ALSA
- JACK compatibility
- Linux real-time scheduling and kernels
- CPU frequency governor tuning

## Sources Consulted
- PipeWire configuration reference: https://docs.pipewire.org/page_config_xref.html
- PipeWire daemon manual and runtime settings: https://docs.pipewire.org/page_man_pipewire_1.html
- PipeWire RT module documentation: https://docs.pipewire.org/page_module_rt.html
- WirePlumber 0.5 configuration fragments and rules: https://lira.epac.to/DOCS/wireplumber/html/daemon/configuration/modifying_configuration.html
- WirePlumber 0.5 migration notes from Lua configuration: https://lira.epac.to/DOCS/wireplumber/html/daemon/configuration/migration.html
- WirePlumber ALSA configuration reference: https://lira.epac.to/DOCS/wireplumber/html/daemon/configuration/alsa.html
- Ubuntu Real-time documentation: https://documentation.ubuntu.com/real-time/latest/how-to/enable-real-time-ubuntu/
- Ubuntu package metadata checked locally with `apt-cache` for `pipewire-audio-client-libraries`, `pipewire-jack`, `pipewire-bin`, `linux-lowlatency`, `ubuntu-realtime`, `jackd2`, and `cpufrequtils`.

## Issues Found
- The prerequisites told readers to install development packages for normal low-latency usage. Replaced this with `pipewire-alsa` and `pipewire-jack`, which match the JACK compatibility use case described later in the post.
- The default quantum statement was too broad. Updated it to reflect the upstream PipeWire default quantum of 1024 and the role of min/max runtime limits.
- The real-time kernel install example used `linux-realtime` as the real-time Ubuntu path. Updated it to use `ubuntu-realtime`, which is the documented Ubuntu metapackage for Real-time Ubuntu, while keeping `linux-lowlatency` for the low-latency kernel.
- The PipeWire real-time configuration example set `core.daemon` and `context.spa-libs`, which do not configure real-time priority. Replaced it with `module.rt.args` using `rt.prio` and Ubuntu-friendly RTKit/Realtime Portal fallback settings.
- The WirePlumber configuration used the old `~/.config/wireplumber/main.lua.d/*.lua` format. WirePlumber 0.5 no longer supports Lua configuration fragments, so the example was converted to `~/.config/wireplumber/wireplumber.conf.d/*.conf` using `monitor.alsa.rules` and `actions.update-props`.
- The latency measurement command installed the nonexistent Ubuntu package `jack2` and launched a standalone JACK daemon, which does not demonstrate PipeWire's JACK compatibility. Updated it to install `pipewire-jack jackd2` and run `jack_iodelay` through PipeWire JACK.

## Review Notes
The corrected post is technically valid for current Ubuntu systems using PipeWire and WirePlumber 0.5. Some advice remains hardware-dependent: very low quantum values, disabling ALSA batch handling, and forcing the performance governor may improve latency on some systems but can increase CPU usage or cause xruns on others.
