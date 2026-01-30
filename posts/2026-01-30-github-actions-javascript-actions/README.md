# How to Create GitHub Actions JavaScript Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: GitHub Actions, JavaScript, CI/CD, Automation

Description: Build custom GitHub Actions using JavaScript with @actions/core and @actions/github for fast, cross-platform automation.

---

JavaScript actions run directly on the runner machine without containers. They start faster than Docker actions and work identically across Linux, macOS, and Windows runners. This guide walks through building a production-ready JavaScript action from scratch.

## Why JavaScript Actions?

| Feature | JavaScript Actions | Docker Actions |
|---------|-------------------|----------------|
| Startup time | ~1 second | 30+ seconds (image pull) |
| Cross-platform | Yes (Linux, macOS, Windows) | Linux only |
| Access to runner | Direct filesystem and network | Isolated container |
| Dependencies | Bundled with action | Built into image |

JavaScript actions excel when you need speed, cross-platform support, or direct access to the runner environment.

## Project Structure

A minimal JavaScript action requires three files:

```
my-action/
  action.yml       # Action metadata and interface definition
  index.js         # Entry point for the action
  package.json     # Node.js dependencies
```

For production actions, you will also add:

```
my-action/
  action.yml
  dist/
    index.js       # Bundled output from ncc
  src/
    index.js       # Source code
  package.json
```

## The action.yml File

The action.yml file defines your action's interface, including inputs, outputs, and the runtime configuration.

```yaml
name: 'PR Comment Reporter'
description: 'Posts a formatted comment on pull requests with custom content'
author: 'your-username'

# Branding appears in the GitHub Marketplace
branding:
  icon: 'message-square'
  color: 'blue'

# Define all inputs your action accepts
inputs:
  github-token:
    description: 'GitHub token for API authentication'
    required: true
  comment-body:
    description: 'The markdown content to post as a comment'
    required: true
  update-existing:
    description: 'Update an existing comment instead of creating new'
    required: false
    default: 'false'

# Define outputs other actions can consume
outputs:
  comment-id:
    description: 'The ID of the created or updated comment'
  comment-url:
    description: 'Direct URL to the comment'

# Runtime configuration for JavaScript actions
runs:
  using: 'node20'           # Node.js version (node16, node20 supported)
  main: 'dist/index.js'     # Entry point after bundling
```

The `runs.using` field specifies the Node.js runtime. GitHub currently supports `node16` and `node20`. Always use `node20` for new actions since `node16` is deprecated.

## Installing the GitHub Actions Toolkit

The official toolkit provides utilities for inputs, outputs, logging, and GitHub API access.

```bash
npm init -y
npm install @actions/core @actions/github
npm install --save-dev @vercel/ncc jest
```

| Package | Purpose |
|---------|---------|
| @actions/core | Read inputs, set outputs, logging, annotations |
| @actions/github | Authenticated Octokit client and context |
| @vercel/ncc | Bundle all dependencies into single file |
| jest | Testing framework |

## Working with @actions/core

The @actions/core package handles all interaction with the GitHub Actions runtime.

### Reading Inputs

This function retrieves input values from the workflow file. Required inputs throw an error if missing.

```javascript
const core = require('@actions/core');

// getInput returns string values from the workflow
// The 'required' option throws if the input is missing
const token = core.getInput('github-token', { required: true });
const commentBody = core.getInput('comment-body', { required: true });

// Optional inputs return empty string if not provided
const updateExisting = core.getInput('update-existing');

// getBooleanInput parses 'true'/'false' strings to boolean
const shouldUpdate = core.getBooleanInput('update-existing');

// getMultilineInput splits newline-separated values into array
const labels = core.getMultilineInput('labels');
```

### Setting Outputs

Outputs let downstream steps consume values from your action.

```javascript
const core = require('@actions/core');

// setOutput makes values available to subsequent steps
// Access with ${{ steps.step-id.outputs.output-name }}
core.setOutput('comment-id', commentId);
core.setOutput('comment-url', `https://github.com/${owner}/${repo}/pull/${prNumber}#issuecomment-${commentId}`);

// Outputs are strings, so serialize objects with JSON
const result = { success: true, count: 5 };
core.setOutput('result', JSON.stringify(result));
```

### Logging and Annotations

GitHub Actions renders different log levels with distinct styling. Annotations appear directly on files in pull requests.

```javascript
const core = require('@actions/core');

