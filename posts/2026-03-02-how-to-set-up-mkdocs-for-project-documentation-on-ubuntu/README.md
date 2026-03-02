# How to Set Up MkDocs for Project Documentation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Documentation, Python, Markdown, DevOps

Description: Learn how to install and configure MkDocs on Ubuntu to build and serve beautiful project documentation from Markdown files with the Material theme and automatic deployment.

---

MkDocs is a Python-based static site generator that turns a directory of Markdown files into a documentation website. The configuration is a single YAML file. It builds quickly, the default output is clean and navigable, and the Material for MkDocs theme has made it the de facto choice for a large portion of Python and DevOps-adjacent open-source projects.

The whole workflow - write Markdown, run a build command, serve static files - is simple enough that documentation actually gets updated, which is what matters.

## Installing MkDocs

```bash
# Install Python and pip
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Create a virtual environment for MkDocs (recommended)
python3 -m venv ~/mkdocs-env
source ~/mkdocs-env/bin/activate

# Install MkDocs and the Material theme
pip install mkdocs mkdocs-material

# Verify installation
mkdocs --version

# Optional but useful plugins
pip install mkdocs-minify-plugin \
    mkdocs-git-revision-date-localized-plugin \
    mkdocs-awesome-pages-plugin
```

## Creating a New MkDocs Project

```bash
# Create a new project
mkdocs new my-project
cd my-project

# Project structure created:
# my-project/
# ├── docs/
# │   └── index.md      # Main documentation page
# └── mkdocs.yml        # Configuration file
```

## Configuring mkdocs.yml

The configuration file controls everything. Here's a comprehensive configuration:

```yaml
# mkdocs.yml

# Basic site info
site_name: My Project Documentation
site_url: https://docs.example.com
site_description: Complete documentation for My Project
site_author: Engineering Team

# Repository link (shown in the header)
repo_name: myorg/my-project
repo_url: https://github.com/myorg/my-project
edit_uri: edit/main/docs/

# Documentation directory
docs_dir: docs
site_dir: site

# Theme configuration
theme:
  name: material
  palette:
    # Light mode
    - media: "(prefers-color-scheme: light)"
      scheme: default
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    # Dark mode
    - media: "(prefers-color-scheme: dark)"
      scheme: slate
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-4
        name: Switch to light mode

  features:
    - navigation.tabs          # Tabs for top-level sections
    - navigation.sections      # Expandable sections in sidebar
    - navigation.expand        # Expand all sections by default
    - navigation.top           # Back to top button
    - search.suggest           # Search suggestions
    - search.highlight         # Highlight search terms
    - content.tabs.link        # Link tabs across pages
    - content.code.copy        # Copy button on code blocks
    - content.code.annotate    # Code annotations

  # Logo and favicon
  logo: assets/logo.png
  favicon: assets/favicon.ico

# Navigation structure
nav:
  - Home: index.md
  - Getting Started:
    - Installation: getting-started/installation.md
    - Configuration: getting-started/configuration.md
    - Quickstart: getting-started/quickstart.md
  - User Guide:
    - Overview: user-guide/overview.md
    - Features: user-guide/features.md
  - API Reference:
    - REST API: api/rest.md
    - CLI Reference: api/cli.md
  - Contributing: contributing.md
  - Changelog: changelog.md

# Extensions
markdown_extensions:
  # Standard extensions
  - admonition           # Note/Warning/Tip boxes
  - codehilite           # Code syntax highlighting
  - footnotes
  - toc:
      permalink: true    # Add anchor links to headers

  # PyMdown extensions (install separately: pip install pymdown-extensions)
  - pymdownx.highlight:
      anchor_linenums: true
  - pymdownx.inlinehilite
  - pymdownx.snippets    # Include code from external files
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid  # Mermaid diagram support
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
  - pymdownx.tabbed:
      alternate_style: true
  - pymdownx.tasklist:
      custom_checkbox: true
  - pymdownx.details
  - pymdownx.emoji:
      emoji_index: !!python/name:material.extensions.emoji.twemoji
      emoji_generator: !!python/name:material.extensions.emoji.to_svg

# Plugins
plugins:
  - search:
      separator: '[\s\-\.]'
  - minify:
      minify_html: true
  - git-revision-date-localized:
      type: date

# Extra configuration
extra:
  social:
    - icon: fontawesome/brands/github
      link: https://github.com/myorg
  version:
    provider: mike  # For versioned docs with mike

# Copyright footer
copyright: Copyright &copy; 2026 My Organization
```

