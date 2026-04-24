# How to Build a Custom Dashboard Using the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Dashboard, Automation, JavaScript

Description: Build a custom real-time container monitoring dashboard by querying the Portainer REST API using JavaScript and HTML.

## Introduction

The Portainer REST API exposes all the data visible in the Portainer UI, plus more. By building a custom dashboard, you can tailor the view to your organization's specific needs-whether that's a NOC display, a developer portal, or an executive summary.

## Prerequisites

- Portainer CE or BE with API access
- Portainer access token or credentials
- Basic knowledge of HTML, JavaScript, and REST APIs

## Getting Your Access Token

```bash
# Authenticate and retrieve a JWT token

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword"}' \
  https://portainer.example.com/api/auth | python3 -m json.tool

# Extract the JWT token
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword"}' \
  https://portainer.example.com/api/auth | python3 -c "import sys, json; print(json.load(sys.stdin)['jwt'])")

echo "Token: $TOKEN"
```

For longer-lived access, create a Portainer access token:

```bash
# In the Portainer UI:
# Click your username in the top-right > My account
# Then create a token in the Access tokens section

# Use the access token in headers
curl -H "X-API-Key: your-access-token" \
  https://portainer.example.com/api/endpoints
```

## Exploring the API

```bash
# List all environments/endpoints
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints | python3 -m json.tool

# Get containers for an environment (endpoint ID 1)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/json?all=true" \
  | python3 -m json.tool

# Get running containers count
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/json" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Running containers: {len(data)}')"
```

## Building the Dashboard

Create `dashboard.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Container Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; background: #1a1a2e; color: #eee; margin: 0; padding: 20px; }
        h1 { color: #00b4d8; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #16213e; border-radius: 8px; padding: 16px; border-left: 4px solid #00b4d8; }
        .running { border-color: #4caf50; }
        .stopped { border-color: #f44336; }
        .stat-box { background: #0f3460; border-radius: 8px; padding: 20px; text-align: center; }
        .stat-number { font-size: 3em; font-weight: bold; color: #00b4d8; }
        .stats-row { display: flex; gap: 20px; margin-bottom: 30px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        .badge-green { background: #4caf50; }
        .badge-red { background: #f44336; }
        .refresh-btn { background: #00b4d8; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Container Dashboard</h1>
    <button class="refresh-btn" onclick="loadData()">Refresh</button>
    <div id="stats" class="stats-row"></div>
    <div id="containers" class="grid"></div>

    <script>
        // Configuration
        // Serve this page from the same origin as Portainer, such as behind the same reverse proxy.
        const PORTAINER_API_BASE = '/api';
        const ENDPOINT_ID = 1;
        let accessToken = '';

        function getHeaders() {
            if (!accessToken) {
                accessToken = window.prompt('Enter your Portainer access token');
                if (!accessToken) {
                    throw new Error('A Portainer access token is required.');
                }
            }

            return { 'X-API-Key': accessToken };
        }

        async function loadData() {
            try {
                // Fetch all containers
                const resp = await fetch(
                    `${PORTAINER_API_BASE}/endpoints/${ENDPOINT_ID}/docker/containers/json?all=true`,
                    { headers: getHeaders() }
                );
                if (!resp.ok) {
                    throw new Error(`Portainer API request failed: ${resp.status}`);
                }
                const containers = await resp.json();

                // Calculate stats
                const running = containers.filter(c => c.State === 'running').length;
                const notRunning = containers.filter(c => c.State !== 'running').length;
                const total = containers.length;

                // Render stats
                document.getElementById('stats').innerHTML = `
                    <div class="stat-box">
                        <div class="stat-number">${total}</div>
                        <div>Total</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number" style="color:#4caf50">${running}</div>
                        <div>Running</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number" style="color:#f44336">${notRunning}</div>
                        <div>Not Running</div>
                    </div>
                `;

                // Render containers
                const containerHTML = containers.map(c => `
                    <div class="card ${c.State === 'running' ? 'running' : 'stopped'}">
                        <h3>${(c.Names?.[0] || c.Id).replace('/', '')}</h3>
                        <p><strong>Image:</strong> ${c.Image}</p>
                        <p><strong>Status:</strong> 
                            <span class="badge ${c.State === 'running' ? 'badge-green' : 'badge-red'}">
                                ${c.State}
                            </span>
                        </p>
                        <p><strong>Created:</strong> ${new Date(c.Created * 1000).toLocaleDateString()}</p>
                        <p><strong>ID:</strong> ${c.Id.substring(0, 12)}</p>
                    </div>
                `).join('');

                document.getElementById('containers').innerHTML = containerHTML;
            } catch (err) {
                console.error('Failed to load data:', err);
            }
        }

        // Load data on page load and refresh every 30 seconds
        loadData();
        setInterval(loadData, 30000);
    </script>
</body>
</html>
```

## Serving the Dashboard

Serve the dashboard from the same origin as Portainer, such as behind your existing reverse proxy. If you serve it from a different origin, browser CORS rules apply to the custom `X-API-Key` header.

```bash
# Serve with Python
python3 -m http.server 8080

# Or with Node.js
npx serve .

# Or with nginx
docker run -d \
  -p 80:80 \
  -v $(pwd)/dashboard.html:/usr/share/nginx/html/index.html \
  nginx:alpine
```

## Adding More Metrics

```bash
# Get system-level stats
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/info" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'CPUs: {d[\"NCPU\"]}, Memory: {d[\"MemTotal\"]//1024//1024}MB')"

# Get volume information
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/volumes" \
  | python3 -m json.tool
```

## Conclusion

The Portainer API makes it straightforward to build customized dashboards for your specific operational needs. You can extend this example to include real-time CPU/memory stats, container restart counts, alert thresholds, and multi-environment views. The dashboard can be embedded in tools like Grafana, SharePoint, or served as a standalone web page.