// Standard log levels
core.debug('Detailed debugging information');    // Only visible with ACTIONS_STEP_DEBUG
core.info('General information message');        // Normal output
core.notice('Important but not a problem');      // Yellow highlight
core.warning('Something might be wrong');        // Orange warning icon
core.error('Something failed');                  // Red error icon

// Annotations attach messages to specific files and lines
core.error('Syntax error in configuration', {
  title: 'Config Validation Failed',
  file: 'config.json',
  startLine: 15,
  endLine: 15
});

// Group related log output together (collapsible in UI)
core.startGroup('Installing dependencies');
console.log('npm install output here...');
core.endGroup();
```

### Handling Secrets

Actions should never log secrets. Use setSecret to mask values in logs.

```javascript
const core = require('@actions/core');

// Mark a value as secret to prevent it from appearing in logs
const apiKey = core.getInput('api-key', { required: true });
core.setSecret(apiKey);

// Now even accidental logging won't expose the secret
console.log(`Using key: ${apiKey}`);  // Prints: Using key: ***
```

## Working with @actions/github

The @actions/github package provides an authenticated Octokit client and workflow context.

### Accessing the Context

The context object contains information about the workflow run, repository, and triggering event.

```javascript
const github = require('@actions/github');

// context.repo contains owner and repo name
const { owner, repo } = github.context.repo;

// Common context properties
console.log(`Repository: ${owner}/${repo}`);
console.log(`Event: ${github.context.eventName}`);           // 'push', 'pull_request', etc.
console.log(`SHA: ${github.context.sha}`);                   // Commit SHA
console.log(`Ref: ${github.context.ref}`);                   // Branch or tag ref
console.log(`Actor: ${github.context.actor}`);               // User who triggered

// For pull_request events, get PR number from payload
if (github.context.eventName === 'pull_request') {
  const prNumber = github.context.payload.pull_request.number;
  const prTitle = github.context.payload.pull_request.title;
}
```

### Creating an Octokit Client

The getOctokit function returns an authenticated Octokit instance with retry and throttling plugins.

```javascript
const core = require('@actions/core');
const github = require('@actions/github');

// Create authenticated client using the provided token
const token = core.getInput('github-token', { required: true });
const octokit = github.getOctokit(token);

// REST API calls
const { data: issue } = await octokit.rest.issues.get({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  issue_number: 123
});

// GraphQL queries
const result = await octokit.graphql(`
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        title
        mergeable
      }
    }
  }
`, {
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  number: 42
});
```

## Building the Complete Action

Here is the full implementation with error handling and structured code.

### src/index.js

The main entry point orchestrates the action logic and handles top-level errors.

```javascript
const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    // Read all inputs
    const token = core.getInput('github-token', { required: true });
    const body = core.getInput('comment-body', { required: true });
    const updateExisting = core.getBooleanInput('update-existing');
    const commentTag = core.getInput('comment-tag') || 'pr-comment-reporter';

    // Mark token as secret to prevent accidental logging
    core.setSecret(token);

    // Create authenticated GitHub client
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    // Determine PR number from event context
    const prNumber = getPRNumber(github.context);
    if (!prNumber) {
      core.setFailed('Could not determine PR number from context');
      return;
    }

    core.info(`Processing PR #${prNumber}`);

    // Add hidden marker to identify our comments
    const marker = `<!-- ${commentTag} -->`;
    const bodyWithMarker = `${marker}\n${body}`;

    let result;
    if (updateExisting) {
      // Find existing comment with our marker
      const { data: comments } = await octokit.rest.issues.listComments({
        owner, repo, issue_number: prNumber, per_page: 100
      });
      const existing = comments.find(c => c.body.includes(marker));

      if (existing) {
        const { data: updated } = await octokit.rest.issues.updateComment({
          owner, repo, comment_id: existing.id, body: bodyWithMarker
        });
        result = { id: updated.id, url: updated.html_url };
        core.info(`Updated comment ${updated.id}`);
      }
    }

    if (!result) {
      const { data: created } = await octokit.rest.issues.createComment({
        owner, repo, issue_number: prNumber, body: bodyWithMarker
      });
      result = { id: created.id, url: created.html_url };
      core.info(`Created comment ${created.id}`);
    }

    // Set outputs for downstream steps
    core.setOutput('comment-id', result.id.toString());
    core.setOutput('comment-url', result.url);

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
    core.debug(error.stack);
  }
}