## Writing Documentation

Create Markdown files in the `docs/` directory:

```bash
mkdir -p docs/getting-started docs/user-guide docs/api

# Create the main index
cat > docs/index.md << 'EOF'
# Welcome to My Project

My Project does [something useful].

## Quick Navigation

- [Getting Started](getting-started/installation.md)
- [API Reference](api/rest.md)

## Features

- Feature A
- Feature B
- Feature C
EOF
```

Use MkDocs Material's extended Markdown features:

```markdown
# Advanced Features

## Admonitions (callout boxes)

!!! note "Important Note"
    This is an important note. Use these for callouts.

!!! warning
    This is a warning.

!!! tip "Pro Tip"
    This is a helpful tip.

## Tabbed Content

=== "Python"
    ```python
    import my_project
    my_project.run()
    ```

=== "Command Line"
    ```bash
    my-project run
    ```

## Code with Annotations

```python
# (1)!
def important_function():
    return True  # (2)!
```

1. This annotation explains the function
2. This annotation explains the return value
```

## Development Server

```bash
# Start the development server with live reload
mkdocs serve

# Access at http://localhost:8000
# Changes to docs/ or mkdocs.yml reload automatically

# Serve on a specific address/port
mkdocs serve --dev-addr 0.0.0.0:8080
```

## Building the Static Site

```bash
# Build the site
mkdocs build

# Output is in the site/ directory
ls site/

# Verify the build
# The site/ directory contains everything needed to serve the docs
# - index.html
# - search index
# - static assets

# Clean build (removes stale files)
mkdocs build --clean
```

## Deploying to nginx

```bash
# Build the site
mkdocs build

# Copy to nginx web root
sudo cp -r site/* /var/www/docs/
sudo chown -R www-data:www-data /var/www/docs/

# nginx config
sudo tee /etc/nginx/sites-available/docs << 'EOF'
server {
    listen 80;
    server_name docs.example.com;
    root /var/www/docs;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|svg|woff2|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/docs /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Deploying to GitHub Pages

MkDocs has built-in GitHub Pages support:

```bash
# Deploy to gh-pages branch
mkdocs gh-deploy

# This builds the site and pushes to the gh-pages branch
# Configure GitHub Pages to serve from gh-pages in repo settings
```

## Versioned Documentation with mike

For projects with multiple release versions:

```bash
# Install mike
pip install mike

# Deploy version 1.0 of the docs
mike deploy 1.0

# Deploy as the latest version
mike deploy 1.0 latest

# Set the default version (what users see at the root URL)
mike set-default latest

# Deploy a new version
mike deploy 2.0 latest

# List deployed versions
mike list
```

## Automating with CI/CD

A GitHub Actions workflow to build and deploy docs:

```yaml
# .github/workflows/docs.yml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'mkdocs.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git-revision-date plugin

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install mkdocs mkdocs-material \
            mkdocs-minify-plugin \
            mkdocs-git-revision-date-localized-plugin \
            pymdown-extensions

      - name: Deploy docs
        run: mkdocs gh-deploy --force
```

## Organizing Large Documentation Sets

For large projects, the `awesome-pages` plugin helps manage navigation order:

```bash
# Install the plugin
pip install mkdocs-awesome-pages-plugin

# Add to mkdocs.yml
# plugins:
#   - awesome-pages
```

Create `.pages` files in directories to control order:

```yaml
# docs/getting-started/.pages
nav:
  - installation.md
  - configuration.md
  - quickstart.md
  - ...  # All remaining files in alphabetical order
```

## Tips for Maintaining Good Documentation

Structure documentation around tasks, not features. A user looking for "how to connect to a database" doesn't want to search through every configuration option. Organize by what users want to accomplish.

Keep code examples runnable. Test them. Nothing erodes documentation trust faster than examples that don't work. For command-line examples, consider using a CI job that actually runs the commands.

Use the `!!! warning` and `!!! note` admonition syntax liberally for things that are commonly misunderstood. These stand out visually and help users avoid common mistakes before they happen.

MkDocs with the Material theme has become the documentation standard for a reason: the output looks good, the authoring workflow is simple, and the feature set is complete for most documentation needs. Setup takes an hour at most, and iteration is fast enough that you'll actually want to write documentation.
