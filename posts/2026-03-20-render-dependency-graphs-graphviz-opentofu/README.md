# How to Render Dependency Graphs with Graphviz and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Graphviz, Dependency Graph, Visualization, Infrastructure as Code

Description: Learn how to render OpenTofu dependency graphs into clear visual diagrams using Graphviz layout engines and rendering options.

Graphviz is the standard tool for rendering OpenTofu's DOT-format dependency graphs. Choosing the right layout engine and rendering options makes the difference between an unreadable tangle and a clear architectural diagram.

## Installing Graphviz

```bash
# Ubuntu / Debian

sudo apt-get install -y graphviz

# macOS
brew install graphviz

# Verify installation
dot -V
```

## Basic Rendering

Generate the graph and pipe it directly to Graphviz:

```bash
# Render to PNG
tofu graph | dot -Tpng -o graph.png

# Render to SVG (scales without loss, good for large graphs)
tofu graph | dot -Tsvg -o graph.svg

# Render to PDF (good for printing)
tofu graph | dot -Tpdf -o graph.pdf
```

## Choosing the Right Layout Engine

Graphviz ships with several layout engines. For infrastructure graphs, these are the most useful:

```bash
# dot: hierarchical, best for trees and DAGs (default, best for tofu)
tofu graph | dot -Tsvg -o graph-dot.svg

# neato: spring model, good for smaller undirected-style graphs
tofu graph | neato -Tsvg -o graph-neato.svg

# fdp: force-directed, good for cluster visualization
tofu graph | fdp -Tsvg -o graph-fdp.svg

# circo: circular layout, useful for ring-topology dependencies
tofu graph | circo -Tsvg -o graph-circo.svg
```

For most OpenTofu graphs, `dot` (hierarchical) is the best choice because it shows dependency direction from top to bottom clearly.

## Controlling Graph Size and Resolution

For large configurations, the default rendering can be too dense:

```bash
# Increase DPI for high-resolution PNG
tofu graph | dot -Tpng -Gdpi=150 -o graph-hires.png

# Set a maximum drawing size for PDF output
tofu graph | dot -Tpdf -Gsize="20,30" -o graph-large.pdf

# Scale the graph to fill a target size
tofu graph | dot -Tpng -Gratio=fill -Gsize="24,18" -o graph-scaled.png
```

## Adding Custom Styling

Graphviz allows command-line attribute overrides. Create a wrapper script that applies styling:

```bash
#!/usr/bin/env bash
# styled-graph.sh - renders a styled OpenTofu dependency graph

tofu graph | dot -Tsvg \
  -Gbgcolor=white \
  -Gfontname=Helvetica \
  -Nfontname=Helvetica \
  -Nfontsize=10 \
  -Ecolor=gray50 \
  -o styled-graph.svg

echo "Rendered: styled-graph.svg"
```

## Rendering Separate Graphs for Root Modules

If your infrastructure is split across multiple standalone root modules, render each directory separately for clarity:

```bash
# Render the networking root module graph
cd environments/networking
tofu graph | dot -Tsvg -o ../../docs/networking-graph.svg

# Render the database root module graph
cd ../database
tofu graph | dot -Tsvg -o ../../docs/database-graph.svg
```

## Viewing in a Browser

SVG files open directly in any browser, making them easy to share:

```bash
# Open in default browser (macOS)
open graph.svg

# Open in default browser (Linux)
xdg-open graph.svg

# Serve as a static file
python3 -m http.server 8080
# Then navigate to http://localhost:8080/graph.svg
```

## Automating with a Makefile

Add rendering targets to your Makefile for quick graph generation:

```makefile
# Makefile
.PHONY: graph graph-destroy

graph:
	tofu graph | dot -Tsvg -o docs/graph.svg
	@echo "Graph rendered to docs/graph.svg"

graph-destroy:
	tofu graph -type=plan-destroy | dot -Tsvg -o docs/destroy-graph.svg
	@echo "Destroy graph rendered to docs/destroy-graph.svg"
```

## Conclusion

Graphviz transforms OpenTofu's raw DOT output into clear visual diagrams. Use the hierarchical `dot` layout for most infrastructure graphs, increase DPI or use SVG for large configurations, and automate rendering with a Makefile or CI step to keep your architectural documentation current.
