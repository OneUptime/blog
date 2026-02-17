# How to Configure Azure Pipelines to Scan for Secrets and Vulnerabilities with Built-In Security Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Security Scanning, Secrets Detection, Vulnerability Scanning, DevSecOps, CI/CD, SAST

Description: Learn how to configure Azure Pipelines with built-in security tasks to detect leaked secrets, scan for code vulnerabilities, and enforce security gates in your CI/CD workflow.

---

The number of security breaches that start with a leaked credential in source code is staggering. A database connection string committed to a public repository. An API key hardcoded in a configuration file. A private key accidentally included in a Docker image. These mistakes happen because developers are focused on making things work, and security checks happen too late - if they happen at all.

Azure Pipelines lets you shift security left by adding scanning tasks directly into your build pipeline. Every pull request and every commit gets scanned for secrets, vulnerabilities, and security misconfigurations before the code reaches production. When a scan finds something, the pipeline fails, and the developer fixes it immediately rather than months later when a security auditor flags it.

## Microsoft Security DevOps Extension

Microsoft provides the "Microsoft Security DevOps" extension for Azure DevOps, which bundles several open-source security tools into a single pipeline task. Install it from the Visual Studio Marketplace.

The extension includes:

- **Credscan/CredentialScanner**: Detects credentials, API keys, and secrets in source code
- **Bandit**: Security linter for Python code
- **ESLint**: JavaScript/TypeScript security rules
- **Terrascan**: Infrastructure as Code security scanning
- **Trivy**: Container image and filesystem vulnerability scanning

```yaml
# azure-pipelines.yml - Basic security scanning pipeline

trigger:
  branches:
    include:
      - main
      - feature/*

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: MicrosoftSecurityDevOps@1
    displayName: 'Run Microsoft Security DevOps'
    inputs:
      categories: 'secrets,code,IaC'
      # Optionally specify which tools to run
      # tools: 'credscan,bandit,eslint,terrascan,trivy'

  # Publish the security results as a build artifact
  - task: PublishBuildArtifacts@1
    displayName: 'Publish security scan results'
    inputs:
      pathToPublish: '$(Agent.TempDirectory)/.sarif'
      artifactName: 'SecurityScanResults'
    condition: always()
```

## Credential Scanning

Credential scanning is the highest-priority security check. A leaked credential can be exploited within hours of being committed to a repository.

### Using CredScan in Pipelines

```yaml
# Focused credential scanning pipeline
steps:
  - task: CredScan@3
    displayName: 'Scan for credentials'
    inputs:
      toolVersion: 'Latest'
      scanFolder: '$(Build.SourcesDirectory)'
      # Exclude test files that might contain fake credentials
      suppressionsFile: '.credscan-suppressions.json'
      outputFormat: 'sarif'

  - task: PostAnalysis@2
    displayName: 'Check scan results'
    inputs:
      CredScan: true
      # Fail the build if any credentials are found
      ToolLogsNotFoundAction: 'Error'
```

Create a suppressions file for legitimate false positives.

```json
{
  "tool": "CredScan",
  "suppressions": [
    {
      "file": "tests/fixtures/mock-config.json",
      "reason": "Contains fake test credentials, not real secrets",
      "expirationDate": "2026-12-31"
    },
    {
      "placeholder": "EXAMPLE_API_KEY_12345",
      "reason": "Documentation placeholder, not a real key"
    }
  ]
}
```

### Using Gitleaks for Secret Detection

Gitleaks is an open-source alternative that scans both the current code and the Git history for secrets.

