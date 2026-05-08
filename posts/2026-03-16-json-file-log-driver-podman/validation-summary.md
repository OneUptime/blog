# Validation Summary: How to Use the json-file Log Driver with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman log drivers
- containers.conf
- Kubernetes CRI/k8s-file log format
- Shell commands
- awk
- Python
- Podman Compose / Compose logging configuration

## Sources Consulted
- Podman run reference, `--log-driver` and `--log-opt`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman inspect reference and inspect format behavior: https://docs.podman.io/en/v5.0.0/markdown/podman-inspect.1.html
- Podman container inspect example showing `.HostConfig.LogConfig`: https://docs.podman.io/en/v4.0.0/markdown/podman-container-inspect.1.html
- containers.conf reference from containers/common: https://raw.githubusercontent.com/containers/common/main/docs/containers.conf.5.md
- containers.conf manual entry for `log_size_max`: https://man.archlinux.org/man/containers.conf.5.en
- Kubernetes CRI API log stream and log tag definitions: https://pkg.go.dev/k8s.io/cri-api/pkg/apis/runtime/v1
- Compose specification, logging service attribute: https://compose-spec.github.io/compose-spec/spec.html#logging

## Issues Found
- The post incorrectly described Podman's `json-file` driver as writing Docker-compatible JSON objects. Podman documentation states that `json-file` is an alias for `k8s-file`; I updated the description, introduction, summary, and examples to describe the actual k8s-file/CRI-style format.
- The raw log example showed Docker JSON fields (`log`, `stream`, `time`). I replaced it with a Podman k8s-file style line containing timestamp, stream, tag, and message.
- The `jq` examples would not work against Podman's k8s-file output. I replaced them with `awk` examples that parse the timestamp, stream, tag, and message fields.
- The Python example attempted to parse each log line as JSON. I changed it to split k8s-file lines into four fields and analyze the message portion.
- The post described "log rotation" and searching across rotated files. Podman's documented `max-size` behavior is a size limit/truncation mechanism, and Docker's `max-file` option is not supported. I changed the section wording and examples to use "log size limits" and search the current log file.
- The `max-size` examples used `10m`/`50m`; Podman's documentation shows `mb` suffix examples. I changed these examples to `10mb` and `50mb`.

## Review Notes
The post is now technically accurate for current Podman behavior, but its title and tag still use `json-file`/JSON because the driver alias itself is named `json-file`. Readers should understand from the corrected text that this is a compatibility alias, not Docker JSON log output.
