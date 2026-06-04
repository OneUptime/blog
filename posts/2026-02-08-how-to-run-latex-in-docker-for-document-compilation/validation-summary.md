# Validation Summary: How to Run LaTeX in Docker for Document Compilation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- LaTeX
- TeX Live
- latexmk
- XeLaTeX
- BibLaTeX and biber
- GitHub Actions
- Ubuntu apt packages

## Sources Consulted
- latexmk manual: https://texdoc.org/serve/latexmk/0
- TeX Live Docker image documentation: https://hub.docker.com/r/texlive/texlive/
- Pandoc installation documentation for Docker images: https://pandoc.org/installing.html
- blang/latex Docker Hub documentation: https://hub.docker.com/r/blang/latex
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose history and file format guidance: https://docs.docker.com/compose/intro/history/
- Docker CLI help output for `docker build` and `docker run`
- Docker Compose CLI version output
- GitHub Actions workflow syntax: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- actions/upload-artifact repository documentation: https://github.com/actions/upload-artifact
- TeX Live Manager documentation: https://www.tug.org/texlive/doc/tlmgr.html
- Ubuntu Jammy package metadata for `fonts-dejavu-core`: https://packages.ubuntu.com/jammy/fonts-dejavu-core

## Issues Found
- The post used the custom `latex-compiler` image before showing how to build it. Added a `docker build -t latex-compiler .` command after the Dockerfile so the later `docker run` examples can work.
- The XeLaTeX example selected DejaVu fonts, but the Dockerfile used `--no-install-recommends` and did not explicitly install those system fonts. Added `fonts-dejavu-core` to the Dockerfile.
- The `blang/latex:ubuntu` image was described as Alpine-based. Updated the comment to identify it as an Ubuntu-based LaTeX image.
- The `pandoc/latex` image was described as a smaller image with common packages. Updated the comment to match Pandoc documentation: it includes a minimal LaTeX installation for PDF generation with Pandoc.
- The Docker Compose example included `version: "3.8"`. Current Docker Compose uses the Compose Specification and ignores the legacy `version` field, so the snippet was updated to omit it.
- The GitHub Actions Docker command mounted the repository at `/doc` but did not set `/doc` as the working directory. Added `-w /doc` so `latexmk main.tex` runs against the mounted project.
- The runtime `tlmgr install` example had the same missing working-directory issue when compiling after mounting the project at `/doc`. Added `-w /doc`.

## Review Notes
The remaining examples use valid latexmk flags, including `-pdf`, `-xelatex`, `-pvc`, `-C`, and `-bibtex`; the latexmk manual confirms that `-bibtex` can run BibTeX or biber as needed. The Docker and Compose examples are syntactically valid for current Docker CLI and Compose CLI usage.