```yaml
# Gitleaks secret detection
steps:
  - script: |
      # Install gitleaks
      wget -q https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
      tar -xzf gitleaks_8.18.0_linux_x64.tar.gz

      # Scan the repository for secrets
      # --no-git skips git history (faster, use for PR checks)
      # Remove --no-git to scan full history (use for scheduled scans)
      ./gitleaks detect \
        --source="$(Build.SourcesDirectory)" \
        --report-format=sarif \
        --report-path="$(Build.ArtifactStagingDirectory)/gitleaks-results.sarif" \
        --no-git \
        --verbose

      SCAN_EXIT=$?

      if [ $SCAN_EXIT -ne 0 ]; then
        echo "##vso[task.logissue type=error]Secrets detected in source code!"
        echo "##vso[task.complete result=Failed;]"
      else
        echo "No secrets detected"
      fi
    displayName: 'Run Gitleaks secret scan'
    continueOnError: false
```

Customize the Gitleaks configuration to match your organization's patterns.

```toml
# .gitleaks.toml - Custom configuration for your codebase
title = "Custom Gitleaks Config"

# Define custom rules for internal secret patterns
[[rules]]
id = "internal-api-key"
description = "Internal API Key"
regex = '''(?i)internal[-_]?api[-_]?key\s*[:=]\s*['"]?([a-zA-Z0-9]{32,})['"]?'''
tags = ["internal", "api-key"]

# Allowlist specific paths and patterns
[allowlist]
paths = [
  '''tests/.*''',
  '''docs/.*''',
  '''\.example$'''
]
```

## Dependency Vulnerability Scanning

Beyond secrets, your dependencies can introduce vulnerabilities. Scan your package manifests for known CVEs.

```yaml
# Dependency vulnerability scanning for multiple ecosystems

steps:
  # .NET dependency scanning
  - task: DotNetCoreCLI@2
    displayName: 'Restore .NET packages'
    inputs:
      command: 'restore'
      projects: '**/*.csproj'

  - script: |
      # Install dotnet-audit tool
      dotnet tool install --global dotnet-audit

      # Scan for vulnerable NuGet packages
      dotnet audit --project "$(Build.SourcesDirectory)" \
        --output "$(Build.ArtifactStagingDirectory)/dotnet-audit.json"
    displayName: 'Scan .NET dependencies'

  # Node.js dependency scanning
  - script: |
      cd "$(Build.SourcesDirectory)"
      # npm audit returns non-zero if vulnerabilities found
      npm audit --json > "$(Build.ArtifactStagingDirectory)/npm-audit.json" 2>&1 || true

      # Check for high and critical vulnerabilities
      HIGH_COUNT=$(cat "$(Build.ArtifactStagingDirectory)/npm-audit.json" | \
        python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('high',0) + d.get('metadata',{}).get('vulnerabilities',{}).get('critical',0))")

      echo "High/Critical vulnerabilities: $HIGH_COUNT"

      if [ "$HIGH_COUNT" -gt "0" ]; then
        echo "##vso[task.logissue type=error]Found $HIGH_COUNT high/critical vulnerabilities"
        exit 1
      fi
    displayName: 'Scan npm dependencies'

  # Container image scanning with Trivy
  - script: |
      # Install Trivy
      wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
      echo "deb https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee /etc/apt/sources.list.d/trivy.list
      sudo apt-get update && sudo apt-get install -y trivy

      # Scan the Docker image for vulnerabilities
      trivy image \
        --severity HIGH,CRITICAL \
        --exit-code 1 \
        --format sarif \
        --output "$(Build.ArtifactStagingDirectory)/trivy-results.sarif" \
        "myapp:$(Build.BuildId)"
    displayName: 'Scan container image'
    condition: succeededOrFailed()
```

## SAST (Static Application Security Testing)

Static analysis catches security issues in your own code, like SQL injection, cross-site scripting, or insecure deserialization.

