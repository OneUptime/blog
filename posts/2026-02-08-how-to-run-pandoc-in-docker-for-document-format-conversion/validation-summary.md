# Validation Summary: How to Run Pandoc in Docker for Document Format Conversion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Pandoc
- Pandoc Docker images
- LaTeX / TeX Live
- Markdown, HTML, PDF, EPUB, DOCX, RST, AsciiDoc
- Pandoc templates
- Pandoc filters
- Python
- Panflute
- Flask

## Sources Consulted
- Pandoc installation documentation: https://pandoc.org/installing.html
- Pandoc User's Guide: https://www.pandoc.org/demo/example2.html
- Pandoc filters documentation: https://pandoc.org/filters.html
- Official pandoc/core Docker Hub documentation: https://hub.docker.com/r/pandoc/core
- Official pandoc/latex Docker Hub documentation: https://hub.docker.com/r/pandoc/latex
- Docker Compose file reference for the obsolete top-level version field: https://docs.docker.com/reference/compose-file/version-and-name/
- Flask API documentation for send_file: https://flask.palletsprojects.com/en/stable/api/#flask.send_file
- Flask file upload documentation for secure_filename usage: https://flask.palletsprojects.com/en/stable/patterns/fileuploads/
- Panflute installation documentation: https://panflute.readthedocs.io/en/latest/install.html

## Issues Found
- The Docker volume examples used `-v $(pwd):/data`, which can fail when the current path contains spaces. Updated all examples to quote the bind mount as `-v "$(pwd):/data"`, matching the official Pandoc Docker examples.
- The version-pinning explanation implied Docker always locks the Pandoc version, but the examples used mutable tags. Updated the explanation to clarify that a full image tag must be pinned, and changed the custom image base from `pandoc/latex:latest` to `pandoc/latex:3.9.0.2`.
- The custom Docker image installed Python and pip but did not install `panflute`, even though the filter example imports `panflute`. Added a `pip3 install panflute` step.
- The Flask conversion service imports Flask, but the custom Docker image did not install Flask. Added `py3-flask` to the Alpine package installation.
- The Docker Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The Docker Compose service ran `/app/server.py` without making that file available in the container. Added a read-only bind mount for `./server.py:/app/server.py`.
- The Flask upload sample used `file.filename` directly in filesystem paths. Updated it to use `secure_filename()` and reject empty sanitized names, following Flask's upload guidance.

## Review Notes
- The Pandoc CLI flags used in the examples, including `--pdf-engine=xelatex`, `--toc`, `--toc-depth`, `--css`, `--metadata`, `--epub-cover-image`, `--extract-media`, `--template`, and `--filter`, match current Pandoc documentation.
- The official Pandoc Docker examples also recommend running containers with `--user $(id -u):$(id -g)` so generated files are owned by the host user. The post's examples still work without it, but adding it would improve day-to-day usability.
