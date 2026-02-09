# How to Run LaTeX in Docker for Document Compilation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, LaTeX, Document Compilation, TeX Live, PDF, Academic Writing, Typesetting

Description: Compile LaTeX documents inside Docker containers to produce professional PDFs without installing a multi-gigabyte TeX distribution locally.

---

LaTeX produces the highest-quality typeset documents available, which is why it dominates academic publishing, technical documentation, and scientific papers. The downside is that a full TeX Live installation weighs in at several gigabytes and installs thousands of packages. Docker lets you compile LaTeX documents without permanently installing any of that on your machine. Build once, compile anywhere.

## Why Docker for LaTeX?

TeX distributions are notorious for installation complexity. Different operating systems package different versions, and individual LaTeX packages have their own dependency chains. A document that compiles on one machine may fail on another due to a missing package or version mismatch. Docker freezes the entire TeX environment, guaranteeing reproducible compilation.

This is especially valuable for collaborative projects where multiple authors need identical build environments, and for CI/CD pipelines that generate PDFs automatically.

## Choosing a Base Image

Several Docker images provide TeX Live. The most common options are:

```bash
# Full TeX Live installation (4+ GB, has everything)
docker pull texlive/texlive:latest

# Smaller image with common packages
docker pull pandoc/latex:latest

# Minimal Alpine-based image
docker pull blang/latex:ubuntu
```

For most projects, a custom image with only the packages you need strikes the right balance between size and capability.

## Building a Custom LaTeX Image

Here is a Dockerfile that includes the most commonly needed packages:

```dockerfile
# Dockerfile - Lean LaTeX compilation environment
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install a basic TeX Live distribution with common additions
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-base \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-science \
    texlive-bibtex-extra \
    texlive-xetex \
    texlive-luatex \
    biber \
    latexmk \
    make \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /doc

ENTRYPOINT ["latexmk"]
```

The `latexmk` tool is the recommended way to compile LaTeX documents because it automatically runs the correct number of compilation passes (LaTeX, BibTeX, LaTeX again, etc.) to resolve all cross-references and citations.

## Compiling a Simple Document

Create a LaTeX source file:

```latex
% document.tex - A simple LaTeX document for testing the Docker setup
\documentclass[12pt, a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{hyperref}
\usepackage{graphicx}
\usepackage{amsmath}

\title{Docker LaTeX Example}
\author{Jane Doe}
\date{\today}

\begin{document}
\maketitle

\section{Introduction}
This document was compiled inside a Docker container using \LaTeX.

\section{Mathematics}
Einstein's famous equation:
\begin{equation}
    E = mc^2
\end{equation}

The quadratic formula:
\begin{equation}
    x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\end{equation}

\section{Conclusion}
Docker makes \LaTeX{} compilation reproducible and portable.

\end{document}
```

Compile it:

```bash
# Compile the LaTeX document to PDF using latexmk
docker run --rm -v $(pwd):/doc latex-compiler \
  -pdf -interaction=nonstopmode document.tex
```

The `-pdf` flag tells latexmk to produce PDF output. The `-interaction=nonstopmode` flag prevents LaTeX from stopping to ask for input when it encounters errors.

## Using XeLaTeX for Custom Fonts

XeLaTeX supports system fonts directly, which is useful for non-Latin scripts and custom typography:

```bash
# Compile with XeLaTeX for system font support
docker run --rm -v $(pwd):/doc latex-compiler \
  -xelatex -interaction=nonstopmode document.tex
```

A XeLaTeX document with custom fonts:

```latex
% xelatex-doc.tex - Document using system fonts via XeLaTeX
\documentclass[12pt]{article}
\usepackage{fontspec}
\usepackage{polyglossia}

\setmainfont{DejaVu Serif}
\setsansfont{DejaVu Sans}
\setmonofont{DejaVu Sans Mono}

\title{XeLaTeX with Custom Fonts}
\author{Jane Doe}

\begin{document}
\maketitle

This document uses DejaVu fonts instead of the default Computer Modern family.
The monospace font is used for \texttt{code snippets like this}.

\end{document}
```

## Working with BibTeX and Citations

Academic papers need bibliography management. Here is a complete setup:

```latex
% paper.tex - Academic paper with bibliography
\documentclass[11pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[backend=biber, style=ieee]{biblatex}
\addbibresource{references.bib}
\usepackage{hyperref}

\title{A Study of Containerized Document Compilation}
\author{Jane Doe \and John Smith}

\begin{document}
\maketitle

\begin{abstract}
We present an approach to reproducible document compilation
using Docker containers \cite{docker2024}.
\end{abstract}

\section{Introduction}
Containerization has transformed software deployment \cite{kubernetes2023}.
LaTeX compilation benefits from the same reproducibility guarantees.

\printbibliography

\end{document}
```

