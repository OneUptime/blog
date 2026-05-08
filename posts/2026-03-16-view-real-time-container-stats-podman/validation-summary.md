# Validation Summary: How to View Real-Time Container Stats in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux shell scripting
- Container monitoring
- Nginx container image
- Python container image

## Sources Consulted
- Podman official `podman-stats` documentation: https://docs.podman.io/en/stable/markdown/podman-stats.1.html
- Podman official `podman-run` documentation for port publishing: https://docs.podman.io/en/stable/markdown/podman-run.1.html

## Issues Found
- The load-test example started the nginx container without publishing port 80 and then generated load by running `curl` inside the nginx container. That example could fail because the host could not reach the container on `localhost:8080`, and the nginx image should not be assumed to include `curl`. Changed the `podman run` command to publish `8080:80` and changed the load generator to run `curl` from the host against `http://localhost:8080`.

## Review Notes
- The `podman stats` flags used in the post, including `--no-stream`, `--interval`, and `--format`, are current in the official Podman documentation.
- The Go template placeholders used in the examples, including `.Name`, `.CPUPerc`, `.MemPerc`, `.MemUsage`, `.NetIO`, `.BlockIO`, and `.PIDs`, are valid according to the official `podman-stats` documentation.
- Podman notes that rootless environments may not report network usage stats depending on the cgroup/networking setup. The post remains correct for the commands shown, but this caveat could be useful in a future enhancement.
