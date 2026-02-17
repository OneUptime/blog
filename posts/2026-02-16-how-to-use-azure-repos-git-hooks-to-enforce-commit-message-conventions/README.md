# How to Use Azure Repos Git Hooks to Enforce Commit Message Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Repos, Git Hooks, Commit Messages, Conventional Commits, Code Quality, Azure DevOps, Git

Description: Enforce commit message conventions in Azure Repos using client-side and server-side Git hooks for consistent project history.

---

Commit messages are the most undervalued documentation in a project. A clean commit history tells you why a change was made, not just what changed. But without enforcement, commit messages degrade quickly. You get messages like "fix", "WIP", "stuff", or the classic "final final v2".

Enforcing commit message conventions through Git hooks catches bad messages before they enter the repository. In this post, I will cover both client-side hooks (that run on the developer's machine) and server-side approaches (that run in Azure DevOps), along with the Conventional Commits standard that most teams adopt.

## What Are Conventional Commits?

Conventional Commits is a specification for structuring commit messages. The format is:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Where `type` is one of:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code formatting, no logic changes
- **refactor**: Code restructuring without changing behavior
- **test**: Adding or modifying tests
- **chore**: Build process, tooling, or dependency changes
- **perf**: Performance improvements
- **ci**: CI/CD configuration changes

Examples of well-formatted messages:

```
feat(auth): add password reset flow via email

fix(api): handle null response from payment gateway

docs(readme): update installation instructions for Linux

refactor(database): extract connection pooling into separate module
```

## Client-Side Git Hooks

Git hooks are scripts that run at specific points in the Git workflow. The `commit-msg` hook runs after you write your commit message but before the commit is created, making it the ideal place to validate message format.

### Setting Up a commit-msg Hook

Create a file at `.git/hooks/commit-msg` (or use a shared hooks directory).

The following script validates that commit messages follow the Conventional Commits format.

```bash
#!/bin/bash
# .git/hooks/commit-msg
# Validates commit messages against Conventional Commits format

# Read the commit message from the file passed as argument
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Define the pattern for Conventional Commits
# Format: type(scope): description
PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\([a-z0-9-]+\))?: .{3,}"

# Check if the commit message matches the pattern
if ! echo "$COMMIT_MSG" | head -1 | grep -qE "$PATTERN"; then
  echo ""
  echo "ERROR: Commit message does not follow Conventional Commits format."
  echo ""
  echo "Expected format: <type>(<scope>): <description>"
  echo ""
  echo "Valid types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
  echo ""
  echo "Examples:"
  echo "  feat(auth): add login with Google"
  echo "  fix(api): handle timeout in payment service"
  echo "  docs: update API documentation"
  echo ""
  echo "Your message was:"
  echo "  $COMMIT_MSG"
  echo ""
  exit 1
fi

# Check minimum description length (at least 10 characters after the prefix)
DESCRIPTION=$(echo "$COMMIT_MSG" | head -1 | sed 's/^[^:]*: //')
if [ ${#DESCRIPTION} -lt 10 ]; then
  echo "ERROR: Commit description is too short. Please be more descriptive."
  echo "Minimum length: 10 characters"
  exit 1
fi

# Check for maximum line length (72 characters for the first line)
FIRST_LINE=$(echo "$COMMIT_MSG" | head -1)
if [ ${#FIRST_LINE} -gt 72 ]; then
  echo "ERROR: First line of commit message should be 72 characters or fewer."
  echo "Current length: ${#FIRST_LINE}"
  exit 1
fi
```

Make the hook executable.

```bash
# Make the hook executable
chmod +x .git/hooks/commit-msg
```

### Sharing Hooks with the Team

Git hooks live in `.git/hooks/`, which is not version-controlled. To share hooks with your team, you have several options.

**Option 1: Configure a shared hooks directory**

Store hooks in a version-controlled directory and configure Git to use it.

```bash
# Store hooks in a .githooks directory in the repository
mkdir .githooks
cp .git/hooks/commit-msg .githooks/

# Configure Git to use the shared hooks directory
git config core.hooksPath .githooks
```

Add this to your project's README or onboarding documentation so new developers set it up.

**Option 2: Use a hooks management tool**

Tools like Husky (for Node.js projects) or pre-commit (for Python projects) automate hook installation.

For a Node.js project using Husky, the setup is straightforward.

```bash
# Install Husky
npm install --save-dev husky

# Initialize Husky
npx husky init

# Add the commit-msg hook
echo '#!/bin/bash
npx --no -- commitlint --edit "$1"' > .husky/commit-msg
chmod +x .husky/commit-msg

# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Create a commitlint configuration file.

```javascript
// commitlint.config.js - Configure commitlint rules
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce specific types
    'type-enum': [
      2, // Error level
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'revert']
    ],
    // First line max length
    'header-max-length': [2, 'always', 72],
    // Description cannot be empty
    'subject-empty': [2, 'never'],
    // Type cannot be empty
    'type-empty': [2, 'never'],
    // Description should be lowercase
    'subject-case': [2, 'always', 'lower-case']
  }
};
```

## Server-Side Validation in Azure DevOps

Client-side hooks can be bypassed (with `--no-verify`). For true enforcement, you need server-side validation. Azure DevOps does not support traditional Git server-side hooks, but you can achieve the same effect through other mechanisms.

### Using Branch Policies with Status Checks

Create a pipeline that validates commit messages on pull requests and report the result as a status check.

```yaml
# azure-pipelines-commit-check.yml
# Validates commit messages in pull requests
trigger: none

