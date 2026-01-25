# How to Implement Secret Scanning with gitleaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Security, Secret Scanning, gitleaks, Git, CI/CD, DevSecOps, Credential Management

Description: Learn how to use gitleaks to detect hardcoded secrets, API keys, and credentials in your Git repositories before they become security incidents.

---

A single leaked API key can cost millions. Secrets accidentally committed to Git spread through clones, forks, and backups faster than you can rotate them. gitleaks scans Git history for credentials, preventing leaks before they reach remote repositories. This guide covers installation, configuration, CI/CD integration, and remediation workflows.

## Why Secrets End Up in Git

Developers commit secrets for many reasons:

- Quick local testing that becomes permanent
- Configuration files with placeholder values replaced by real credentials
- Environment variables dumped to files
- Third-party SDKs that generate credential files
- Copy-paste errors from documentation

Once pushed, secrets persist in Git history even if "deleted" in a later commit. Attackers scrape public repositories specifically looking for these patterns.

## Installing gitleaks

gitleaks is a single binary written in Go. Install it using your package manager or download directly:

```bash
# macOS with Homebrew
brew install gitleaks

# Linux (download from GitHub releases)
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/

# Using Docker
docker run --rm -v $(pwd):/repo zricethezav/gitleaks:latest detect --source /repo

# Verify installation
gitleaks version
# gitleaks version 8.18.0
```

## Basic Scanning

Run gitleaks against your repository:

```bash
# Scan the current directory (checks all commits)
gitleaks detect --source .

# Scan only staged changes (pre-commit hook use case)
gitleaks protect --source . --staged

# Scan specific commits
gitleaks detect --source . --log-opts="HEAD~10..HEAD"

# Output results as JSON
gitleaks detect --source . --report-format json --report-path results.json
```

When gitleaks finds a secret, it outputs the file, line, commit, and secret type:

```
Finding:     AKIAIOSFODNN7EXAMPLE
Secret:      AKIAIOSFODNN7EXAMPLE
RuleID:      aws-access-key-id
Entropy:     3.684
File:        config/settings.py
Line:        42
Commit:      a1b2c3d4e5f6
Author:      developer@example.com
Date:        2024-01-15T10:30:00Z
Message:     Add AWS configuration
```

## Understanding Detection Rules

gitleaks uses regular expressions and entropy analysis to detect secrets. The default configuration covers:

- AWS access keys and secrets
- GCP service account keys
- Azure credentials
- GitHub tokens
- Slack webhooks
- Database connection strings
- Private keys (RSA, SSH, PGP)
- Generic high-entropy strings

View the built-in rules:

```bash
gitleaks detect --source . --verbose
```

## Custom Configuration

Create a `.gitleaks.toml` file to customize detection rules:

```toml
# .gitleaks.toml

# Extend the default rules (recommended)
[extend]
useDefault = true

# Add custom rules for your organization
[[rules]]
id = "internal-api-key"
description = "Internal API Key"
regex = '''(?i)INTERNAL_API_KEY\s*[=:]\s*['"]?([a-zA-Z0-9]{32,})['"]?'''
tags = ["internal", "api"]

[[rules]]
id = "database-url"
description = "Database connection string"
regex = '''(?i)(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\s]+'''
tags = ["database", "credentials"]

# Define paths to ignore (vendored code, test fixtures)
[allowlist]
description = "Global allowlist"
paths = [
    '''vendor/''',
    '''node_modules/''',
    '''\.git/''',
    '''test/fixtures/''',
]

# Ignore specific files
[[rules.allowlist]]
paths = [
    '''\.env\.example''',
    '''config/settings\.example\.py''',
]

# Ignore specific patterns (known false positives)
[[rules.allowlist]]
regexes = [
    '''AKIAIOSFODNN7EXAMPLE''',  # AWS example key from docs
    '''wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY''',  # AWS example secret
]

# Ignore specific commits (after remediation)
[[rules.allowlist]]
commits = [
    "a1b2c3d4e5f6789012345678901234567890abcd",
]
```

