# How to Get Started with k6 for Load Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k6, Load Testing, Performance Testing, API Testing, DevOps

Description: Learn how to get started with k6 for load testing APIs and web applications, including test scripts, virtual users, and result analysis.

---

> Load testing is not about breaking your system - it is about understanding its limits before your users discover them.
>
> k6 makes load testing accessible by using JavaScript for test scripts, making it easy for developers to write, maintain, and integrate performance tests into their workflow.

Performance matters. A slow API frustrates users, hurts conversions, and damages trust. Load testing helps you find bottlenecks before they become production incidents. k6 is one of the best tools for this job.

---

## What is k6?

k6 is an open-source load testing tool built for developers. It uses JavaScript (ES6) for writing test scripts, runs tests from the command line, and produces detailed metrics about your system's performance under load.

Key features:
- **JavaScript-based scripts** - Write tests in a language you already know
- **CLI-first design** - Easy to run locally or in CI/CD pipelines
- **Low resource consumption** - Single binary, efficient execution
- **Built-in metrics** - HTTP request duration, throughput, error rates
- **Extensible** - Custom metrics, thresholds, and output formats

---

## Installation

k6 is available on all major platforms.

**macOS (Homebrew):**
```bash
brew install k6
```

**Windows (Chocolatey):**
```bash
choco install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

Verify the installation:
```bash
k6 version
```

---

## Writing Your First Test Script

Create a file called `script.js`:

```javascript
// Import the http module from k6
import http from 'k6/http';

// Import sleep to add delays between iterations
import { sleep } from 'k6';

// The default function runs once per virtual user per iteration
export default function () {
  // Make a GET request to your API endpoint
  http.get('https://test-api.k6.io/public/crocodiles/');

  // Wait 1 second before the next iteration
  // This simulates realistic user behavior
  sleep(1);
}
```

Run it with:
```bash
k6 run script.js
```

By default, k6 runs with 1 virtual user (VU) for 1 iteration. You will see output showing request metrics like duration, requests per second, and data transferred.

---

## Virtual Users and Iterations

Virtual users (VUs) simulate concurrent users hitting your system. Each VU runs your test function in a loop.

**Run with 10 VUs for 30 seconds:**
```bash
k6 run --vus 10 --duration 30s script.js
```

**Or configure it in the script:**
```javascript
import http from 'k6/http';
import { sleep } from 'k6';

// Export options to configure the test
export const options = {
  // Number of virtual users to simulate
  vus: 10,
  // How long to run the test
  duration: '30s',
};

export default function () {
  http.get('https://test-api.k6.io/public/crocodiles/');
  sleep(1);
}
```

The relationship between VUs and iterations:
- Each VU runs the default function repeatedly
- More VUs = more concurrent load
- Longer duration = more total iterations
- `sleep()` controls the pace of requests per VU

---

## Stages for Ramping Load

Real traffic does not jump from 0 to 1000 users instantly. Use stages to gradually increase and decrease load:

```javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    // Ramp up from 0 to 50 VUs over 2 minutes
    { duration: '2m', target: 50 },

    // Stay at 50 VUs for 5 minutes (steady state)
    { duration: '5m', target: 50 },

    // Ramp up to 100 VUs over 2 minutes (stress test)
    { duration: '2m', target: 100 },

    // Stay at 100 VUs for 5 minutes
    { duration: '5m', target: 100 },

    // Ramp down to 0 over 2 minutes (cool down)
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  http.get('https://your-api.example.com/endpoint');
  sleep(1);
}
```

Common load testing patterns:
- **Load test**: Gradual ramp to expected peak traffic
- **Stress test**: Push beyond normal limits to find breaking points
- **Spike test**: Sudden burst of traffic
- **Soak test**: Sustained load over hours to find memory leaks

---

## Checks and Assertions

Checks validate that your API returns expected results. They do not stop the test on failure but report pass/fail rates:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  // Make request and store the response
  const response = http.get('https://test-api.k6.io/public/crocodiles/');

  // Run checks on the response
  check(response, {
    // Verify HTTP status is 200
    'status is 200': (r) => r.status === 200,

    // Verify response time is under 500ms
    'response time < 500ms': (r) => r.timings.duration < 500,

    // Verify response body contains expected data
    'body contains crocodiles': (r) => r.body.includes('crocodile'),

    // Verify content-type header
    'content-type is JSON': (r) =>
      r.headers['Content-Type'].includes('application/json'),
  });

  sleep(1);
}
```

Checks appear in the output summary showing the percentage that passed:

```
checks.........................: 98.50% (394 out of 400)
  status is 200................: 100.00% (100 out of 100)
  response time < 500ms........: 95.00% (95 out of 100)
```

---

## Thresholds for Pass/Fail

