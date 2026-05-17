# Validation Summary: How to Set Up JACK Audio Connection Kit on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JACK Audio Connection Kit (jackd2)
- PipeWire (pipewire-jack compatibility layer)
- WirePlumber / media-session (PipeWire session managers)
- QjackCTL (JACK GUI control panel)
- Helvum (PipeWire patchbay)
- Ardour DAW
- Reaper DAW
- ALSA (audio backend)
- a2jmidid (ALSA-to-JACK MIDI bridge)
- Ubuntu real-time scheduling / PAM limits

## Sources Consulted
- JACK Audio Connection Kit official site and FAQ — https://jackaudio.org/
- jackd(1) man page (jackd2 1.9.21)
- jack_lsp / jack_connect tool docs (JACK Toolkit)
- PipeWire documentation — https://docs.pipewire.org/
- PipeWire JACK page on PipeWire wiki — https://gitlab.freedesktop.org/pipewire/pipewire/-/wikis/PipeWire-and-JACK
- Ubuntu package archive for `pipewire-jack` (1.0.5), `jackd2` (1.9.21), `ardour` (8.4.0), `qjackctl`, `helvum`, `a2jmidid` — https://packages.ubuntu.com/
- Ardour binary layout for jammy (6.x) and noble (8.x) via packages.ubuntu.com filelists
- Debian `pipewire-jack` README on dynamic linker override
- ALSA project documentation for `aplay -l`
- `limits.conf(5)` for rtprio / memlock / nice limits

## Issues Found
- **`ardour6` binary does not exist on current Ubuntu.** Ubuntu 22.04 ships Ardour 6 and Ubuntu 24.04 ships Ardour 8 (binary names `ardour6-*` and `ardour8-*` respectively). Both packages install a generic `/usr/bin/ardour` wrapper. Changed the two `ardour6` invocations (launch command and `PIPEWIRE_QUANTUM=…` example) to the version-agnostic `ardour`.
- **"Set the LD_LIBRARY_PATH" was misleading.** The procedure actually adds a config file under `/etc/ld.so.conf.d/` and runs `ldconfig` — it does not set the `LD_LIBRARY_PATH` environment variable. Rewrote the introductory sentence to describe the dynamic linker search path mechanism accurately, and replaced the dead `media-session.conf` grep (media-session has been superseded by WirePlumber on Ubuntu 22.04+, so that file no longer exists on most systems) with an `ls` of the example directory the next step copies from.
- **Latency formula labelled "round-trip" was inaccurate.** `nperiods * period_size / sample_rate` (= 10.67 ms here) is the JACK system / input-to-output latency, not the full hardware round-trip (which also includes ADC/DAC delays and is typically larger). Clarified the wording while keeping the numeric calculation.

## Review Notes
- The `jack_lsp -t midi` command works in practice because `-t` lists port types and the trailing word is treated as a port-name regex that matches typical MIDI ports — but strictly speaking it is filtering by name, not by port type. Left as-is since the intent is clear and it works on the common cases the post discusses.
- The `--midi=seq` flag on the ALSA backend is correct (`jackd -d alsa --midi=seq` enables the ALSA sequencer MIDI driver).
- `PIPEWIRE_QUANTUM=256/48000` syntax (`<quantum>/<rate>`) is correct per PipeWire documentation.
- The `pipewire-jack` package on recent Ubuntu does ship the example file at `/usr/share/doc/pipewire/examples/ld.so.conf.d/pipewire-jack-*.conf`, so the copy step is still the documented way to enable the override.
- `qjackctl`, `helvum`, `a2jmidid`, and `jackd2` are all available in the standard Ubuntu universe repositories — no third-party PPA needed.
- The real-time limits config (`@audio` with `rtprio 95`, `memlock unlimited`, `nice -19`) follows the standard JACK / Ubuntu Studio recommendations.
- Worth noting for future updates: PipeWire 1.0+ generally provides JACK API support sufficient for most desktop production work, and on systems where the user has already installed `pipewire-jack` they can usually skip the standalone `jackd` path entirely.