Use your custom config:

```bash
gitleaks detect --source . --config .gitleaks.toml
```

## Pre-Commit Hook Integration

Catch secrets before they enter Git history:

```bash
# Install pre-commit framework
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
EOF

# Install the hook
pre-commit install
```

Now gitleaks runs automatically on every commit:

```bash
git add config/settings.py
git commit -m "Add configuration"
# gitleaks................................................................Failed
# - hook id: gitleaks
# - exit code: 1
#
# Finding: AKIAIOSFODNN7EXAMPLE
# Secret:  AKIAIOSFODNN7EXAMPLE
# ...
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/security.yml
name: Secret Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history needed for scanning all commits

      - name: Run gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Scan only new commits in PR
          GITLEAKS_ENABLE_COMMENTS: true
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - security

gitleaks:
  stage: security
  image: zricethezav/gitleaks:latest
  script:
    # Scan commits in this branch only
    - gitleaks detect --source . --log-opts="${CI_COMMIT_BEFORE_SHA}..${CI_COMMIT_SHA}" --verbose
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Secret Scan') {
            steps {
                sh '''
                    docker run --rm -v ${WORKSPACE}:/repo zricethezav/gitleaks:latest \
                        detect --source /repo --verbose --exit-code 1
                '''
            }
        }
    }

    post {
        failure {
            slackSend channel: '#security-alerts',
                      message: "Secret leak detected in ${env.JOB_NAME} - ${env.BUILD_URL}"
        }
    }
}
```

## Scanning Entire Git History

When onboarding an existing repository, scan all historical commits:

```bash
# Full history scan (may take time for large repos)
gitleaks detect --source . --verbose --report-format sarif --report-path gitleaks.sarif

# Scan specific branch
gitleaks detect --source . --log-opts="origin/main"

# Scan all branches
gitleaks detect --source . --log-opts="--all"
```

## Remediation Workflow

When gitleaks finds a secret:

1. **Rotate immediately**: The secret is compromised. Generate new credentials.
2. **Revoke the old secret**: Disable the leaked credential in the service provider.
3. **Remove from history** (optional): Use BFG Repo-Cleaner or git-filter-repo.
4. **Add to allowlist**: Prevent future false positives on the same pattern.

Remove secrets from Git history:

```bash
# Install BFG Repo-Cleaner
brew install bfg

# Create a file with secrets to remove
echo "AKIAIOSFODNN7EXAMPLE" > secrets.txt

# Run BFG to remove secrets from history
bfg --replace-text secrets.txt

# Force push (coordinate with team!)
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

## Baseline for Legacy Repositories

For repositories with existing secrets in history that cannot be cleaned:

```bash
# Generate a baseline of known issues
gitleaks detect --source . --report-format json --report-path .gitleaks-baseline.json

# Future scans compare against baseline
gitleaks detect --source . --baseline-path .gitleaks-baseline.json
```

New secrets trigger failures; historical ones are ignored.

## Monitoring and Metrics

Track secret scanning effectiveness:

```bash
# Count findings by rule type
gitleaks detect --source . --report-format json --report-path - | \
  jq -r '.[].RuleID' | sort | uniq -c | sort -rn
```

Export to your observability platform:

```python
# parse_gitleaks.py
import json
import sys

with open(sys.argv[1]) as f:
    findings = json.load(f)

# Group by rule
rules = {}
for finding in findings:
    rule = finding['RuleID']
    rules[rule] = rules.get(rule, 0) + 1

# Output as Prometheus metrics
for rule, count in rules.items():
    print(f'gitleaks_findings_total{{rule="{rule}"}} {count}')
```

---

Secret scanning is a safety net, not a primary defense. Use secret management tools (Vault, AWS Secrets Manager) and environment variables to keep credentials out of code. gitleaks catches the mistakes that slip through, preventing a configuration error from becoming a breach.
