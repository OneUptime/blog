# Validation Summary: How to Use Okteto with Rancher for Remote Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Okteto CLI
- Rancher (Kubernetes distribution)
- Kubernetes (kubectl, namespaces, services)
- VS Code (Remote - SSH extension)
- Node.js (npm, debugger port 9229)
- Homebrew (macOS install)

## Sources Consulted
- Okteto CLI install docs: https://www.okteto.com/docs/get-started/install-okteto-cli/
- Okteto manifest reference: https://www.okteto.com/docs/reference/okteto-manifest/
- Okteto `up` command reference: https://www.okteto.com/docs/reference/okteto-cli/#up
- Okteto `down` command reference: https://www.okteto.com/docs/reference/okteto-cli/#down
- Okteto official Docker Hub images (okteto/node, okteto/python, okteto/golang, etc.): https://hub.docker.com/u/okteto
- Existing internal post: posts/2026-02-09-okteto-cloud-kubernetes-dev/README.md (uses okteto/node:18 in the same context)
- Kubernetes DNS spec for in-cluster service resolution (`<svc>.<ns>.svc.cluster.local`)
- Node.js inspector default port reference (9229)

## Issues Found
1. **Non-existent dev image (`okteto/dev:latest`)** — The post used `image: okteto/dev:latest`, but Okteto does not publish a generic `okteto/dev` image on Docker Hub. Their official dev images are language-specific (`okteto/node`, `okteto/python`, `okteto/golang`, etc.). Since the example clearly uses npm/Node.js, I changed it to `okteto/node:18`, which matches the convention used in the sibling post `posts/2026-02-09-okteto-cloud-kubernetes-dev/README.md`. The inline comment was updated to reflect Node.js.
2. **Misleading `curl` against non-HTTP services** — The post used `curl http://postgres.databases.svc.cluster.local:5432` and `curl http://redis.cache.svc.cluster.local:6379` to demonstrate "direct DB access". PostgreSQL (5432) and Redis (6379) do not speak HTTP, so curl would either error or print binary garbage; the command does not perform actual DB or Redis operations. I changed both lines to use `nc -zv`, which is the standard way to test TCP reachability and matches the original intent (verifying that cluster services are reachable from the dev container).

## Review Notes
- The post uses the **legacy / v1 Okteto manifest format** (top-level `name`, `image`, `sync`, `forward`, etc.). This format is still accepted by the Okteto CLI, but newer guidance favors the v2 manifest, which nests dev configuration under a `dev:` key (see e.g. `okteto/docs` and the sibling post `2026-02-09-okteto-cloud-kubernetes-dev`). Not changed because the legacy format still functions correctly and the change would be stylistic restructuring rather than a fix.
- `brew install okteto` is correct for the Homebrew core formula. An alternative tap-based form (`brew install okteto/cli/okteto`) also exists, but the simpler form used here is fine.
- The Linux install pipe-to-shell command (`curl https://get.okteto.com -sSfL | sh`) matches Okteto's official quickstart.
- `okteto up --namespace <ns>` and `okteto down` are valid CLI invocations.
- The Node.js debugger port (9229) and the use of `DEBUG=*` are standard.
- The SSH-based VS Code workflow is a real and supported Okteto feature; the dev container exposes an SSH server and `okteto up` reports the SSH host details.
- Volumes `- /app/node_modules` correctly creates a persistent volume to cache `node_modules` across syncs in the legacy manifest.
