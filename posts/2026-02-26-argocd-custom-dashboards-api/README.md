# How to Build Custom Dashboards with ArgoCD API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Dashboards, Monitoring

Description: Learn how to build custom dashboards using the ArgoCD API to create tailored views for teams, executives, and operations with real-time deployment data.

---

The ArgoCD UI is great for day-to-day operations, but teams often need custom views tailored to their specific needs. Executives want high-level deployment metrics. On-call engineers want a health overview. Development teams want their own applications front and center. The ArgoCD API gives you all the data you need to build these custom dashboards.

## Dashboard Data Architecture

A custom dashboard typically pulls data from several ArgoCD API endpoints and transforms it into views that make sense for different audiences:

```mermaid
graph TD
    A[ArgoCD API] --> B[/api/v1/applications]
    A --> C[/api/v1/stream/applications]
    A --> D[/api/v1/applications/name/resource-tree]
    A --> E[/api/v1/settings]

    B --> F[Status Summary]
    B --> G[Project Overview]
    C --> H[Real-time Updates]
    D --> I[Resource Details]

    F --> J[Custom Dashboard]
    G --> J
    H --> J
    I --> J
```

## Collecting Dashboard Data

### Application Summary Endpoint

Build a summary dataset from the applications list:

```python
import requests
from collections import Counter, defaultdict
from datetime import datetime

class DashboardData:
    def __init__(self, server, token):
        self.server = server.rstrip('/')
        self.headers = {"Authorization": f"Bearer {token}"}
        self.verify = False

    def get_summary(self):
        """Get a complete dashboard summary."""
        resp = requests.get(
            f"{self.server}/api/v1/applications",
            headers=self.headers,
            verify=self.verify
        )
        apps = resp.json().get("items", [])

        return {
            "total_apps": len(apps),
            "health_summary": self._health_summary(apps),
            "sync_summary": self._sync_summary(apps),
            "project_summary": self._project_summary(apps),
            "team_summary": self._team_summary(apps),
            "recent_syncs": self._recent_syncs(apps),
            "degraded_apps": self._degraded_details(apps),
            "timestamp": datetime.utcnow().isoformat()
        }

    def _health_summary(self, apps):
        counts = Counter(
            a["status"]["health"]["status"] for a in apps
        )
        return dict(counts)

    def _sync_summary(self, apps):
        counts = Counter(
            a["status"]["sync"]["status"] for a in apps
        )
        return dict(counts)

    def _project_summary(self, apps):
        projects = defaultdict(lambda: {"total": 0, "healthy": 0, "degraded": 0})
        for app in apps:
            proj = app["spec"]["project"]
            health = app["status"]["health"]["status"]
            projects[proj]["total"] += 1
            if health == "Healthy":
                projects[proj]["healthy"] += 1
            elif health == "Degraded":
                projects[proj]["degraded"] += 1
        return dict(projects)

    def _team_summary(self, apps):
        teams = defaultdict(list)
        for app in apps:
            team = app["metadata"].get("labels", {}).get("team", "unassigned")
            teams[team].append({
                "name": app["metadata"]["name"],
                "health": app["status"]["health"]["status"],
                "sync": app["status"]["sync"]["status"]
            })
        return dict(teams)

    def _recent_syncs(self, apps, limit=10):
        synced = []
        for app in apps:
            op_state = app["status"].get("operationState", {})
            if op_state.get("finishedAt"):
                synced.append({
                    "name": app["metadata"]["name"],
                    "finished": op_state["finishedAt"],
                    "phase": op_state.get("phase", "Unknown"),
                    "revision": op_state.get("syncResult", {}).get("revision", "")[:8]
                })
        synced.sort(key=lambda x: x["finished"], reverse=True)
        return synced[:limit]

    def _degraded_details(self, apps):
        degraded = []
        for app in apps:
            if app["status"]["health"]["status"] == "Degraded":
                degraded.append({
                    "name": app["metadata"]["name"],
                    "project": app["spec"]["project"],
                    "message": app["status"]["health"].get("message", ""),
                    "last_sync": app["status"].get("operationState", {}).get("finishedAt")
                })
        return degraded
```