function getPRNumber(context) {
  if (context.payload.pull_request) {
    return context.payload.pull_request.number;
  }
  if (context.payload.issue && context.payload.issue.pull_request) {
    return context.payload.issue.number;
  }
  return null;
}

run();
```

## Bundling with ncc

The @vercel/ncc compiler bundles your action and all dependencies into a single file.

Add a build script to package.json:

```json
{
  "name": "pr-comment-reporter",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "ncc build src/index.js -o dist --source-map --license licenses.txt",
    "test": "jest"
  },
  "dependencies": {
    "@actions/core": "^1.10.1",
    "@actions/github": "^6.0.0"
  },
  "devDependencies": {
    "@vercel/ncc": "^0.38.1",
    "jest": "^29.7.0"
  }
}
```

Run the build and commit the dist folder:

```bash
npm run build
git add dist/
git commit -m "Build action"
```

| Option | Purpose |
|--------|---------|
| -o dist | Output directory for bundled files |
| --source-map | Generate source maps for debugging |
| --license licenses.txt | Collect all dependency licenses |

## Testing Your Action

### Unit Tests with Jest

Test your action logic in isolation from the GitHub Actions runtime.

```javascript
// src/index.test.js
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  setSecret: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test', repo: 'repo' },
    payload: { pull_request: { number: 1 } }
  },
  getOctokit: jest.fn()
}));

const core = require('@actions/core');
const github = require('@actions/github');

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates comment on PR', async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'github-token': 'fake-token',
        'comment-body': 'Test comment'
      };
      return inputs[name] || '';
    });
    core.getBooleanInput.mockReturnValue(false);

    const mockOctokit = {
      rest: {
        issues: {
          createComment: jest.fn().mockResolvedValue({
            data: { id: 123, html_url: 'https://github.com/test/repo/pull/1#issuecomment-123' }
          })
        }
      }
    };
    github.getOctokit.mockReturnValue(mockOctokit);

    // Run action
    await require('./index');

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('comment-id', '123');
  });
});
```

### Integration Testing with Workflows

Create a test workflow in .github/workflows/test-action.yml:

```yaml
name: Test Action

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test-action:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install and test
        run: npm ci && npm test

      - name: Test comment creation
        if: github.event_name == 'pull_request'
        uses: ./
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          comment-body: |
            ## Test Report
            Run ID: ${{ github.run_id }}
          update-existing: 'true'
```

## Error Handling Patterns

### Retrying Failed Operations

Wrap flaky operations with retry logic.

```javascript
async function withRetry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on authentication errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      if (attempt < maxAttempts) {
        core.warning(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;  // Exponential backoff
      }
    }
  }

  throw lastError;
}

// Usage
const result = await withRetry(async () => {
  return await octokit.rest.issues.createComment({
    owner, repo, issue_number: prNumber, body: commentBody
  });
});
```

## Publishing Your Action

### Versioning Strategy

Use semantic versioning with major version tags for consumers.

```bash
# Create a release tag
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# Create or update the major version tag
git tag -fa v1 -m "Update v1 tag"
git push origin v1 --force
```

Users reference your action with the major version:

```yaml
- uses: your-username/pr-comment-reporter@v1
```

### Publishing to GitHub Marketplace

1. Ensure your action.yml has name, description, and branding
2. Create a public repository
3. Create a release with release notes
4. Check "Publish this Action to the GitHub Marketplace" when creating the release

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| Token permissions | Request minimum required permissions |
| Dependency vulnerabilities | Run npm audit, use Dependabot |
| Secrets in logs | Use core.setSecret for all sensitive values |
| Malicious inputs | Validate and sanitize all user inputs |

## Using Your Action in Workflows

Once published, use your action in any workflow.

```yaml
name: PR Feedback

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write

jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        id: tests
        run: npm test

      - name: Post test results
        uses: your-username/pr-comment-reporter@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          comment-body: |
            ## Test Results
            Tests completed for commit ${{ github.sha }}
          update-existing: 'true'
```

---

JavaScript actions provide fast, cross-platform automation with direct access to the GitHub API. With @actions/core for runtime interaction, @actions/github for API access, and ncc for bundling, you can build production-ready actions that run in seconds. Start with a simple action.yml, build up your logic with proper error handling, and publish with semantic versioning.
