# Validation Summary: How to Pass USB Devices to a Podman Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- QEMU-backed virtual machines
- USB device passthrough
- Linux device files and udev
- Arduino CLI

## Sources Consulted
- Podman Machine documentation: https://docs.podman.io/en/latest/markdown/podman-machine.1.html
- Podman Machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman Machine set documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman run documentation for `--device`, `--group-add keep-groups`, and volume mounts: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Arduino CLI upload documentation: https://arduino.github.io/arduino-cli/1.2/commands/arduino-cli_upload/

## Issues Found
- The post advised manually editing QEMU launch arguments for USB passthrough. Current Podman documentation provides supported `podman machine init --usb ...` and `podman machine set --usb ...` options for QEMU machines, so the section was updated to use those commands.
- The post described volume mounts as an alternative way to expose device files to the machine. Podman volume mounts are for host directories and do not replace USB passthrough for USB device nodes, so the section was corrected to describe checking device files after passthrough is configured.
- The post implied privileged containers could help with host-to-VM USB passthrough on macOS and Windows. Privileged mode only affects container access to devices already visible inside the VM, so a clarification was added and the summary was corrected.
- The Linux rootless device examples did not mention that group-only device permissions can fail inside rootless containers. A `--group-add keep-groups` example was added based on the Podman run documentation.
- The troubleshooting note for reconnected devices implied udev rules solve device disappearance at the VM passthrough layer. It was narrowed to stable paths inside the VM and now recommends vendor/product-based `--usb` over bus/device-number passthrough when appropriate.

## Review Notes
The post is technically relevant and useful after correction. USB passthrough support is provider-specific: Podman's documented `--usb` option is for QEMU machines, so users on non-QEMU providers may need a different machine provider or a native Linux setup.