## Building a Flask Dashboard

Here is a complete web dashboard using Flask:

```python
from flask import Flask, render_template_string, jsonify
import requests
import json

app = Flask(__name__)

ARGOCD_SERVER = "https://argocd.example.com"
ARGOCD_TOKEN = "your-token-here"

DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>ArgoCD Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: #0d1117; color: #c9d1d9; }
        .header { background: #161b22; padding: 16px 24px; border-bottom: 1px solid #30363d; }
        .header h1 { font-size: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 24px; }
        .card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; }
        .card h3 { font-size: 14px; color: #8b949e; margin-bottom: 8px; }
        .card .value { font-size: 32px; font-weight: bold; }
        .healthy { color: #3fb950; }
        .degraded { color: #f85149; }
        .progressing { color: #d29922; }
        .outofsync { color: #db6d28; }
        .table { width: 100%; padding: 0 24px 24px; }
        table { width: 100%; border-collapse: collapse; background: #161b22; border-radius: 6px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #30363d; }
        th { background: #21262d; font-size: 12px; text-transform: uppercase; color: #8b949e; }
        .badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        .badge-healthy { background: #238636; }
        .badge-degraded { background: #da3633; }
        .badge-progressing { background: #9e6a03; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ArgoCD Deployment Dashboard</h1>
    </div>
    <div class="grid">
        <div class="card">
            <h3>Total Applications</h3>
            <div class="value">{{ data.total_apps }}</div>
        </div>
        <div class="card">
            <h3>Healthy</h3>
            <div class="value healthy">{{ data.health_summary.get('Healthy', 0) }}</div>
        </div>
        <div class="card">
            <h3>Degraded</h3>
            <div class="value degraded">{{ data.health_summary.get('Degraded', 0) }}</div>
        </div>
        <div class="card">
            <h3>Progressing</h3>
            <div class="value progressing">{{ data.health_summary.get('Progressing', 0) }}</div>
        </div>
        <div class="card">
            <h3>Out of Sync</h3>
            <div class="value outofsync">{{ data.sync_summary.get('OutOfSync', 0) }}</div>
        </div>
    </div>

    {% if data.degraded_apps %}
    <div class="table">
        <h2 style="padding: 0 0 12px; color: #f85149;">Degraded Applications</h2>
        <table>
            <tr><th>Application</th><th>Project</th><th>Message</th></tr>
            {% for app in data.degraded_apps %}
            <tr>
                <td>{{ app.name }}</td>
                <td>{{ app.project }}</td>
                <td>{{ app.message }}</td>
            </tr>
            {% endfor %}
        </table>
    </div>
    {% endif %}

    <div class="table">
        <h2 style="padding: 0 0 12px;">Recent Syncs</h2>
        <table>
            <tr><th>Application</th><th>Revision</th><th>Status</th><th>Time</th></tr>
            {% for sync in data.recent_syncs %}
            <tr>
                <td>{{ sync.name }}</td>
                <td><code>{{ sync.revision }}</code></td>
                <td><span class="badge badge-{{ sync.phase | lower }}">{{ sync.phase }}</span></td>
                <td>{{ sync.finished }}</td>
            </tr>
            {% endfor %}
        </table>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>
"""

@app.route('/')
def dashboard():
    data_client = DashboardData(ARGOCD_SERVER, ARGOCD_TOKEN)
    data = data_client.get_summary()
    return render_template_string(DASHBOARD_HTML, data=data)

@app.route('/api/summary')
def api_summary():
    data_client = DashboardData(ARGOCD_SERVER, ARGOCD_TOKEN)
    return jsonify(data_client.get_summary())

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Grafana Dashboard with ArgoCD API

If you already use Grafana, use the JSON API data source to pull from ArgoCD:

```bash
# Create a simple API proxy that transforms ArgoCD data for Grafana
# This runs as a small service alongside Grafana

cat > argocd-grafana-proxy.py << 'SCRIPT'
from flask import Flask, jsonify
import requests

app = Flask(__name__)

ARGOCD_SERVER = "https://argocd.example.com"
ARGOCD_TOKEN = "your-token-here"

