# How to Test Dapr Jobs Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Testing, Local Development, Scheduler

Description: Learn how to test Dapr Jobs locally using self-hosted mode, manually triggering job handlers, and verifying job creation and execution during development.

---

Testing Dapr Jobs locally requires running the Dapr Scheduler service in self-hosted mode and verifying both job creation and handler execution. This guide covers practical approaches for local job testing without a Kubernetes cluster.

## Prerequisites

Ensure Dapr is initialized in self-hosted mode with the Scheduler service:

```bash
dapr init
```

Verify the Scheduler and other Dapr services are running:

```bash
docker ps
```

Expected output includes containers for:

```text
dapr_scheduler
dapr_placement
dapr_redis
dapr_zipkin
```

If the Scheduler is not running, upgrade Dapr CLI and reinitialize:

```bash
dapr uninstall --all
dapr init
```

## Running Your App with Dapr Locally

```bash
dapr run \
  --app-id job-test-app \
  --app-port 6001 \
  --dapr-http-port 3500 \
  --log-level debug \
  -- node app.js
```

## Creating and Testing a Job

Create a short-interval job to quickly test triggering:

```bash
# Create a job that fires every 10 seconds
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/local-test-job \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 10s",
    "repeats": 3,
    "data": {
      "test": true,
      "iteration": 1
    }
  }'

echo "Job created, waiting for trigger..."
```

Verify the job was created:

```bash
curl http://localhost:3500/v1.0-alpha1/jobs/local-test-job
```

## Manually Triggering the Handler

For faster iteration, test the handler endpoint directly without waiting for the scheduler:

```bash
# Simulate what Dapr sends when a job fires
curl -X POST http://localhost:6001/job/local-test-job \
  -H "Content-Type: application/json" \
  -H "dapr-app-id: job-test-app" \
  -d '{
    "name": "local-test-job",
    "data": {
      "test": true
    }
  }'
```

## Writing Unit Tests for Job Handlers

Test job handlers independently of Dapr:

```javascript
// handler.test.js
const request = require('supertest');
const app = require('./app');

describe('Job Handlers', () => {
  describe('POST /job/daily-cleanup', () => {
    it('should return 200 for valid job payload', async () => {
      const response = await request(app)
        .post('/job/daily-cleanup')
        .send({
          name: 'daily-cleanup',
          data: { target: 'sessions', olderThan: '24h' }
        });

      expect(response.status).toBe(200);
    });

    it('should handle missing data gracefully', async () => {
      const response = await request(app)
        .post('/job/daily-cleanup')
        .send({});

      expect(response.status).toBe(200);
    });
  });
});
```

Run tests:

```bash
npm test
```

## Integration Testing with a Real Scheduler

Create a test script that verifies end-to-end job execution:

```bash
#!/bin/bash
# test-jobs.sh

APP_ID="job-test-app"
DAPR_PORT="3500"

echo "Creating test job..."
curl -s -X POST http://localhost:${DAPR_PORT}/v1.0-alpha1/jobs/e2e-test \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 5s",
    "repeats": 1,
    "data": "e2e-test"
  }'

echo "Waiting 8 seconds for job to trigger..."
sleep 8

echo "Checking state for execution record..."
RESULT=$(curl -s http://localhost:${DAPR_PORT}/v1.0/state/statestore/job:e2e-test:latest)

if echo "$RESULT" | grep -q "success"; then
  echo "PASS: Job executed successfully"
else
  echo "FAIL: Job execution not recorded"
  exit 1
fi

# Cleanup
curl -s -X DELETE http://localhost:${DAPR_PORT}/v1.0-alpha1/jobs/e2e-test
echo "Test complete"
```

## Deleting Test Jobs

Clean up test jobs after testing:

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/local-test-job
curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/e2e-test
```

## Summary

Testing Dapr Jobs locally involves running the Scheduler service via `dapr init`, creating short-interval jobs for quick validation, and directly testing handler endpoints for faster iteration. Combining unit tests for handler logic with integration tests against the real Scheduler provides comprehensive coverage before deploying to production.
