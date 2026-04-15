# How to Contribute to Dapr Documentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Documentation, Open Source, Contribution, Technical Writing

Description: Contribute to Dapr's official documentation by fixing typos, improving code samples, adding how-to guides, and translating content using the docs repository workflow.

---

## Dapr Documentation Repository

Dapr documentation lives at `github.com/dapr/docs` and is built with Hugo. The site at `docs.dapr.io` is generated from Markdown files in this repository. Documentation contributions are among the most valuable and accessible contributions you can make.

## Types of Documentation Contributions

- Fixing typos and broken links
- Improving code samples (adding missing language tags, fixing errors)
- Adding new how-to guides
- Improving concept explanations
- Updating outdated version references
- Adding translations (via community translation repos such as `dapr-cn/docs` for Chinese)

## Fork and Set Up

```bash
# Fork dapr/docs on GitHub, then clone
git clone https://github.com/YOUR_USERNAME/docs.git
cd docs

# Add upstream
git remote add upstream https://github.com/dapr/docs.git

# Install Hugo (docs use Hugo for static site generation)
brew install hugo

# Verify Hugo version (check .github/workflows for required version)
hugo version
```

## Preview Locally

```bash
# Install npm dependencies for the theme
npm install

# Start local server
hugo serve

# Navigate to http://localhost:1313
```

## File Structure

```text
daprdocs/
- content/
  - en/
    - concepts/          # Concept explanations
    - developing-applications/  # How-to guides
    - reference/         # API reference
    - operations/        # Operations guides
- static/
  - images/
- themes/
```

## Adding a How-To Guide

Create a new Markdown file in the appropriate section:

```bash
# Create a new how-to guide
touch daprdocs/content/en/developing-applications/building-blocks/state-management/howto-my-new-guide.md
```

Use the front matter template:

```markdown
---
type: docs
title: "How-To: Your Guide Title"
linkTitle: "Your Guide Title"
weight: 5000
description: "One sentence describing what this guide covers"
---
```

## Add Code Blocks with Language Tags

Every code block must include a language tag:

```markdown
\```bash
dapr run --app-id myapp -- node app.js
\```

\```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
\```

\```go
client, err := dapr.NewClient()
\```
```

## Use Includes for Repeated Content

Dapr docs use Hugo shortcodes for reusable snippets:

```markdown
{{< tabs "Self-Hosted" "Kubernetes" >}}

{{% codetab %}}
\```bash
dapr run --app-id myapp -- node app.js
\```
{{% /codetab %}}

{{% codetab %}}
\```yaml
annotations:
  dapr.io/enabled: "true"
\```
{{% /codetab %}}

{{< /tabs >}}
```

## Submit Your Documentation PR

```bash
git checkout -b docs/add-howto-state-encryption
# Make changes
git add daprdocs/content/en/developing-applications/...
git commit -s -m "docs: add how-to guide for state store encryption"
git push origin docs/add-howto-state-encryption

gh pr create \
  --repo dapr/docs \
  --title "docs: add how-to guide for state store encryption" \
  --body "Adds a missing how-to guide for encrypting Dapr state store data. Closes #1234"
```

## Link Checker

Dapr CI runs a link checker - verify links before submitting:

```bash
# Install markdown link checker
npm install -g markdown-link-check

# Check your file
markdown-link-check daprdocs/content/en/developing-applications/my-guide.md
```

## Summary

Contributing to Dapr documentation involves forking the `dapr/docs` repository, previewing changes with Hugo locally, following the front matter conventions, and submitting pull requests with signed-off commits. Documentation improvements are highly valued by the Dapr community and are an excellent starting point for new contributors.
