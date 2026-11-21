# Fix kube-bench Version Mapping and Config Directory Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Troubleshooting

Description: Repair incomplete kube-bench binary installations by restoring matching configuration files, separating config paths, and validating benchmark selection.

The kube-bench executable starts, but the scan stops with a message that the configuration is missing `version_mapping`. Reinstalling the same executable usually does not help. The program also needs its configuration and benchmark control files, and it must load the correct ones.

Three locations matter: the binary, the global configuration file, and the configuration directory containing benchmark subdirectories. They can be installed in different places. A working `kube-bench version` command confirms the executable runs; it does not prove that those other files are available.

This guide pins kube-bench **v0.14.0**. The installation example is for an authorized **Linux amd64** Kubernetes node. The illustrative scan uses Kubernetes **1.32** and the `node` target; replace those choices according to the actual node and distribution, not merely to suppress an error.

## Understand the required file tree

A complete extracted release contains the executable and a `cfg` tree resembling this:

```text
kube-bench
cfg/
  config.yaml
  cis-1.11/
    config.yaml
    node.yaml
    master.yaml
    ...
  ...
```

The global `cfg/config.yaml` contains mappings and component discovery settings. `version_mapping` associates Kubernetes versions with benchmark versions. `target_mapping` defines targets available for each benchmark. The benchmark subdirectory contains check definitions and optional version-specific configuration overrides.

These files are not embedded into the executable. The project's [v0.14.0 release configuration](https://github.com/aquasecurity/kube-bench/blob/v0.14.0/.goreleaser.yml) includes the `cfg` files in archives and installs package configuration beneath `/etc/kube-bench/cfg`. Keep the tree with the same release as the binary rather than downloading a random `config.yaml` from the current development branch.

## Distinguish the two configuration flags

`--config` identifies the global configuration **file**. `--config-dir` identifies the **directory** containing benchmark subdirectories. Setting one is not equivalent to setting both.

For example, this is a coherent pair:

```bash
--config /opt/kube-bench-0.14.0/cfg/config.yaml \
--config-dir /opt/kube-bench-0.14.0/cfg
```

