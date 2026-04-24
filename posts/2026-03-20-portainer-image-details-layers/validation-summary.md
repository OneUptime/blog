# Validation Summary: How to View Image Details and Layers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine / Docker CLI
- Docker images and Dockerfile layers
- OCI image metadata / annotation keys
- `dive`
- `jq`

## Sources Consulted
- Portainer Images documentation: https://docs.portainer.io/user/docker/images
- Docker CLI `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI `docker image inspect` reference: https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker CLI `docker image history` reference: https://docs.docker.com/reference/cli/docker/image/history/
- Docker image layers and metadata behavior: https://docs.docker.com/engine/storage/drivers/
- Dockerfile concepts overview: https://docs.docker.com/build/concepts/dockerfile/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile
- Docker annotations guidance: https://docs.docker.com/build/building/annotations/
- `dive` README and usage documentation: https://github.com/wagoodman/dive

## Issues Found
1. **Overstated layer model in the introduction and Step 3.** The post said each Dockerfile instruction corresponds to a layer. Docker's documentation distinguishes filesystem-changing instructions from metadata-only instructions such as `CMD` and `LABEL`. Updated the wording to clarify that only filesystem-changing instructions create actual layers.
2. **Portainer UI fields were stated too definitively.** Portainer's official docs document the Images view and its core metadata, but do not enumerate every field on the image detail page. Softened the wording so architecture, OS, and labels are described as fields that commonly appear depending on Portainer version and environment.
3. **Invalid Dockerfile `CMD` example.** `CMD ["nginx", "-g", ...]` is not valid exec-form JSON syntax. Replaced it with `CMD ["nginx", "-g", "daemon off;"]`.
4. **The `dive` example was mislabeled as an install step.** The command shown runs `dive` in a container; it does not install the tool locally. Updated the comment to match the actual behavior.
5. **Docker labels were conflated with OCI annotations.** The example uses OCI annotation keys such as `org.opencontainers.image.created` as image labels. Revised the explanation so it reflects Docker's distinction between labels and OCI annotation keys.
6. **Layer-count comparison used `docker history -q | wc -l`, which counts history entries rather than actual filesystem layers.** Replaced it with `docker image inspect ... --format '{{len .RootFS.Layers}}'`.
7. **Large-layer detection command would not sort by size correctly.** `docker history --human myapp:latest | sort -h` sorts entire lines, not the size column. Replaced it with a formatted `docker image history --format '{{.Size}}\t{{.CreatedBy}}'` pipeline so the size field is sorted correctly.
8. **Image-config checks were described too narrowly as layer inspection.** Tightened the wording around env-var and package checks so the section accurately describes broader image inspection, and narrowed the package command to Alpine/Debian-based images.

## Review Notes
- The `docker inspect` examples are valid for images, but exact outputs such as timestamps, labels, architectures, and layer counts vary by image tag, platform, and publish date.
- Portainer's docs cover the Images section and list metadata fields, but not every detail-pane field; the revised wording avoids making version-specific UI guarantees that aren't documented.
- The workspace did not have the `docker` CLI installed, so command validation was done against current official documentation rather than live local execution.
