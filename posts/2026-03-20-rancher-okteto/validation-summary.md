# Validation Summary: How to Use Okteto with Rancher for Remote Development - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Okteto CLI
- Okteto manifest (`okteto.yml`)
- VS Code remote debugging
- Python development containers
- Frontend development containers

## Sources Consulted
- Okteto CLI reference: https://www.okteto.com/docs/reference/okteto-cli/
- Okteto manifest reference: https://www.okteto.com/docs/reference/okteto-manifest/
- Install the Okteto CLI: https://www.okteto.com/docs/get-started/install-okteto-cli/
- Okteto FAQs: https://www.okteto.com/docs/reference/faqs/
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Docker Official Image for Python: https://hub.docker.com/_/python
- Docker Official Image for Node: https://hub.docker.com/_/node/

## Issues Found
- The original context setup used `okteto context use https://rancher.example.com --token <api-token>` and `okteto context use --context rancher-production`. The official CLI supports `okteto context use <kube-context>` for Kubernetes contexts and `okteto context use <okteto-url> --token ...` for Okteto Platform URLs. I updated Step 2 to use valid syntax for both cases.
- The original manifest used unsupported `context` and `namespace` keys under `dev.backend`. The current manifest reference does not define those fields for a dev container. I removed them and kept context/namespace selection in CLI usage, where Okteto documents it.
- The original manifest used `volumes` to mount SSH keys with `/root/.ssh:/root/.ssh:ro`. In Okteto, `volumes` are for persistent volumes, not local bind mounts. I replaced this with supported file synchronization for the SSH directory and added `workdir: /app`.
- The original multi-service example used `python:3.11-dev`, which is not an official Python image tag. I replaced the service images with explicit placeholder dev images that match the article’s own development-image approach.
- The original frontend example only synchronized `src/` and `public/` while running `npm run dev` from `/app`, which omits files such as `package.json`. I changed the sync path to `./frontend:/app`.
- The original existing-deployment commands used invalid or incorrect flags: `okteto up --name backend` and `okteto down --keep-volumes`. The official CLI documents `okteto up [devContainer]` and `okteto down -v` for removing persistent volumes. I corrected Step 7 accordingly.
- The original remote-debugging example used a plain `python:3.11` image while invoking `debugpy` and `uvicorn`, and it only forwarded the debugger port. I updated the example to use a dev image placeholder and added the application port forward.
- The original cleanup section presented `okteto destroy` and `okteto logs` as general-purpose commands. The official CLI reference marks both as Platform-only. I kept them, but qualified them so the post is accurate for generic Rancher-managed Kubernetes clusters.
- The introduction described source code as being “mounted”. The current Okteto docs describe bidirectional file synchronization instead. I corrected that wording.

## Review Notes
- The updated `registry.example.com/...:dev-tools` images are still placeholders by design; they should be replaced with project-specific development images that contain the required runtime and tooling.
- `okteto destroy` and `okteto logs` remain valid only when the cluster is running Okteto Platform. For plain Kubernetes usage against a Rancher-managed cluster, the guide’s open-source-compatible flow is `okteto context use <kube-context>`, `okteto up`, `okteto down`, and `okteto status`.
- Node.js 18 is already End-of-Life as of March 27, 2025 per the Node.js release schedule, so avoiding `node:18-alpine` in an evergreen example is the safer choice.