This block shows arguments to append to a command, not a standalone shell command. The [tagged installation guide](https://github.com/aquasecurity/kube-bench/blob/v0.14.0/docs/installation.md) uses both options for a manual archive installation.

Do not point `--config` at `cfg/cis-1.11/config.yaml`. That file is an override, not the complete global configuration. Likewise, `--config-dir` should not point at `cfg/cis-1.11`: the program appends the selected benchmark directory when locating controls.

The help text's default path can be misleading when comparing source builds and packaged binaries. The release build sets the configuration-directory default at build time. Use explicit absolute paths when investigating a manual installation, especially when a service, cron job, or `sudo` invocation changes the working environment. The [configuration initialization source](https://github.com/aquasecurity/kube-bench/blob/v0.14.0/cmd/root.go) shows how the flags are loaded.

## Extract and verify one complete release

Use an empty staging directory owned by the administrator performing the installation. The following downloads the Linux amd64 archive and its published checksum list:

```bash
release=0.14.0
archive="kube-bench_${release}_linux_amd64.tar.gz"
base="https://github.com/aquasecurity/kube-bench/releases/download/v${release}"
curl -fsSLO "$base/$archive"
curl -fsSLO "$base/kube-bench_${release}_checksums.txt"
awk -v file="$archive" '$2 == file {print}' \
  "kube-bench_${release}_checksums.txt" > selected-checksum.txt
test -s selected-checksum.txt
sha256sum -c selected-checksum.txt
```

Proceed only if checksum verification succeeds. This compares the archive with the published release checksum; it is not independent signature verification. Use the [official release assets](https://github.com/aquasecurity/kube-bench/releases/tag/v0.14.0) and your organization's artifact-verification policy. ARM nodes require the matching architecture archive instead.

Extract into a new directory, then inspect the files:

```bash
mkdir kube-bench-0.14.0
tar -xzf kube-bench_0.14.0_linux_amd64.tar.gz -C kube-bench-0.14.0
cd kube-bench-0.14.0
./kube-bench version
test -r cfg/config.yaml
test -r cfg/cis-1.11/node.yaml
```

The version command should report `0.14.0`. The two file checks are silent on success and return a nonzero status if the expected file is unreadable. They establish presence, not YAML correctness or benchmark suitability.

Keep the directory intact when promoting it to your managed installation location. If you copy only `kube-bench` into `/usr/local/bin`, either retain the matching tree elsewhere and provide explicit paths or use a package that installs both components. Do not overwrite a shared older configuration tree while other audit jobs still use it.

## Match the error to the missing layer

| Error or observation | Likely layer to inspect |
|---|---|
| Global file cannot be read | Incorrect path, permissions, or malformed YAML |
| Missing `version_mapping` | Wrong or incomplete global configuration |
| Missing `target_mapping` | Global configuration lacks benchmark target definitions |
| Target file such as `node.yaml` not found | Wrong directory root or incomplete benchmark tree |
| Unable to detect Kubernetes version | Node discovery or host visibility, after configuration is checked |
| Requested target is not configured | Target does not belong to the selected benchmark |

The exact missing-mapping checks appear in [common.go](https://github.com/aquasecurity/kube-bench/blob/v0.14.0/cmd/common.go). The explicit `run` command validates targets and locates their files through the configuration directory in [run.go](https://github.com/aquasecurity/kube-bench/blob/v0.14.0/cmd/run.go).

For a useful diagnostic record, save the exact command, current directory, binary version, global file path, configuration-directory path, and error output. Avoid editing multiple layers at once. A correct global file with an empty configuration directory can pass mapping selection and still fail when the control file is loaded.

```mermaid
flowchart LR
    A[Matching release binary and cfg tree] --> B[Load global config file]
    B --> C[Resolve benchmark and targets]
    C --> D[Find controls under config directory]
    D --> E[Inspect actual node evidence]
    E --> F[Review findings and coverage]
```

## Run with explicit paths after confirming the node version

On the authorized Linux node, from the complete extracted directory, this example runs the node checks using the documented Kubernetes 1.32 mapping:

```bash
bundle_dir="$PWD"
./kube-bench run --targets node --version 1.32 \
  --config "$bundle_dir/cfg/config.yaml" \
  --config-dir "$bundle_dir/cfg"
```

This is a real scan command, not a configuration-only validator. Use it only after confirming the node version and benchmark choice. The tagged [global configuration](https://github.com/aquasecurity/kube-bench/blob/v0.14.0/cfg/config.yaml) maps 1.32 to `cis-1.11`.

`--version` means the Kubernetes version used for benchmark selection; it does not print the kube-bench program version. The `version` subcommand serves that separate purpose. `--benchmark` selects a benchmark directly, and the program rejects specifying it together with `--version`.

Choosing `--benchmark cis-1.11` does not replace the global configuration or control files. It can avoid the version-mapping lookup while still failing on missing target mappings or missing YAML. Do not use it to conceal an incomplete installation or claim that an unsupported node now matches an arbitrary benchmark.

## Preserve configuration as part of the audit artifact

Once the scan starts, configuration discovery is only the first successful stage. Host paths, process visibility, permissions, and platform support still determine whether the checks can observe meaningful evidence. A scan run from an administrator laptop is not an audit of a remote node merely because kubectl has a cluster context.

Record the binary version, selected benchmark, exact arguments, configuration checksums, and node identity with the report. Preserve local overrides separately from the original release tree so future investigators can explain why two runs differ.

For this article, the official Darwin arm64 release binary reproduced missing version mapping, missing target mapping, and missing control-file errors. A deliberate invalid-target probe with the complete tree reached target validation, confirming the earlier loading stages. Both Linux amd64 and Darwin archive checksums and included configuration files were checked. No Linux node compliance scan was performed.