Thresholds define success criteria. If a threshold fails, k6 exits with a non-zero code - perfect for CI/CD:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',

  thresholds: {
    // 95% of requests must complete below 500ms
    http_req_duration: ['p(95)<500'],

    // 99% of requests must complete below 1500ms
    'http_req_duration': ['p(99)<1500'],

    // Request failure rate must be below 1%
    http_req_failed: ['rate<0.01'],

    // 95% of checks must pass
    checks: ['rate>0.95'],

    // Custom threshold for specific requests (using tags)
    'http_req_duration{name:login}': ['p(95)<300'],
  },
};

export default function () {
  // Tag requests to apply specific thresholds
  const loginResponse = http.post(
    'https://test-api.k6.io/auth/token/login/',
    JSON.stringify({ username: 'test', password: 'test' }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    }
  );

  check(loginResponse, {
    'login successful': (r) => r.status === 200,
  });

  sleep(1);
}
```

Common threshold metrics:
- `http_req_duration` - Request time (supports p50, p90, p95, p99, avg, min, max)
- `http_req_failed` - Rate of failed requests
- `http_reqs` - Total request count
- `checks` - Check pass rate
- `iterations` - Completed iterations

---

## Running Tests

**Basic run:**
```bash
k6 run script.js
```

**With environment variables:**
```bash
k6 run -e BASE_URL=https://staging.example.com script.js
```

Access in script:
```javascript
const baseUrl = __ENV.BASE_URL || 'https://default.example.com';
```

**Output results to JSON:**
```bash
k6 run --out json=results.json script.js
```

**Output to InfluxDB for Grafana dashboards:**
```bash
k6 run --out influxdb=http://localhost:8086/k6 script.js
```

**Run with Docker:**
```bash
docker run --rm -i grafana/k6 run - < script.js
```

---

## Analyzing Results

After a test run, k6 outputs a summary:

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/

  execution: local
     script: script.js
     output: -

  scenarios: (100.00%) 1 scenario, 50 max VUs, 2m30s max duration
           default: 50 looping VUs for 2m0s

  data_received..................: 12 MB  98 kB/s
  data_sent......................: 1.2 MB 10 kB/s
  http_req_blocked...............: avg=2.1ms   p(95)=8.5ms
  http_req_connecting............: avg=1.8ms   p(95)=7.2ms
  http_req_duration..............: avg=123ms   p(95)=245ms
  http_req_failed................: 0.50%  (25 out of 5000)
  http_req_receiving.............: avg=0.5ms   p(95)=1.2ms
  http_req_sending...............: avg=0.2ms   p(95)=0.5ms
  http_req_waiting...............: avg=122ms   p(95)=243ms
  http_reqs......................: 5000   41.6/s
  iteration_duration.............: avg=1.12s   p(95)=1.25s
  iterations.....................: 5000   41.6/s
  vus............................: 50     min=50  max=50
  vus_max........................: 50     min=50  max=50
```

Key metrics to focus on:
- **http_req_duration p(95)**: 95th percentile response time
- **http_req_failed**: Percentage of failed requests
- **http_reqs**: Requests per second (throughput)
- **iteration_duration**: Time for one complete test iteration

For deeper analysis, export to JSON and visualize with tools like Grafana, or use k6 Cloud for hosted dashboards.

---

## Integration with CI/CD

k6 works well in CI/CD pipelines. Here is a GitHub Actions example:

```yaml
name: Load Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        run: k6 run --out json=results.json tests/load-test.js

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json
```

The test fails the pipeline if thresholds are not met, preventing performance regressions from reaching production.

---

## Best Practices Summary

| Practice | Why It Matters |
|----------|----------------|
| Start with realistic VU counts | Match expected production traffic patterns |
| Use stages for gradual ramp-up | Avoid shocking the system and find breaking points gradually |
| Add checks for response validation | Catch functional issues, not just performance |
| Set thresholds for CI/CD gates | Automate performance regression detection |
| Use tags for granular metrics | Track different endpoints separately |
| Run tests against staging first | Avoid impacting production users |
| Test regularly, not just before launch | Catch regressions early in the development cycle |
| Keep tests in version control | Track changes and collaborate with team |

---

## Summary

k6 makes load testing approachable for developers. Start with a simple script, add checks and thresholds, and integrate into your CI/CD pipeline. Regular load testing catches performance issues before they become production incidents.

The key steps:
1. Install k6 on your platform
2. Write a basic test script with `http.get()` and `sleep()`
3. Configure VUs and duration for your load profile
4. Add checks to validate responses
5. Set thresholds to define success criteria
6. Run tests regularly in CI/CD

Performance is a feature. Treat it like one.

---

*Need to monitor your application's performance in production? [OneUptime](https://oneuptime.com) provides comprehensive observability with metrics, traces, and logs - giving you visibility into how your system performs under real user load.*
