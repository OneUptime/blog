# How to Use Postman CLI (Newman) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, API Testing, Newman, Postman, DevOps

Description: Learn how to install and use Newman, the Postman CLI tool, on Ubuntu to run API test collections from the command line and integrate them into CI/CD pipelines.

---

Newman is the command-line companion to Postman. It lets you run Postman collections directly from a terminal, making it straightforward to automate API tests in CI/CD pipelines, schedule them via cron, or simply run them headlessly on a server. This guide walks through installing Newman on Ubuntu, running collections, and getting useful reports out of it.

## Prerequisites

Newman is a Node.js package, so you need Node.js installed. The recommended way on Ubuntu is through NodeSource's official repo, which keeps Node.js up to date.

```bash
# Install curl if not already present
sudo apt-get update && sudo apt-get install -y curl

# Add NodeSource repository for Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js (includes npm)
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Installing Newman

With Node.js ready, Newman installs as a global npm package.

```bash
# Install Newman globally
sudo npm install -g newman

# Verify Newman is accessible
newman --version
```

If you want HTML reports (highly recommended for CI), install the HTML reporter too:

```bash
# Install the HTML extra reporter for richer output
sudo npm install -g newman-reporter-htmlextra
```

## Exporting a Collection from Postman

Before running anything, you need a collection file. From the Postman desktop app:

1. Open your collection in Postman
2. Click the three dots next to the collection name
3. Select "Export"
4. Choose "Collection v2.1" format
5. Save the JSON file to your Ubuntu server (e.g., `/home/ubuntu/collections/my-api.json`)

If you also use Postman environments (for variables like base URLs and auth tokens), export those too via Manage Environments -> Export.

## Running a Basic Collection

The simplest Newman run just takes the collection file:

```bash
# Run a collection with default console output
newman run /home/ubuntu/collections/my-api.json
```

You'll see a summary at the end showing passed/failed tests, response times, and any assertion failures.

### Running with an Environment File

Real-world collections usually need environment variables:

```bash
# Run collection with environment variables
newman run /home/ubuntu/collections/my-api.json \
  --environment /home/ubuntu/collections/staging.postman_environment.json
```

### Passing Variables Inline

You can override specific variables without modifying the environment file:

```bash
# Override base_url and auth_token at runtime
newman run /home/ubuntu/collections/my-api.json \
  --env-var "base_url=https://api.staging.example.com" \
  --env-var "auth_token=Bearer eyJhbGciOiJSUzI1NiJ9..."
```

## Generating Reports

Console output is useful for quick checks, but HTML reports are more readable for sharing.

```bash
# Generate an HTML report using htmlextra
newman run /home/ubuntu/collections/my-api.json \
  --environment /home/ubuntu/collections/staging.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export /tmp/reports/api-test-report.html
```

The `htmlextra` reporter produces a detailed breakdown with request/response bodies, timings, and a test summary. Open it in a browser to review failures.

For JUnit XML output (useful for CI systems like Jenkins or GitLab):

```bash
# Generate JUnit XML for CI integration
newman run /home/ubuntu/collections/my-api.json \
  --reporters cli,junit \
  --reporter-junit-export /tmp/reports/results.xml
```

## Controlling Execution Behavior

### Iterations and Data Files

Newman can run a collection multiple times with different data using a CSV or JSON data file:

```bash
# Run collection with a data file (runs once per row in CSV)
newman run /home/ubuntu/collections/my-api.json \
  --iteration-data /home/ubuntu/collections/test-data.csv \
  --iterations 5
```

### Timeout and Delay Settings

For flaky APIs or rate-limited endpoints:

```bash
# Set request timeout and add delay between requests
newman run /home/ubuntu/collections/my-api.json \
  --timeout-request 10000 \   # 10 second request timeout
  --delay-request 500          # 500ms delay between requests
```

### Stopping on First Failure

Useful when debugging to avoid noise from cascading failures:

```bash
# Stop execution after first failed test
newman run /home/ubuntu/collections/my-api.json \
  --bail
```

## Integrating Newman into a CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [main, staging]
  schedule:
    # Run every hour
    - cron: '0 * * * *'

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Newman
        run: npm install -g newman newman-reporter-htmlextra

      - name: Run API Tests
        run: |
          newman run collections/my-api.json \
            --environment collections/staging.postman_environment.json \
            --env-var "auth_token=${{ secrets.API_AUTH_TOKEN }}" \
            --reporters cli,junit,htmlextra \
            --reporter-junit-export results/junit.xml \
            --reporter-htmlextra-export results/report.html

      - name: Upload Test Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: api-test-report
          path: results/
```

### Running as a Cron Job on Ubuntu

For scheduled API health checks:

```bash
# Create a wrapper script
cat > /home/ubuntu/scripts/run-api-tests.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="/var/log/api-tests"
mkdir -p "$REPORT_DIR"

newman run /home/ubuntu/collections/my-api.json \
  --environment /home/ubuntu/collections/production.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/report_$TIMESTAMP.html" \
  >> "$REPORT_DIR/newman_$TIMESTAMP.log" 2>&1

# Keep only last 30 reports
ls -t "$REPORT_DIR"/*.html | tail -n +31 | xargs rm -f
EOF

chmod +x /home/ubuntu/scripts/run-api-tests.sh

# Add to crontab - run every 15 minutes
crontab -e
# Add this line:
# */15 * * * * /home/ubuntu/scripts/run-api-tests.sh
```

## Working with Newman Programmatically

If you need more control, Newman can be used as a Node.js module:

```javascript
// run-tests.js
const newman = require('newman');

newman.run({
  collection: require('/home/ubuntu/collections/my-api.json'),
  environment: require('/home/ubuntu/collections/staging.postman_environment.json'),
  reporters: ['cli', 'htmlextra'],
  reporter: {
    htmlextra: {
      export: '/tmp/api-report.html',
      title: 'My API Test Report'
    }
  }
}, function (err, summary) {
  if (err) {
    console.error('Newman run failed:', err);
    process.exit(1);
  }

  const failures = summary.run.failures.length;
  if (failures > 0) {
    console.error(`${failures} test(s) failed`);
    process.exit(1);
  }

  console.log('All tests passed');
});
```

Run it with:

```bash
node /home/ubuntu/scripts/run-tests.js
```

## Troubleshooting Common Issues

**SSL certificate errors** - If you're testing internal APIs with self-signed certs:

```bash
# Disable SSL verification (only for internal/dev environments)
newman run /home/ubuntu/collections/my-api.json --insecure
```

**Connection refused errors** - Check if the API is actually reachable from the Ubuntu host:

```bash
# Test basic connectivity before running Newman
curl -I https://api.staging.example.com/health
```

**Environment variable not substituted** - Make sure the variable name in the collection matches exactly (case-sensitive) what's in the environment file.

Newman is a solid tool for keeping API contract tests running outside of the Postman desktop. Once your collections are version-controlled and Newman is wired into your pipeline, you get a reliable feedback loop on API behavior without relying on anyone to manually click through tests.
