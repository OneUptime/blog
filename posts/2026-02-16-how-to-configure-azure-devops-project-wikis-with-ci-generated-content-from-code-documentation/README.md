# How to Configure Azure DevOps Project Wikis with CI-Generated Content from Code Documentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, Wiki, CI/CD, Documentation, Code Documentation, Automation, Azure Pipelines

Description: Learn how to automatically generate and publish documentation from code into Azure DevOps project wikis using CI pipelines for always up-to-date technical docs.

---

Documentation that lives separately from code always drifts out of date. Developers update the code, forget to update the wiki, and within weeks the documentation is wrong. The solution is to generate documentation directly from code and publish it automatically. Azure DevOps project wikis support this through their Git-backed wiki feature, which means you can push wiki content from a CI pipeline just like pushing code.

This guide walks through setting up a pipeline that generates documentation from your codebase - API docs, architecture diagrams, configuration references - and publishes it to your Azure DevOps wiki automatically on every merge to main.

## Understanding Azure DevOps Wiki Types

Azure DevOps offers two wiki types. The project wiki is a standalone wiki created from the Azure DevOps portal. The code wiki (also called "publish code as wiki") maps a folder in a repository directly to a wiki. For CI-generated content, the project wiki is usually the better choice because it has its own Git repository that your pipeline can push to independently.

The project wiki is backed by a Git repository named `<ProjectName>.wiki`. You can clone this repository, make changes, push them back, and the wiki updates instantly. This is the mechanism we will use for CI-generated content.

## Setting Up the Wiki Repository

First, create a project wiki from the Azure DevOps portal if you do not have one already. Go to Overview, then Wiki, and click "Create project wiki."

Once created, you can clone the wiki repository.

```bash
# Clone the wiki repository
# The wiki repo URL follows this pattern
git clone https://dev.azure.com/your-org/your-project/_git/your-project.wiki

# You will see the existing wiki content as Markdown files
ls your-project.wiki/
```

The wiki repository uses a flat or hierarchical Markdown structure. Each `.md` file becomes a wiki page, and the file name becomes the page title. Directories create page hierarchies. A file named `.order` in each directory controls the page ordering.

## Generating API Documentation

Let us start with a practical example: generating API documentation from a .NET project and publishing it to the wiki.

```yaml
# azure-pipelines.yml - Generate and publish API docs to wiki

trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  wikiRepoUrl: 'https://dev.azure.com/your-org/your-project/_git/your-project.wiki'

steps:
  # Check out the source code
  - checkout: self
    displayName: 'Checkout source code'

  # Install documentation generation tools
  - task: DotNetCoreCLI@2
    displayName: 'Install DocFX'
    inputs:
      command: 'custom'
      custom: 'tool'
      arguments: 'install -g docfx'

  # Generate XML documentation from the project
  - task: DotNetCoreCLI@2
    displayName: 'Build with XML docs'
    inputs:
      command: 'build'
      projects: 'src/**/*.csproj'
      arguments: '--configuration Release /p:GenerateDocumentationFile=true'

  # Generate Markdown documentation from XML docs
  - script: |
      # Create a DocFX configuration if one does not exist
      mkdir -p docs-output

      # Run DocFX to generate documentation
      docfx build docfx.json --output docs-output

      echo "Documentation generated successfully"
      ls -la docs-output/
    displayName: 'Generate documentation'

  # Clone the wiki repo and update it
  - script: |
      # Configure git for the push
      git config --global user.email "pipeline@dev.azure.com"
      git config --global user.name "CI Pipeline"

      # Clone the wiki repository using the system access token
      git clone https://$(System.AccessToken)@dev.azure.com/your-org/your-project/_git/your-project.wiki wiki-repo

      # Create or update the API documentation section
      mkdir -p wiki-repo/API-Reference

      # Copy generated docs to the wiki
      cp -r docs-output/api/* wiki-repo/API-Reference/ 2>/dev/null || true

      # Generate the order file for proper page ordering
      cd wiki-repo/API-Reference
      ls *.md 2>/dev/null | sed 's/\.md$//' > .order

      # Commit and push changes
      cd ..
      git add -A
      git diff --cached --quiet || git commit -m "Auto-update API documentation from build $(Build.BuildId)"
      git push origin main
    displayName: 'Publish docs to wiki'
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

## Generating Documentation for Python Projects

For Python projects, you can use tools like `pdoc` or `sphinx` to generate documentation from docstrings.

```yaml
# Python documentation pipeline

