# How to Run Pandoc in Docker for Document Format Conversion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Pandoc, Document Conversion, Markdown, LaTeX, PDF, HTML, EPUB

Description: Use Pandoc in Docker to convert documents between Markdown, HTML, LaTeX, PDF, EPUB, DOCX, and dozens of other formats reliably.

---

Pandoc calls itself the "universal document converter," and it earns that title. It converts between Markdown, HTML, LaTeX, PDF, EPUB, DOCX, RST, AsciiDoc, and dozens of other formats. Installing Pandoc with all its dependencies (especially LaTeX for PDF output) can consume gigabytes of disk space and create version headaches. Docker packages everything into a single image that works consistently everywhere.

## Why Pandoc in Docker?

Pandoc itself is relatively lightweight, but PDF generation requires a LaTeX distribution, which is enormous. A full TeX Live installation can exceed 4 GB. Docker lets you build an image once with the exact LaTeX packages you need, then reuse it across all your projects without cluttering your host system.

Version pinning is another advantage. Different Pandoc versions may produce slightly different output from the same source. Docker locks the version, ensuring your documents render identically over time.

## Quick Start

The official Pandoc Docker images come in several variants:

```bash
# Convert a Markdown file to HTML
docker run --rm -v $(pwd):/data pandoc/core README.md -o README.html

# Convert Markdown to PDF (requires the latex variant)
docker run --rm -v $(pwd):/data pandoc/latex README.md -o README.pdf

# Convert Markdown to DOCX (Word format)
docker run --rm -v $(pwd):/data pandoc/core README.md -o README.docx
```

The `pandoc/core` image handles most conversions. The `pandoc/latex` image adds a TeX Live installation for PDF generation.

## Common Conversion Tasks

Here are the conversions you will use most often.

Markdown to styled HTML with a table of contents:

```bash
# Convert Markdown to standalone HTML with a table of contents and custom CSS
docker run --rm -v $(pwd):/data pandoc/core \
  article.md \
  -o article.html \
  --standalone \
  --toc \
  --toc-depth=3 \
  --css=style.css \
  --metadata title="My Article"
```

Markdown to PDF with custom margins:

```bash
# Convert Markdown to PDF with A4 paper and custom margins
docker run --rm -v $(pwd):/data pandoc/latex \
  article.md \
  -o article.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V papersize=a4 \
  -V fontsize=12pt \
  -V mainfont="DejaVu Serif"
```

The `--pdf-engine=xelatex` flag provides better Unicode and font support compared to the default pdflatex engine.

Multiple Markdown files into a single PDF:

```bash
# Combine multiple chapter files into one PDF document
docker run --rm -v $(pwd):/data pandoc/latex \
  chapters/01-intro.md \
  chapters/02-setup.md \
  chapters/03-usage.md \
  chapters/04-conclusion.md \
  -o book.pdf \
  --pdf-engine=xelatex \
  --toc \
  -V documentclass=report
```

HTML to Markdown:

```bash
# Convert an HTML page to clean Markdown
docker run --rm -v $(pwd):/data pandoc/core \
  page.html \
  -f html \
  -t markdown \
  -o page.md \
  --wrap=none
```

Markdown to EPUB for e-readers:

```bash
# Generate an EPUB e-book from Markdown with metadata and cover image
docker run --rm -v $(pwd):/data pandoc/core \
  book.md \
  -o book.epub \
  --epub-cover-image=cover.jpg \
  --metadata title="My Book" \
  --metadata author="Jane Doe" \
  --toc
```

DOCX to Markdown (useful for migrating content):

```bash
# Extract text and formatting from a Word document as Markdown
docker run --rm -v $(pwd):/data pandoc/core \
  document.docx \
  -t markdown \
  -o document.md \
  --extract-media=./media
```

The `--extract-media` flag pulls embedded images out of the DOCX file and saves them as separate files.

## Building a Custom Pandoc Image

When you need specific LaTeX packages or custom templates, build your own image:

```dockerfile
# Dockerfile - Pandoc with custom LaTeX packages and templates
FROM pandoc/latex:latest

# Install additional LaTeX packages for specialized document types
RUN tlmgr update --self && tlmgr install \
    tcolorbox \
    environ \
    trimspaces \
    minted \
    fvextra \
    upquote \
    lineno \
    catchfile \
    xstring \
    framed

# Install Python for Pandoc filters
RUN apk add --no-cache python3 py3-pip

# Copy custom templates and filters
COPY templates/ /root/.pandoc/templates/
COPY filters/ /root/.pandoc/filters/

WORKDIR /data

ENTRYPOINT ["pandoc"]
```

## Using Pandoc Templates

Custom templates let you control the output layout precisely. Here is a simple LaTeX template:

