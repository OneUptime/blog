# Validation Summary: How to Configure Azure Pipelines to Scan for Secrets

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Pipelines
- Microsoft Security DevOps extension
- GitHub Advanced Security for Azure DevOps
- Gitleaks
- .NET CLI / NuGet package vulnerability scanning
- npm audit
- Trivy
- CodeQL
- Bandit
- Checkov
- Terrascan
- SARIF

## Sources Consulted
- Microsoft Learn: Configure the Microsoft Security DevOps Azure DevOps extension - https://learn.microsoft.com/en-us/azure/defender-for-cloud/configure-azure-devops-extension
- Microsoft Learn: Configure GitHub Advanced Security for Azure DevOps features - https://learn.microsoft.com/en-us/azure/devops/repos/security/configure-github-advanced-security-features
- Microsoft Learn: Set up secret scanning for GitHub Advanced Security for Azure DevOps - https://learn.microsoft.com/en-us/azure/devops/repos/security/github-advanced-security-secret-scanning
- Microsoft Learn: AdvancedSecurity-Codeql-Init@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/advanced-security-codeql-init-v1
- Microsoft Learn: Integrate non-Microsoft scanning tools with GitHub Advanced Security for Azure DevOps - https://learn.microsoft.com/en-us/azure/devops/repos/security/github-advanced-security-code-scanning-third-party
- Microsoft Learn: dotnet package list command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-list
- Gitleaks official README - https://github.com/gitleaks/gitleaks
- Trivy official installation documentation - https://www.trivy.dev/docs/getting-started/installation/
- Bandit command-line and formatter documentation - https://bandit.readthedocs.io/en/latest/man/bandit.html
- Checkov CLI command reference and SARIF output documentation - https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html and https://www.checkov.io/8.Outputs/SARIF.html
- Terrascan documentation - https://runterrascan.io/docs/
- npm audit documentation - https://docs.npmjs.com/cli/commands/npm-audit

## Issues Found
- Microsoft Security DevOps was described as including CredScan and supporting a `secrets` category. Microsoft documentation states CredScan in MSDO was deprecated on September 20, 2023, and current task categories are `code`, `artifacts`, `IaC`, and `containers`. I removed CredScan from the MSDO tool list, corrected the category and tool examples, and added current secret scanning guidance.
- The CredScan@3 and PostAnalysis@2 example was outdated for current Azure DevOps security guidance. I replaced it with GitHub Advanced Security / Secret Protection guidance for Azure Repos.
- The Gitleaks example used an old pinned release and the older `detect --source --no-git` style. I changed it to install the latest release from GitHub and use the current `gitleaks dir` command, with a note to use `gitleaks git` for full-history scans.
- The Gitleaks TOML example replaced the built-in rules and used the older top-level `[allowlist]` form. I added `[extend] useDefault = true` and changed the allowlist to current `[[allowlists]]` syntax.
- The .NET dependency example used `dotnet-audit` / `dotnet audit`, which is not the current Microsoft-documented .NET CLI vulnerability scan command. I replaced it with `dotnet package list --vulnerable --include-transitive --format json` and noted the .NET SDK 9-or-earlier command form.
- The npm audit snippet redirected stderr into the JSON output file, which can make the file invalid JSON. I removed `2>&1`.
- The Trivy install snippet used deprecated `apt-key`. I replaced it with Trivy's signed keyring installation method.
- The CodeQL init example omitted `enableAutomaticCodeQLInstall`, which is needed for agents without preinstalled CodeQL. I added the documented input.
- The Bandit install command did not include the SARIF extra even though the example writes SARIF output. I changed it to `pip install 'bandit[sarif]'`.
- The Bandit high-severity check used a non-existent `--exit-zero-if-no-issues` flag. I removed that flag and left Bandit's default nonzero exit behavior for findings.
- The Checkov SARIF command used `--output-file-path` as if it were a direct file path. I changed it to redirect SARIF output to the intended file.
- The Advanced Security SARIF publishing task used an incorrect `SarifFiles` input. I changed it to the documented `SarifsInputDirectory` input and added a category.
- Broad claims that every commit is automatically scanned and every leaked credential is blocked before reaching any visible branch were too absolute. I softened them to match configured pipeline and push-protection behavior.

## Review Notes
- The examples are still illustrative and require repository-specific setup, such as enabling GitHub Advanced Security / Secret Protection, selecting correct CodeQL languages, ensuring the referenced Docker image exists before Trivy scans it, and choosing .NET SDK command form based on SDK version.
- Terrascan remains usable in the shown CLI form, but teams starting fresh may prefer Checkov or Trivy for IaC scanning because Terrascan's maintenance status has been less active than those alternatives.