The bibliography file:

```bibtex
% references.bib - Bibliography database
@misc{docker2024,
  author = {Docker Inc.},
  title = {Docker Documentation},
  year = {2024},
  url = {https://docs.docker.com}
}

@article{kubernetes2023,
  author = {Burns, Brendan and others},
  title = {Kubernetes: Up and Running},
  journal = {O'Reilly Media},
  year = {2023}
}
```

Compile with biber for bibliography processing:

```bash
# Compile the paper with biber bibliography processing
docker run --rm -v $(pwd):/doc latex-compiler \
  -pdf -bibtex -interaction=nonstopmode paper.tex
```

## Makefile for LaTeX Projects

Use a Makefile to standardize compilation commands:

```makefile
# Makefile - LaTeX compilation targets using Docker
DOCKER_IMAGE = latex-compiler
DOCKER_RUN = docker run --rm -v $(PWD):/doc $(DOCKER_IMAGE)

# Default target: compile the main document
all: main.pdf

main.pdf: main.tex references.bib
	$(DOCKER_RUN) -pdf -bibtex -interaction=nonstopmode main.tex

# Compile with XeLaTeX for custom font support
xelatex: main.tex
	$(DOCKER_RUN) -xelatex -interaction=nonstopmode main.tex

# Remove all generated files
clean:
	$(DOCKER_RUN) -C main.tex

# Continuous compilation mode - recompiles on file changes
watch:
	$(DOCKER_RUN) -pdf -pvc -interaction=nonstopmode main.tex

.PHONY: all clean watch xelatex
```

Run with:

```bash
# Compile the document
make

# Clean up auxiliary files
make clean
```

## Docker Compose for LaTeX Projects

For projects with multiple documents or complex build processes:

```yaml
# docker-compose.yml - LaTeX compilation environment
version: "3.8"

services:
  compile:
    build: .
    volumes:
      - .:/doc
    command: ["-pdf", "-interaction=nonstopmode", "main.tex"]

  # Continuous compilation that watches for file changes
  watch:
    build: .
    volumes:
      - .:/doc
    command: ["-pdf", "-pvc", "-interaction=nonstopmode", "main.tex"]
    profiles:
      - dev

  # Clean up all auxiliary files
  clean:
    build: .
    volumes:
      - .:/doc
    command: ["-C", "main.tex"]
    profiles:
      - tools
```

Usage:

```bash
# Compile the document
docker compose run --rm compile

# Start continuous compilation for development
docker compose --profile dev up watch

# Clean up generated files
docker compose --profile tools run --rm clean
```

## CI/CD Pipeline Integration

Automate PDF generation in GitHub Actions:

```yaml
# .github/workflows/compile-latex.yml - Compile LaTeX on push
name: Compile LaTeX

on:
  push:
    paths:
      - '**.tex'
      - '**.bib'
      - '**.sty'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Compile LaTeX document
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/doc \
            texlive/texlive:latest \
            latexmk -pdf -interaction=nonstopmode main.tex

      - name: Upload PDF artifact
        uses: actions/upload-artifact@v4
        with:
          name: document
          path: main.pdf
```

## Handling Missing Packages

When compilation fails due to a missing package, identify it and add it to your Dockerfile:

```bash
# Find which TeX Live package provides a missing .sty file
docker run --rm texlive/texlive:latest tlmgr info --list tcolorbox
```

Or install packages at runtime (slower, but useful for testing):

```bash
# Install a missing package and then compile
docker run --rm -v $(pwd):/doc texlive/texlive:latest \
  bash -c "tlmgr install tcolorbox && latexmk -pdf main.tex"
```

For permanent additions, update your Dockerfile:

```dockerfile
# Add the tcolorbox package to the image
RUN apt-get update && apt-get install -y texlive-latex-extra
```

## Wrapping Up

Docker eliminates the pain of installing and maintaining TeX Live distributions across multiple machines. Your LaTeX documents compile identically in development, on colleagues' machines, and in CI/CD pipelines. The latexmk tool handles the multi-pass compilation process automatically, and Docker Compose ties everything together for complex projects. Whether you are writing a single paper or maintaining a library of technical documents, Docker keeps your LaTeX workflow clean and reproducible.