```latex
% templates/report.latex - Custom report template for Pandoc PDF output
\documentclass[12pt, a4paper]{article}
\usepackage[margin=1in]{geometry}
\usepackage{hyperref}
\usepackage{graphicx}
\usepackage{fancyhdr}

\pagestyle{fancy}
\fancyhead[L]{$title$}
\fancyhead[R]{$date$}
\fancyfoot[C]{\thepage}

\title{$title$}
\author{$author$}
\date{$date$}

\begin{document}
\maketitle

$if(toc)$
\tableofcontents
\newpage
$endif$

$body$
\end{document}
```

Use the template:

```bash
# Generate a PDF using the custom report template
docker run --rm -v $(pwd):/data custom-pandoc \
  report.md \
  -o report.pdf \
  --template=report \
  --pdf-engine=xelatex \
  --toc \
  -V title="Quarterly Report" \
  -V author="Jane Doe" \
  -V date="February 2026"
```

## Pandoc Filters

Filters transform the document's abstract syntax tree between parsing and rendering. Here is a Python filter that adds line numbers to code blocks:

```python
#!/usr/bin/env python3
# filters/line-numbers.py - Pandoc filter to add line numbers to code blocks
import panflute as pf


def add_line_numbers(elem, doc):
    """Add line numbers to fenced code blocks."""
    if isinstance(elem, pf.CodeBlock):
        lines = elem.text.split('\n')
        numbered = []
        for i, line in enumerate(lines, 1):
            numbered.append(f"{i:4d} | {line}")
        elem.text = '\n'.join(numbered)
    return elem


def main(doc=None):
    return pf.run_filter(add_line_numbers, doc=doc)


if __name__ == '__main__':
    main()
```

Apply the filter during conversion:

```bash
# Convert with the custom line-numbers filter applied
docker run --rm -v $(pwd):/data custom-pandoc \
  code-tutorial.md \
  -o code-tutorial.pdf \
  --filter /root/.pandoc/filters/line-numbers.py \
  --pdf-engine=xelatex
```

## Docker Compose for a Conversion Service

Set up a conversion API using Docker Compose:

```yaml
# docker-compose.yml - Pandoc document conversion service
version: "3.8"

services:
  pandoc-api:
    build: .
    entrypoint: ["python3", "/app/server.py"]
    ports:
      - "5000:5000"
    volumes:
      - ./output:/app/output
      - ./templates:/root/.pandoc/templates
    restart: unless-stopped
```

A simple Flask API for the service:

```python
# server.py - HTTP API for Pandoc document conversions
import os
import subprocess
import tempfile
from flask import Flask, request, send_file, jsonify

app = Flask(__name__)

SUPPORTED_OUTPUTS = ['pdf', 'html', 'docx', 'epub', 'rst', 'latex']


@app.route('/convert', methods=['POST'])
def convert():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    output_format = request.form.get('format', 'pdf')

    if output_format not in SUPPORTED_OUTPUTS:
        return jsonify({'error': f'Unsupported format: {output_format}'}), 400

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, file.filename)
        file.save(input_path)

        base_name = os.path.splitext(file.filename)[0]
        output_path = os.path.join(tmpdir, f'{base_name}.{output_format}')

        # Build the Pandoc command with appropriate options
        cmd = ['pandoc', input_path, '-o', output_path, '--standalone']
        if output_format == 'pdf':
            cmd.extend(['--pdf-engine=xelatex'])

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            return jsonify({'error': result.stderr}), 500

        return send_file(output_path, as_attachment=True,
                        download_name=f'{base_name}.{output_format}')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Batch Conversion

Convert an entire directory of Markdown files to PDF:

```bash
#!/bin/bash
# scripts/batch-convert.sh - Convert all Markdown files to PDF

INPUT_DIR="./content"
OUTPUT_DIR="./pdfs"

mkdir -p "$OUTPUT_DIR"

for file in "$INPUT_DIR"/*.md; do
  [ -f "$file" ] || continue
  filename=$(basename "$file" .md)

  echo "Converting: ${filename}.md -> ${filename}.pdf"
  docker run --rm \
    -v "$(pwd):/data" \
    pandoc/latex \
    "content/${filename}.md" \
    -o "pdfs/${filename}.pdf" \
    --pdf-engine=xelatex \
    --toc \
    -V geometry:margin=1in
done

echo "All conversions complete."
```

## Wrapping Up

Pandoc in Docker gives you a complete document conversion pipeline without installing LaTeX or any other heavyweight dependency on your host. The official Docker images cover most use cases, and building custom images lets you add specific LaTeX packages and templates. Whether you are converting a single Markdown file to PDF or running a batch conversion service, Docker ensures the output stays consistent regardless of where the conversion runs.