```yaml
# Static Application Security Testing

steps:
  # CodeQL analysis for supported languages
  - task: AdvancedSecurity-Codeql-Init@1
    displayName: 'Initialize CodeQL'
    inputs:
      languages: 'csharp,javascript'

  - task: DotNetCoreCLI@2
    displayName: 'Build for CodeQL analysis'
    inputs:
      command: 'build'
      projects: '**/*.sln'

  - task: AdvancedSecurity-Codeql-Analyze@1
    displayName: 'Run CodeQL analysis'

  # Python security scanning with Bandit
  - script: |
      pip install bandit

      # Run Bandit with SARIF output for Azure DevOps integration
      bandit -r "$(Build.SourcesDirectory)/src" \
        -f sarif \
        -o "$(Build.ArtifactStagingDirectory)/bandit-results.sarif" \
        --severity-level medium \
        || true  # Don't fail yet - we'll check severity below

      # Check for high severity issues
      bandit -r "$(Build.SourcesDirectory)/src" \
        --severity-level high \
        --exit-zero-if-no-issues
    displayName: 'Run Python security scan'
```

## Infrastructure as Code Security Scanning

If your pipeline deploys infrastructure, scan your templates for security misconfigurations.

```yaml
# IaC security scanning for Bicep/ARM and Terraform

steps:
  # Scan Bicep/ARM templates with Checkov
  - script: |
      pip install checkov

      checkov \
        --directory "$(Build.SourcesDirectory)/infrastructure" \
        --framework arm \
        --output sarif \
        --output-file-path "$(Build.ArtifactStagingDirectory)/checkov-results.sarif" \
        --soft-fail  # Don't fail the pipeline (review results first)

      # For strict enforcement, remove --soft-fail
    displayName: 'Scan IaC templates'

  # Scan Terraform files with Terrascan
  - script: |
      # Install Terrascan
      curl -L "$(curl -s https://api.github.com/repos/tenable/terrascan/releases/latest | grep -o -E 'https://.*Linux_x86_64.tar.gz')" | tar -xz

      ./terrascan scan \
        -i terraform \
        -d "$(Build.SourcesDirectory)/terraform" \
        -o sarif > "$(Build.ArtifactStagingDirectory)/terrascan-results.sarif"
    displayName: 'Scan Terraform configurations'
```

## Publishing Results to Azure DevOps

SARIF (Static Analysis Results Interchange Format) is the standard format for security scan results. Azure DevOps Advanced Security can ingest SARIF files and display them in the Security tab.

```yaml
# Publish all SARIF results for Azure DevOps Advanced Security
steps:
  - task: AdvancedSecurity-Publish@1
    displayName: 'Publish security scan results'
    inputs:
      SarifFiles: '$(Build.ArtifactStagingDirectory)/*.sarif'
    condition: always()
```

## Creating a Security Gate

For critical pipelines, create a mandatory security stage that blocks deployment if any high-severity issues are found.

```yaml
stages:
  - stage: SecurityScan
    displayName: 'Security Scanning'
    jobs:
      - job: ScanJob
        steps:
          # ... all scanning tasks ...

          # Final gate - summarize and enforce
          - script: |
              echo "=== Security Scan Summary ==="

              TOTAL_ISSUES=0

              # Count issues from each scanner
              for sarif in $(Build.ArtifactStagingDirectory)/*.sarif; do
                if [ -f "$sarif" ]; then
                  ISSUES=$(python3 -c "
              import json
              with open('$sarif') as f:
                  data = json.load(f)
              count = sum(len(r.get('results',[])) for r in data.get('runs',[]))
              print(count)
              ")
                  echo "$(basename $sarif): $ISSUES issues"
                  TOTAL_ISSUES=$((TOTAL_ISSUES + ISSUES))
                fi
              done

              echo ""
              echo "Total security issues: $TOTAL_ISSUES"

              if [ "$TOTAL_ISSUES" -gt "0" ]; then
                echo "##vso[task.logissue type=error]Security scan found $TOTAL_ISSUES issues. Fix them before deploying."
                exit 1
              fi
            displayName: 'Security gate'

  - stage: Deploy
    dependsOn: SecurityScan
    condition: succeeded()
    # ... deployment stages ...
```

Integrating security scanning into your pipeline turns security from a periodic audit into a continuous process. Every change is checked, every vulnerability is caught early, and every leaked credential is blocked before it reaches a branch that anyone can see. The pipeline becomes your first line of defense, and passing it means the code meets a minimum security bar that your organization has defined.
