# Validation Summary: How to Import Docker Images from a Tar File in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker CLI
- Docker Engine API
- Bash
- `curl`
- `tar` / `gzip`
- `scp` / `rsync`

## Sources Consulted
- Portainer Docs: Import an image: https://docs.portainer.io/sts/user/docker/images/import
- Portainer Docs: Accessing the Portainer API: https://docs.portainer.io/sts/api/access
- Portainer Docs: API usage examples: https://docs.portainer.io/sts/api/examples
- Docker Docs: `docker image save`: https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: `docker image load`: https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs: Docker Engine API v1.24 (`POST /images/load` and image export behavior by ID): https://docs.docker.com/reference/api/engine/version/v1.24/
- GNU Tar manual: https://www.gnu.org/software/tar/manual/html_section/file.html

## Issues Found
- The post said `docker save <image-id>` "includes all tags". I corrected this to note that exporting by image ID does not preserve repository:tag names in the archive, which matches Docker's documented image export behavior.
- The Portainer UI import step described a generic browse/drag-and-drop flow and only listed `.tar` and `.tar.gz`. I corrected it to match Portainer's current documentation, which uses **Select file** and supports `.tar`, `.tar.gz`, `.tar.bz2`, and `.tar.xz`.
- The Portainer API example used `curl -F "file=@..."`, which sends `multipart/form-data`. Because Portainer's endpoint is a gateway to the Docker API and Docker's `POST /images/load` expects the tarball in the request body with `Content-Type: application/x-tar`, I changed the example to use `--data-binary` and the appropriate content type. I also updated the example URL to Portainer's documented HTTPS port `9443` instead of legacy HTTP `9000`.
- The "Image Tar File Considerations" section overstated tag behavior by implying tar files always include all tags for an image. I corrected the wording to say that `docker load` restores the tags present in the archive. I also fixed the tar inspection example from `tar -t` to `tar -tf -`, since `tar` should be given an explicit archive file when reading from standard input.

## Review Notes
- The post is technically relevant and valid after the corrections above.
- Portainer's docs note that in multi-node environments an imported image is only available on the selected node. The post does not mention this, but I did not expand the article beyond the minimum necessary technical fixes.
- The Docker and Portainer commands used in the post remain current as of the review date, but sample image tags in bundle examples may need periodic re-checking over time if tag availability changes upstream.
