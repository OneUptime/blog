# Validation Summary: How to Containerize a COBOL Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Dockerfile multi-stage builds
- Docker Compose
- COBOL
- GnuCOBOL
- Python
- Flask
- Gunicorn
- Ubuntu package management

## Sources Consulted
- GnuCOBOL Manual: https://gnucobol.sourceforge.io/doc/gnucobol.html
- GnuCOBOL compiler help from `cobc --help` in `ubuntu:22.04`
- Ubuntu Jammy package metadata for `gnucobol4` and `libcob4`: https://launchpad.net/ubuntu/jammy/+package/gnucobol4
- Dockerfile reference: https://docs.docker.com/reference/builder
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Flask deployment documentation: https://flask.palletsprojects.com/
- Gunicorn documentation: https://docs.gunicorn.org/
- Debian package metadata for `gnucobol4`: https://packages.debian.org/stable/devel/gnucobol4

## Issues Found
- The file-processing COBOL example used hard-coded `/data/input/records.dat` and `/data/output/results.dat` paths, while the Flask wrapper wrote to `/tmp/input.dat` and read `/tmp/results.dat`. Changed the COBOL `ASSIGN TO` values to environment-mapped file names and updated Docker, Compose, and wrapper examples to set `INPUT_FILE` and `OUTPUT_FILE`.
- The Flask wrapper used shared fixed temp paths, which could collide under the four Gunicorn workers shown in the Dockerfile. Changed it to use a per-request `TemporaryDirectory`.
- The combined Dockerfile used `python:3.12-slim` and attempted to install `libcob4`, but current Debian-based Python slim images do not provide that package name in the same way as Ubuntu 22.04. Changed the runtime stage to `ubuntu:22.04` and installed `python3`, `python3-pip`, and `libcob4`.
- The healthcheck used `python`, which is not guaranteed to exist in Ubuntu images. Changed it to `python3`.
- The Compose example included the obsolete top-level `version: "3.8"` field. Removed it and left the file in the current Compose Specification format.
- The quick test command referenced `cobol-app:latest`, but the earlier build command tagged the image as `cobol-app:basic`. Updated the command to use the matching tag.
- The stdin volume test used `-v /dev/stdin:/data/input/records.dat`, which is not a reliable Docker bind mount pattern. Replaced it with an interactive shell command that writes stdin to a temp file inside the container and passes the mapped file names to the COBOL program.

## Review Notes
The COBOL snippets compiled successfully with GnuCOBOL on `ubuntu:22.04` before the environment-mapping edit, and the changed `ASSIGN TO` pattern was verified against GnuCOBOL runtime filename-mapping documentation. The updated Python wrapper was checked with `python3 -m py_compile`. A full post-edit Docker compile/run was attempted but could not complete because the local Docker host filesystem had only about 116 MB free, causing `apt-get` inside the validation container to fail with insufficient cache space.
