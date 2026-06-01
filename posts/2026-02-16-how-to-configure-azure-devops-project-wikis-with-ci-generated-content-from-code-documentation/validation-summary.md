# Validation Summary: How to Configure Azure DevOps Project Wikis with CI-Generated Content from Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DevOps Wikis
- Azure Pipelines
- Azure Repos Git authentication
- Markdown and Mermaid
- .NET XML documentation
- XMLDoc2Markdown
- Python docstring documentation
- pydoc-markdown
- Bash
- Python
- JSON Schema

## Sources Consulted
- Azure DevOps Wiki file and folder structure: https://learn.microsoft.com/azure/devops/project/wiki/wiki-file-structure
- Azure DevOps Markdown and Mermaid guidance: https://learn.microsoft.com/azure/devops/project/wiki/markdown-guidance
- Azure Pipelines job access tokens: https://learn.microsoft.com/azure/devops/pipelines/process/access-tokens
- Azure Repos Git authentication: https://learn.microsoft.com/azure/devops/repos/git/auth-overview
- XMLDoc2Markdown NuGet documentation: https://www.nuget.org/packages/XMLDoc2Markdown
- Pydoc-Markdown CLI documentation: https://niklasrosenstein.github.io/pydoc-markdown/api/cli/
- pydoc documentation, checked to confirm current output behavior: https://pdoc.dev/docs/pdoc.html

## Issues Found
- The post said the project wiki repository is named `<ProjectName>.wiki`, but omitted that the default branch is `wikiMain`. Added the branch name and changed all wiki pushes from `main` to `HEAD:wikiMain`.
- The pipeline examples cloned the wiki with `https://$(System.AccessToken)@...`, which is not the recommended current Git authentication pattern for Azure Repos OAuth tokens. Replaced those clone and push commands with `http.extraheader="AUTHORIZATION: bearer $SYSTEM_ACCESSTOKEN"`.
- The .NET example used DocFX while describing Markdown output for an Azure wiki. DocFX builds rendered site output, not wiki-native Markdown pages in the way the example copied them. Replaced the example with XMLDoc2Markdown, which generates Markdown from C# XML documentation.
- The Python example used `pdoc --output-dir docs-output --format md`, which is not valid for current `pdoc`, and `pdoc3` does not use that command form for Markdown files. Replaced it with `pydoc-markdown -p mypackage > docs-output/Python-API-Reference.md`.
- The Mermaid example used fenced Markdown syntax. Azure DevOps wiki Mermaid documentation specifies the `::: mermaid` block syntax, so the generated file now uses that syntax.
- The architecture diagram example installed `dependency-cruiser` but did not use it. Updated the text and comments to describe a package dependency diagram generated from `package.json`.
- The generated configuration reference script wrote to `docs-output/Configuration-Reference.md` without ensuring that the output directory existed. Added `os.makedirs(..., exist_ok=True)`.

## Review Notes
The examples still use placeholder organization, project, package, and assembly names that readers must replace for their own repositories. For Azure DevOps organizations with repository protection settings enabled, teams may also need to explicitly authorize the wiki repository or adjust the job authorization scope in addition to granting Contribute permission.