pr:
  branches:
    include:
      - main
      - release/*

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Validate all commit messages in the PR
  - task: Bash@3
    displayName: 'Validate commit messages'
    inputs:
      targetType: 'inline'
      script: |
        # Pattern for Conventional Commits
        PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\([a-z0-9-]+\))?: .{3,}"

        # Get the commit range for this PR
        COMMITS=$(git log --format="%s" origin/main..HEAD)

        ERRORS=0

        while IFS= read -r MSG; do
          if [ -z "$MSG" ]; then
            continue
          fi

          if ! echo "$MSG" | grep -qE "$PATTERN"; then
            echo "INVALID: $MSG"
            ERRORS=$((ERRORS + 1))
          else
            echo "VALID: $MSG"
          fi
        done <<< "$COMMITS"

        if [ $ERRORS -gt 0 ]; then
          echo ""
          echo "##vso[task.logissue type=error]$ERRORS commit message(s) do not follow Conventional Commits format"
          echo ""
          echo "Expected format: <type>(<scope>): <description>"
          echo "Valid types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
          exit 1
        fi

        echo "All $(($(echo "$COMMITS" | wc -l))) commit messages are valid"
```

Add this pipeline as a required build policy on your protected branches. Now, even if a developer bypasses the local hook, their PR will be blocked until all commit messages comply.

### Using Azure DevOps Service Hooks

Azure DevOps service hooks can trigger external services on events like "code pushed." You can set up a webhook that calls a validation service when code is pushed, and that service can add a status to the commit.

This is more complex to set up but gives you real-time feedback on every push, not just on PRs.

## Automating Changelogs from Conventional Commits

One of the biggest benefits of consistent commit messages is automated changelog generation. Tools like `conventional-changelog` or `standard-version` can parse your commit history and generate release notes.

```bash
# Install standard-version
npm install --save-dev standard-version

# Generate a changelog and bump the version
npx standard-version
```

This reads your commit messages and generates something like:

```markdown
## [1.2.0] - 2026-02-16

### Features
- **auth**: add password reset flow via email (abc1234)
- **dashboard**: add real-time metrics widget (def5678)

### Bug Fixes
- **api**: handle null response from payment gateway (ghi9012)
- **ui**: fix alignment of navigation menu on mobile (jkl3456)
```

## Commit Message Templates

Help developers write good messages by providing a template.

```bash
# Set up a commit message template
git config commit.template .gitmessage
```

Create the template file in your repository.

```
# .gitmessage
# <type>(<scope>): <description>
#
# [optional body]
#
# [optional footer]
#
# Types: feat, fix, docs, style, refactor, test, chore, perf, ci
# Scope: component or area affected (e.g., auth, api, ui)
# Description: imperative mood, lowercase, no period at end
#
# Examples:
#   feat(auth): add Google OAuth login
#   fix(api): handle timeout in external service calls
#   docs: update deployment guide with new prerequisites
```

When a developer runs `git commit` without the `-m` flag, this template opens in their editor, reminding them of the format.

## Handling Edge Cases

**Merge commits**: If your team uses merge commits, they typically have an auto-generated message like "Merge branch 'feature/xyz' into main." Your hook should allow these.

```bash
# Allow merge commits to pass without Conventional Commits format
if echo "$COMMIT_MSG" | head -1 | grep -qE "^Merge "; then
  exit 0
fi
```

**Revert commits**: Git generates revert messages in a specific format. Allow those too.

```bash
# Allow revert commits
if echo "$COMMIT_MSG" | head -1 | grep -qE "^Revert "; then
  exit 0
fi
```

**Squash merges in PRs**: If your branch policy uses squash merges, the final commit message is the PR title. Make sure your team also applies the Conventional Commits format to PR titles.

## Wrapping Up

Enforcing commit message conventions is a small investment with outsized returns. Client-side hooks give immediate feedback and catch most issues. Server-side validation through PR pipelines provides the safety net for anything that slips through. And once you have consistent messages, you unlock automated changelogs, meaningful `git log` output, and a commit history that actually tells a story. Start with the client-side hook, add server-side validation when you are ready, and your future self (and your teammates) will thank you.