steps:
  - checkout: self

  # Install Python dependencies and pdoc
  - script: |
      python -m pip install --upgrade pip
      pip install pdoc3
      pip install -r requirements.txt
    displayName: 'Install dependencies'

  # Generate Markdown documentation from Python docstrings
  - script: |
      # Generate markdown documentation for the entire package
      pdoc --output-dir docs-output --format md mypackage/

      echo "Generated documentation files:"
      find docs-output -name "*.md" -type f
    displayName: 'Generate Python docs'

  # Publish to wiki
  - script: |
      git config --global user.email "pipeline@dev.azure.com"
      git config --global user.name "CI Pipeline"

      # Clone wiki
      git clone https://$(System.AccessToken)@dev.azure.com/your-org/your-project/_git/your-project.wiki wiki-repo

      # Update Python API reference section
      rm -rf wiki-repo/Python-API-Reference
      mkdir -p wiki-repo/Python-API-Reference
      cp -r docs-output/* wiki-repo/Python-API-Reference/

      # Add a timestamp page
      cat > wiki-repo/Python-API-Reference/Last-Updated.md << EOF
      # Documentation Status

      This documentation was auto-generated from the codebase.

      - **Build ID**: $(Build.BuildId)
      - **Commit**: $(Build.SourceVersion)
      - **Generated**: $(date -u +"%Y-%m-%d %H:%M UTC")
      - **Branch**: $(Build.SourceBranchName)
      EOF

      cd wiki-repo
      git add -A
      git diff --cached --quiet || git commit -m "Update Python API docs - build $(Build.BuildId)"
      git push origin main
    displayName: 'Publish to wiki'
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

## Generating Architecture Diagrams

You can also generate Mermaid diagrams from code analysis and include them in the wiki. Here is an example that generates a dependency diagram.

```yaml
# Generate a dependency diagram and publish to wiki

steps:
  - checkout: self

  - script: |
      # Analyze project dependencies and generate a Mermaid diagram
      # This example works with a Node.js project

      # Install dependency analysis tool
      npm install -g dependency-cruiser

      # Generate dependency graph in Mermaid format
      mkdir -p docs-output

      cat > docs-output/Architecture-Dependencies.md << 'HEADER'
      # Module Dependencies

      This diagram is auto-generated from the codebase. It shows the dependency
      relationships between modules in the application.

      HEADER

      # Run dependency-cruiser and format as Mermaid
      echo '```mermaid' >> docs-output/Architecture-Dependencies.md
      echo 'graph TD' >> docs-output/Architecture-Dependencies.md

      # Parse package.json dependencies into Mermaid nodes
      node -e "
      const pkg = require('./package.json');
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      console.log('  App[Application]');
      deps.forEach(d => console.log('  App --> ' + d.replace(/[^a-zA-Z0-9]/g, '_') + '[' + d + ']'));
      " >> docs-output/Architecture-Dependencies.md

      echo '```' >> docs-output/Architecture-Dependencies.md

      echo "Dependency diagram generated"
    displayName: 'Generate architecture diagrams'

  - script: |
      git config --global user.email "pipeline@dev.azure.com"
      git config --global user.name "CI Pipeline"

      git clone https://$(System.AccessToken)@dev.azure.com/your-org/your-project/_git/your-project.wiki wiki-repo

      mkdir -p wiki-repo/Architecture
      cp docs-output/Architecture-Dependencies.md wiki-repo/Architecture/

      cd wiki-repo
      git add -A
      git diff --cached --quiet || git commit -m "Update architecture diagrams - build $(Build.BuildId)"
      git push origin main
    displayName: 'Publish diagrams to wiki'
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

## Managing Wiki Page Structure

The `.order` file in each wiki directory controls page ordering. Generate this file as part of your pipeline to maintain a consistent structure.

```bash
# Script to generate .order files for the wiki
# Place important pages first, then alphabetical

generate_order_file() {
    local dir=$1
    local order_file="${dir}/.order"

    # Start with pinned pages if they exist
    > "$order_file"

    # Add Home page first if it exists
    if [ -f "${dir}/Home.md" ]; then
        echo "Home" >> "$order_file"
    fi

    # Add Getting Started if it exists
    if [ -f "${dir}/Getting-Started.md" ]; then
        echo "Getting-Started" >> "$order_file"
    fi

    # Add remaining pages alphabetically
    for file in $(ls "${dir}"/*.md 2>/dev/null | sort); do
        page=$(basename "$file" .md)
        # Skip pages already added
        if [ "$page" != "Home" ] && [ "$page" != "Getting-Started" ]; then
            echo "$page" >> "$order_file"
        fi
    done
}

# Generate order files for all wiki directories
find wiki-repo -type d | while read dir; do
    if ls "${dir}"/*.md 1>/dev/null 2>&1; then
        generate_order_file "$dir"
    fi
done
```

## Handling Permissions

The pipeline needs permission to push to the wiki repository. The `$(System.AccessToken)` provides this by default, but you might need to adjust the project build service permissions.

Go to Project Settings, then Repositories, find the `.wiki` repository, and ensure the build service account has "Contribute" permission. Without this, the git push in your pipeline will fail with a permission error.

## Generating Configuration Reference Documentation

Another valuable use case is generating documentation from configuration files, environment variable definitions, or feature flags.

```python
#!/usr/bin/env python3
# generate-config-docs.py
# Parses configuration files and generates wiki documentation

import json
import os

def generate_config_docs(config_path, output_path):
    """Read a JSON config schema and generate Markdown documentation."""
    with open(config_path, 'r') as f:
        schema = json.load(f)

    lines = ["# Configuration Reference\n"]
    lines.append("This page is auto-generated from the configuration schema.\n")
    lines.append("| Setting | Type | Default | Description |")
    lines.append("|---------|------|---------|-------------|")

    for key, props in schema.get("properties", {}).items():
        setting_type = props.get("type", "string")
        default = props.get("default", "N/A")
        description = props.get("description", "No description")
        lines.append(f"| `{key}` | {setting_type} | `{default}` | {description} |")

    lines.append("\n---\n")
    lines.append(f"*Generated from `{os.path.basename(config_path)}`*\n")

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"Generated config docs at {output_path}")

if __name__ == "__main__":
    generate_config_docs("config/schema.json", "docs-output/Configuration-Reference.md")
```

Automating wiki content from code documentation means your docs are always current, always accurate, and never require a separate update step. The pipeline becomes your documentation publisher, and every merge to main is also a documentation release. Teams that adopt this pattern find that documentation quality improves dramatically because the barrier to updating it drops to zero - just update the code comments or docstrings, and the wiki updates itself.
