# Validation Summary: How to Use Image Factory Schematics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos Image Factory
- Image Factory schematics
- Talos system extensions
- talosctl
- Bash, curl, jq, yq, yamllint

## Sources Consulted
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.7/learn-more/image-factory.md
- Current Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/image-factory.md
- Talos CLI reference for `talosctl gen config` and `talosctl upgrade`: https://docs.siderolabs.com/talos/v1.7/reference/cli.md
- Talos system extension resource documentation: https://www.talos.dev/v1.0/talos-guides/configuration/system-extensions/
- Talos META network configuration documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/bare-metal-platforms/metal-network-configuration.md
- Talos Image Factory official extension API: https://factory.talos.dev/version/v1.7.0/extensions/official
- Talos source for `ExtensionStatus` resource shape: https://github.com/siderolabs/talos/blob/v1.7.7/pkg/machinery/resources/runtime/extension_status.go

## Issues Found
- The post implied that every Image Factory asset contains every schematic customization. Talos documentation states that `installer` and `initramfs` assets support only system extensions, while kernel args and META are ignored for those assets. Updated the wording to clarify that customizations apply where the asset type supports them.
- The "Full schematic structure" wording was too broad because official schematics also support an optional `overlay` top-level field. Updated the text and comment to describe the shown YAML as common `customization` fields.
- The VMware extension name `siderolabs/vmtoolsd` is not valid in the Talos v1.7.0 official extension catalog. Changed it to `siderolabs/vmtoolsd-guest-agent`.
- The CI example generated invalid environment variable names for schematic filenames containing hyphens, such as `gpu-nodes.yaml`. Added an `env_name` conversion that maps lowercase and hyphens to uppercase and underscores.
- The deployed schematic comparison used `talosctl get machinestatus` and a non-documented `.spec.status.schematicId` path. Talos Image Factory documents the schematic ID as a virtual `schematic` system extension. Updated the command to read it from `talosctl get extensions -o yaml`.
- The extension validation command used non-raw `yq` output and a regex `grep` match. Updated it to `yq -r` and `grep -Fxq` for exact literal extension-name matching.

## Review Notes
- The post uses Talos v1.7.0 in examples. Those examples are valid for that version, but v1.7 is older than the current Talos documentation stream. Future revisions may want to update the example version consistently.