@app.route('/metrics')
def metrics():
    """Return metrics in a format Grafana JSON datasource understands."""
    resp = requests.get(
        f"{ARGOCD_SERVER}/api/v1/applications",
        headers={"Authorization": f"Bearer {ARGOCD_TOKEN}"},
        verify=False
    )
    apps = resp.json().get("items", [])

    metrics = []
    for app_data in apps:
        name = app_data["metadata"]["name"]
        health = app_data["status"]["health"]["status"]
        sync = app_data["status"]["sync"]["status"]

        # Convert health to numeric value for Grafana
        health_value = {
            "Healthy": 1, "Progressing": 0.5,
            "Degraded": 0, "Missing": -1, "Unknown": -0.5
        }.get(health, -1)

        metrics.append({
            "target": name,
            "health": health,
            "health_value": health_value,
            "sync": sync,
            "project": app_data["spec"]["project"]
        })

    return jsonify(metrics)

SCRIPT
```

## Deployment Frequency Tracking

Track deployment velocity over time:

```python
def get_deployment_frequency(server, token, days=30):
    """Calculate deployment frequency from sync history."""
    resp = requests.get(
        f"{server}/api/v1/applications",
        headers={"Authorization": f"Bearer {token}"},
        verify=False
    )
    apps = resp.json().get("items", [])

    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)

    deployments_per_day = defaultdict(int)
    deployments_per_app = Counter()

    for app in apps:
        history = app["status"].get("history", [])
        for entry in history:
            deployed_at = entry.get("deployedAt", "")
            if deployed_at:
                try:
                    dt = datetime.fromisoformat(deployed_at.replace("Z", "+00:00"))
                    if dt.replace(tzinfo=None) >= cutoff:
                        day = dt.strftime("%Y-%m-%d")
                        deployments_per_day[day] += 1
                        deployments_per_app[app["metadata"]["name"]] += 1
                except ValueError:
                    pass

    return {
        "daily_deployments": dict(sorted(deployments_per_day.items())),
        "top_deployed_apps": deployments_per_app.most_common(10),
        "total_deployments": sum(deployments_per_day.values()),
        "avg_per_day": sum(deployments_per_day.values()) / max(days, 1)
    }
```

## Real-Time Dashboard with SSE

Combine SSE streaming with a dashboard for live updates. See our guide on [ArgoCD Server-Sent Events](https://oneuptime.com/blog/post/2026-02-26-argocd-server-sent-events-api/view) for the streaming implementation details.

```python
# Backend: Flask-SSE endpoint
from flask import Flask, Response
import json

@app.route('/stream')
def stream():
    def generate():
        # Connect to ArgoCD SSE
        with requests.get(
            f"{ARGOCD_SERVER}/api/v1/stream/applications",
            headers={"Authorization": f"Bearer {ARGOCD_TOKEN}"},
            stream=True, verify=False
        ) as resp:
            for line in resp.iter_lines(decode_unicode=True):
                if line:
                    try:
                        event = json.loads(line)
                        app_data = event["result"]["application"]
                        simplified = {
                            "name": app_data["metadata"]["name"],
                            "health": app_data["status"]["health"]["status"],
                            "sync": app_data["status"]["sync"]["status"]
                        }
                        yield f"data: {json.dumps(simplified)}\n\n"
                    except (json.JSONDecodeError, KeyError):
                        pass

    return Response(generate(), mimetype='text/event-stream')
```

## Securing Your Dashboard

When deploying a custom dashboard, secure it properly:

```python
# Add basic authentication to the dashboard
from functools import wraps
from flask import request, Response

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_credentials(auth.username, auth.password):
            return Response(
                'Authentication required', 401,
                {'WWW-Authenticate': 'Basic realm="Dashboard"'}
            )
        return f(*args, **kwargs)
    return decorated

@app.route('/')
@require_auth
def dashboard():
    # ... dashboard code
    pass
```

Building custom dashboards with the ArgoCD API lets you create tailored views that match your organization's needs. Start with a simple status page, add real-time updates via SSE, and expand with deployment metrics and team-specific views. The API provides all the data - you just need to present it in a way that makes sense for your audience.
