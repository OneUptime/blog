# Validation Summary: How to Set Up Azure DevOps Wikis with Mermaid Diagrams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DevOps Wikis
- Published code wikis
- Markdown
- Mermaid diagrams
- Git repository documentation workflows
- Architecture Decision Records

## Sources Consulted
- Microsoft Learn: Markdown syntax for files, widgets, and wikis in Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/project/wiki/markdown-guidance?view=azure-devops
- Microsoft Learn: Publish Git repository files to a team wiki: https://learn.microsoft.com/en-gb/azure/devops/project/wiki/publish-repo-to-wiki?view=azure-devops
- Microsoft Learn: Wiki files, folder structure, and Git repo conventions: https://learn.microsoft.com/en-us/azure/devops/project/wiki/wiki-file-structure?view=azure-devops
- Microsoft Learn: Create a project wiki to share information: https://learn.microsoft.com/en-us/azure/devops/project/wiki/wiki-create-repo?view=azure-devops

## Issues Found
- The setup commands created `docs/runbooks` and `docs/adr` outside the `/docs/architecture` folder that the post tells readers to publish as a wiki. Updated the commands to create `docs/architecture/runbooks` and `docs/architecture/adr` so those pages are included in the published wiki and match the later directory tree.
- The Mermaid section said to use a code block with the `mermaid` language tag and stated that triple backtick fences work. Microsoft documents Azure DevOps wiki Mermaid diagrams with `::: mermaid` blocks. Updated the explanation and examples to use the documented block form.
- The flow diagrams used the `flowchart` keyword. Microsoft documents limited Mermaid syntax support in Azure DevOps and specifically says to use `graph` instead of `flowchart`. Updated the two flow diagram examples from `flowchart TB/LR` to `graph TB/LR`.

## Review Notes
Azure DevOps Mermaid support is version-dependent and does not cover all Mermaid syntax. The examples now use diagram types Microsoft lists as supported, but more complex Mermaid features should still be tested in the target Azure DevOps organization.
