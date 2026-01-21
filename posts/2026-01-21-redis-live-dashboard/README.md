# How to Build a Live Dashboard with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Real-Time, Dashboard, Metrics, Analytics, WebSockets, Data Streaming

Description: A comprehensive guide to building live dashboards with Redis, covering real-time metrics collection, data streaming, chart updates, and efficient data aggregation for interactive analytics displays.

---

Live dashboards provide real-time visibility into business metrics, system health, and operational data. Redis's low latency and powerful data structures make it ideal for powering dashboards that update in real-time. This guide covers how to collect, aggregate, and stream metrics to build responsive live dashboards.

## Dashboard Architecture Overview

A typical live dashboard system consists of:

1. **Data Collectors**: Services that gather metrics from various sources
2. **Redis Storage**: Store current values, time-series data, and aggregations
3. **Streaming Layer**: Push updates to connected clients
4. **Frontend**: Render charts and visualizations

## Storing Real-Time Metrics

### Using Redis Hashes for Current Values

```python
import redis
import json
import time
from datetime import datetime

class MetricsStore:
    """Store and retrieve current metric values"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def set_metric(self, metric_name: str, value: float, labels: dict = None):
        """Set a metric value"""
        key = f"metrics:current:{metric_name}"

        if labels:
            label_key = ':'.join(f"{k}={v}" for k, v in sorted(labels.items()))
            key = f"{key}:{label_key}"

        self.redis.hset(key, mapping={
            'value': value,
            'timestamp': time.time(),
            'labels': json.dumps(labels or {})
        })

        # Publish update for real-time subscribers
        self.redis.publish('metrics:updates', json.dumps({
            'metric': metric_name,
            'value': value,
            'labels': labels,
            'timestamp': time.time()
        }))

    def get_metric(self, metric_name: str, labels: dict = None) -> dict:
        """Get current metric value"""
        key = f"metrics:current:{metric_name}"

        if labels:
            label_key = ':'.join(f"{k}={v}" for k, v in sorted(labels.items()))
            key = f"{key}:{label_key}"

        data = self.redis.hgetall(key)
        if data:
            return {
                'value': float(data.get('value', 0)),
                'timestamp': float(data.get('timestamp', 0)),
                'labels': json.loads(data.get('labels', '{}'))
            }
        return None

    def increment_counter(self, metric_name: str, labels: dict = None, amount: float = 1):
        """Increment a counter metric"""
        key = f"metrics:counters:{metric_name}"

        if labels:
            label_key = ':'.join(f"{k}={v}" for k, v in sorted(labels.items()))
            key = f"{key}:{label_key}"

        new_value = self.redis.incrbyfloat(key, amount)

        # Publish update
        self.redis.publish('metrics:updates', json.dumps({
            'metric': metric_name,
            'value': new_value,
            'labels': labels,
            'type': 'counter',
            'timestamp': time.time()
        }))

        return new_value


# Usage
r = redis.Redis(decode_responses=True)
metrics = MetricsStore(r)

# Set gauge metrics
metrics.set_metric('cpu_usage', 75.5, {'host': 'server-1'})
metrics.set_metric('memory_usage', 68.2, {'host': 'server-1'})

# Increment counters
metrics.increment_counter('requests_total', {'endpoint': '/api/users', 'method': 'GET'})
```

### Time-Series Data with Sorted Sets

```python
class TimeSeriesMetrics:
    """Store time-series metrics using sorted sets"""

    def __init__(self, redis_client, retention_seconds: int = 86400):
        self.redis = redis_client
        self.retention = retention_seconds

    def record(self, metric_name: str, value: float, timestamp: float = None, labels: dict = None):
        """Record a data point"""
        timestamp = timestamp or time.time()
        key = f"timeseries:{metric_name}"

        if labels:
            label_key = ':'.join(f"{k}={v}" for k, v in sorted(labels.items()))
            key = f"{key}:{label_key}"

        # Store as score=timestamp, member=timestamp:value
        member = f"{timestamp}:{value}"
        self.redis.zadd(key, {member: timestamp})

        # Trim old data
        cutoff = timestamp - self.retention
        self.redis.zremrangebyscore(key, '-inf', cutoff)

    def query(self, metric_name: str, start_time: float, end_time: float,
              labels: dict = None) -> list:
        """Query time-series data"""
        key = f"timeseries:{metric_name}"

        if labels:
            label_key = ':'.join(f"{k}={v}" for k, v in sorted(labels.items()))
            key = f"{key}:{label_key}"

        raw_data = self.redis.zrangebyscore(key, start_time, end_time)

        points = []
        for item in raw_data:
            ts, val = item.rsplit(':', 1)
            points.append({
                'timestamp': float(ts),
                'value': float(val)
            })

        return points

    def query_aggregated(self, metric_name: str, start_time: float, end_time: float,
                         bucket_seconds: int = 60, aggregation: str = 'avg',
                         labels: dict = None) -> list:
        """Query with time-bucket aggregation"""
        points = self.query(metric_name, start_time, end_time, labels)

        # Group by bucket
        buckets = {}
        for point in points:
            bucket = int(point['timestamp'] / bucket_seconds) * bucket_seconds
            if bucket not in buckets:
                buckets[bucket] = []
            buckets[bucket].append(point['value'])

        # Aggregate
        result = []
        for bucket_time in sorted(buckets.keys()):
            values = buckets[bucket_time]
            if aggregation == 'avg':
                agg_value = sum(values) / len(values)
            elif aggregation == 'sum':
                agg_value = sum(values)
            elif aggregation == 'min':
                agg_value = min(values)
            elif aggregation == 'max':
                agg_value = max(values)
            elif aggregation == 'count':
                agg_value = len(values)
            else:
                agg_value = sum(values) / len(values)

            result.append({
                'timestamp': bucket_time,
                'value': agg_value
            })

        return result


# Usage
ts = TimeSeriesMetrics(r)

# Record metrics
ts.record('response_time', 150, labels={'endpoint': '/api/users'})
ts.record('response_time', 145, labels={'endpoint': '/api/users'})

# Query last hour with 1-minute buckets
now = time.time()
data = ts.query_aggregated(
    'response_time',
    now - 3600,
    now,
    bucket_seconds=60,
    aggregation='avg',
    labels={'endpoint': '/api/users'}
)
```

### Using Redis Streams for Metrics

```python
class StreamMetrics:
    """Stream-based metrics with consumer groups"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.stream_key = 'metrics:stream'

    def emit(self, metric_name: str, value: float, labels: dict = None):
        """Emit a metric to the stream"""
        entry = {
            'metric': metric_name,
            'value': str(value),
            'labels': json.dumps(labels or {}),
            'timestamp': str(time.time())
        }

        self.redis.xadd(
            self.stream_key,
            entry,
            maxlen=100000  # Keep last 100k entries
        )

    def consume_latest(self, count: int = 100) -> list:
        """Get latest metrics"""
        entries = self.redis.xrevrange(self.stream_key, count=count)

        metrics = []
        for entry_id, data in entries:
            metrics.append({
                'id': entry_id,
                'metric': data['metric'],
                'value': float(data['value']),
                'labels': json.loads(data['labels']),
                'timestamp': float(data['timestamp'])
            })

        return metrics

    def subscribe(self, callback, last_id: str = '$'):
        """Subscribe to new metrics"""
        while True:
            entries = self.redis.xread({self.stream_key: last_id}, block=5000, count=100)

            if entries:
                for stream, messages in entries:
                    for msg_id, data in messages:
                        metric = {
                            'id': msg_id,
                            'metric': data['metric'],
                            'value': float(data['value']),
                            'labels': json.loads(data['labels']),
                            'timestamp': float(data['timestamp'])
                        }
                        callback(metric)
                        last_id = msg_id
```

## Real-Time Data Streaming

### WebSocket Server for Dashboard

```python
import asyncio
import aioredis
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set

app = FastAPI()

class DashboardServer:
    """Real-time dashboard data server"""

    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}  # dashboard_id -> connections
        self.redis = None

    async def get_redis(self):
        if not self.redis:
            self.redis = await aioredis.from_url('redis://localhost', decode_responses=True)
        return self.redis

    async def connect(self, websocket: WebSocket, dashboard_id: str):
        """Connect client to dashboard"""
        await websocket.accept()

        if dashboard_id not in self.connections:
            self.connections[dashboard_id] = set()
            asyncio.create_task(self._subscribe_metrics(dashboard_id))

        self.connections[dashboard_id].add(websocket)

        # Send initial dashboard data
        await self._send_initial_data(websocket, dashboard_id)

    async def disconnect(self, websocket: WebSocket, dashboard_id: str):
        """Disconnect client"""
        if dashboard_id in self.connections:
            self.connections[dashboard_id].discard(websocket)

    async def _subscribe_metrics(self, dashboard_id: str):
        """Subscribe to metrics updates for dashboard"""
        redis = await self.get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe('metrics:updates')

        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    metric_data = json.loads(message['data'])

                    # Check if metric is relevant to this dashboard
                    if self._is_relevant(dashboard_id, metric_data):
                        await self._broadcast(dashboard_id, {
                            'type': 'metric_update',
                            'data': metric_data
                        })
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe('metrics:updates')

    def _is_relevant(self, dashboard_id: str, metric_data: dict) -> bool:
        """Check if metric is relevant to dashboard"""
        # In practice, load dashboard config to determine relevant metrics
        return True

    async def _broadcast(self, dashboard_id: str, message: dict):
        """Broadcast to all connected clients"""
        if dashboard_id not in self.connections:
            return

        message_str = json.dumps(message)
        dead = set()

        for ws in self.connections[dashboard_id]:
            try:
                await ws.send_text(message_str)
            except Exception:
                dead.add(ws)

        for ws in dead:
            self.connections[dashboard_id].discard(ws)

    async def _send_initial_data(self, websocket: WebSocket, dashboard_id: str):
        """Send current dashboard state to new connection"""
        redis = await self.get_redis()

        # Load dashboard config
        config = await self._get_dashboard_config(dashboard_id)

        # Gather current values for all metrics
        initial_data = {}
        for widget in config.get('widgets', []):
            metric_name = widget.get('metric')
            if metric_name:
                data = await redis.hgetall(f"metrics:current:{metric_name}")
                if data:
                    initial_data[metric_name] = {
                        'value': float(data.get('value', 0)),
                        'timestamp': float(data.get('timestamp', 0))
                    }

        await websocket.send_text(json.dumps({
            'type': 'initial_state',
            'config': config,
            'data': initial_data
        }))

    async def _get_dashboard_config(self, dashboard_id: str) -> dict:
        """Get dashboard configuration"""
        redis = await self.get_redis()
        config = await redis.get(f"dashboard:config:{dashboard_id}")
        if config:
            return json.loads(config)

        # Default config
        return {
            'id': dashboard_id,
            'name': 'Default Dashboard',
            'widgets': [
                {'type': 'gauge', 'metric': 'cpu_usage', 'title': 'CPU Usage'},
                {'type': 'chart', 'metric': 'response_time', 'title': 'Response Time'},
                {'type': 'counter', 'metric': 'requests_total', 'title': 'Total Requests'}
            ]
        }


server = DashboardServer()

@app.websocket("/ws/dashboard/{dashboard_id}")
async def dashboard_websocket(websocket: WebSocket, dashboard_id: str):
    await server.connect(websocket, dashboard_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages (e.g., filter changes)
    except WebSocketDisconnect:
        await server.disconnect(websocket, dashboard_id)
```

### Node.js Implementation

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');

class DashboardServer {
    constructor(port = 8080) {
        this.wss = new WebSocket.Server({ port });
        this.redis = new Redis();
        this.subscriber = new Redis();
        this.connections = new Map();

        this.setupWebSocketServer();
        this.setupMetricsSubscription();
    }

    setupWebSocketServer() {
        this.wss.on('connection', async (ws, req) => {
            const dashboardId = this.extractDashboardId(req);

            if (!this.connections.has(dashboardId)) {
                this.connections.set(dashboardId, new Set());
            }
            this.connections.get(dashboardId).add(ws);

            // Send initial data
            await this.sendInitialData(ws, dashboardId);

            ws.on('close', () => {
                const conns = this.connections.get(dashboardId);
                if (conns) {
                    conns.delete(ws);
                }
            });

            ws.on('message', (message) => {
                this.handleClientMessage(ws, dashboardId, JSON.parse(message));
            });
        });
    }

    setupMetricsSubscription() {
        this.subscriber.subscribe('metrics:updates');

        this.subscriber.on('message', (channel, message) => {
            const metric = JSON.parse(message);
            this.broadcastMetric(metric);
        });
    }

    broadcastMetric(metric) {
        const message = JSON.stringify({
            type: 'metric_update',
            data: metric
        });

        this.connections.forEach((connections, dashboardId) => {
            connections.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                }
            });
        });
    }

    async sendInitialData(ws, dashboardId) {
        // Get dashboard config
        const config = await this.getDashboardConfig(dashboardId);

        // Get current metric values
        const data = {};
        for (const widget of config.widgets) {
            if (widget.metric) {
                const value = await this.redis.hgetall(`metrics:current:${widget.metric}`);
                if (value && Object.keys(value).length > 0) {
                    data[widget.metric] = {
                        value: parseFloat(value.value || 0),
                        timestamp: parseFloat(value.timestamp || 0)
                    };
                }
            }
        }

        ws.send(JSON.stringify({
            type: 'initial_state',
            config,
            data
        }));
    }

    async getDashboardConfig(dashboardId) {
        const config = await this.redis.get(`dashboard:config:${dashboardId}`);
        return config ? JSON.parse(config) : this.getDefaultConfig(dashboardId);
    }

    getDefaultConfig(dashboardId) {
        return {
            id: dashboardId,
            name: 'Dashboard',
            refreshInterval: 5000,
            widgets: [
                { id: 'w1', type: 'gauge', metric: 'cpu_usage', title: 'CPU' },
                { id: 'w2', type: 'line_chart', metric: 'response_time', title: 'Response Time' },
                { id: 'w3', type: 'counter', metric: 'requests_total', title: 'Requests' }
            ]
        };
    }

    extractDashboardId(req) {
        const url = new URL(req.url, 'http://localhost');
        return url.searchParams.get('id') || 'default';
    }
}

// Start server
new DashboardServer(8080);
```

## Frontend Dashboard Client

```javascript
class DashboardClient {
    constructor(dashboardId, containerId) {
        this.dashboardId = dashboardId;
        this.container = document.getElementById(containerId);
        this.widgets = new Map();
        this.ws = null;
        this.reconnectAttempts = 0;
    }

    connect() {
        this.ws = new WebSocket(`wss://api.example.com/ws/dashboard?id=${this.dashboardId}`);

        this.ws.onopen = () => {
            console.log('Connected to dashboard');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.ws.onclose = () => {
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleMessage(message) {
        switch (message.type) {
            case 'initial_state':
                this.initializeDashboard(message.config, message.data);
                break;
            case 'metric_update':
                this.updateMetric(message.data);
                break;
        }
    }

    initializeDashboard(config, data) {
        this.container.innerHTML = '';

        // Create grid layout
        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';

        for (const widget of config.widgets) {
            const widgetEl = this.createWidget(widget);
            grid.appendChild(widgetEl);

            // Initialize with current data
            if (data[widget.metric]) {
                this.updateWidgetValue(widget.id, data[widget.metric]);
            }
        }

        this.container.appendChild(grid);
    }

    createWidget(config) {
        const widget = document.createElement('div');
        widget.className = `dashboard-widget widget-${config.type}`;
        widget.id = `widget-${config.id}`;

        widget.innerHTML = `
            <div class="widget-header">
                <h3>${config.title}</h3>
            </div>
            <div class="widget-body">
                ${this.createWidgetContent(config)}
            </div>
        `;

        this.widgets.set(config.id, {
            config,
            element: widget,
            chart: null
        });

        // Initialize chart if needed
        if (config.type === 'line_chart') {
            this.initializeChart(config.id);
        }

        return widget;
    }

    createWidgetContent(config) {
        switch (config.type) {
            case 'gauge':
                return `
                    <div class="gauge-container">
                        <svg viewBox="0 0 100 60" class="gauge">
                            <path class="gauge-bg" d="M 10 50 A 40 40 0 0 1 90 50"/>
                            <path class="gauge-value" d="M 10 50 A 40 40 0 0 1 90 50"/>
                        </svg>
                        <div class="gauge-label">
                            <span class="value">0</span>
                            <span class="unit">%</span>
                        </div>
                    </div>
                `;
            case 'counter':
                return `
                    <div class="counter-container">
                        <span class="counter-value">0</span>
                    </div>
                `;
            case 'line_chart':
                return `
                    <canvas class="chart-canvas"></canvas>
                `;
            default:
                return `<span class="metric-value">-</span>`;
        }
    }

    initializeChart(widgetId) {
        const widget = this.widgets.get(widgetId);
        const canvas = widget.element.querySelector('.chart-canvas');
        const ctx = canvas.getContext('2d');

        widget.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: widget.config.title,
                    data: [],
                    borderColor: '#4ECDC4',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                animation: { duration: 0 },
                scales: {
                    x: { display: true },
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        widget.chartData = [];
    }

    updateMetric(data) {
        // Find widgets using this metric
        for (const [id, widget] of this.widgets) {
            if (widget.config.metric === data.metric) {
                this.updateWidgetValue(id, data);
            }
        }
    }

    updateWidgetValue(widgetId, data) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;

        switch (widget.config.type) {
            case 'gauge':
                this.updateGauge(widget, data.value);
                break;
            case 'counter':
                this.updateCounter(widget, data.value);
                break;
            case 'line_chart':
                this.updateChart(widget, data);
                break;
        }
    }

    updateGauge(widget, value) {
        const percent = Math.min(100, Math.max(0, value));
        const arc = widget.element.querySelector('.gauge-value');
        const label = widget.element.querySelector('.value');

        // Update arc (assuming 180 degree gauge)
        const angle = (percent / 100) * 180;
        // Update SVG path based on angle
        label.textContent = Math.round(value);

        // Color based on value
        if (percent > 80) {
            arc.style.stroke = '#FF6B6B';
        } else if (percent > 60) {
            arc.style.stroke = '#FFEAA7';
        } else {
            arc.style.stroke = '#4ECDC4';
        }
    }

    updateCounter(widget, value) {
        const counter = widget.element.querySelector('.counter-value');
        const formattedValue = this.formatNumber(value);
        counter.textContent = formattedValue;
    }

    updateChart(widget, data) {
        const chart = widget.chart;
        if (!chart) return;

        const time = new Date(data.timestamp * 1000).toLocaleTimeString();

        chart.data.labels.push(time);
        chart.data.datasets[0].data.push(data.value);

        // Keep last 60 points
        if (chart.data.labels.length > 60) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update('none'); // Update without animation
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(0);
    }

    scheduleReconnect() {
        const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
    }
}

// Usage
const dashboard = new DashboardClient('ops-dashboard', 'dashboard-container');
dashboard.connect();
```

## Aggregation and Rollups

### Pre-Computing Aggregations

```python
class MetricsAggregator:
    """Pre-compute metric aggregations for fast dashboard queries"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def aggregate_minute(self, metric_name: str, timestamp: float = None):
        """Aggregate data into minute buckets"""
        timestamp = timestamp or time.time()
        minute_bucket = int(timestamp / 60) * 60

        raw_key = f"timeseries:{metric_name}"
        agg_key = f"aggregated:{metric_name}:minute"

        # Get data for this minute
        start = minute_bucket
        end = minute_bucket + 60

        raw_data = self.redis.zrangebyscore(raw_key, start, end)

        if not raw_data:
            return

        values = [float(item.split(':')[1]) for item in raw_data]

        # Compute aggregations
        aggregation = {
            'min': min(values),
            'max': max(values),
            'sum': sum(values),
            'count': len(values),
            'avg': sum(values) / len(values)
        }

        # Store aggregation
        self.redis.hset(
            agg_key,
            str(minute_bucket),
            json.dumps(aggregation)
        )

        # Set expiry (keep 24 hours of minute data)
        self.redis.expire(agg_key, 86400)

    def aggregate_hour(self, metric_name: str, timestamp: float = None):
        """Aggregate minute data into hour buckets"""
        timestamp = timestamp or time.time()
        hour_bucket = int(timestamp / 3600) * 3600

        minute_key = f"aggregated:{metric_name}:minute"
        hour_key = f"aggregated:{metric_name}:hour"

        # Get minute aggregations for this hour
        minute_data = self.redis.hgetall(minute_key)

        values_sum = 0
        values_count = 0
        values_min = float('inf')
        values_max = float('-inf')

        for minute_ts, agg_json in minute_data.items():
            minute_ts = int(minute_ts)
            if hour_bucket <= minute_ts < hour_bucket + 3600:
                agg = json.loads(agg_json)
                values_sum += agg['sum']
                values_count += agg['count']
                values_min = min(values_min, agg['min'])
                values_max = max(values_max, agg['max'])

        if values_count > 0:
            aggregation = {
                'min': values_min,
                'max': values_max,
                'sum': values_sum,
                'count': values_count,
                'avg': values_sum / values_count
            }

            self.redis.hset(
                hour_key,
                str(hour_bucket),
                json.dumps(aggregation)
            )

            # Keep 30 days of hourly data
            self.redis.expire(hour_key, 30 * 86400)

    def query_aggregated(self, metric_name: str, start_time: float, end_time: float,
                         resolution: str = 'minute') -> list:
        """Query pre-aggregated data"""
        key = f"aggregated:{metric_name}:{resolution}"

        if resolution == 'minute':
            bucket_size = 60
        elif resolution == 'hour':
            bucket_size = 3600
        else:
            bucket_size = 86400

        all_data = self.redis.hgetall(key)

        result = []
        for ts_str, agg_json in all_data.items():
            ts = int(ts_str)
            if start_time <= ts <= end_time:
                agg = json.loads(agg_json)
                agg['timestamp'] = ts
                result.append(agg)

        return sorted(result, key=lambda x: x['timestamp'])


# Background job to run aggregations
import schedule

def run_aggregations():
    r = redis.Redis(decode_responses=True)
    aggregator = MetricsAggregator(r)

    # Get all metric names
    metric_keys = r.keys('timeseries:*')
    metrics = [k.replace('timeseries:', '') for k in metric_keys]

    for metric in metrics:
        aggregator.aggregate_minute(metric)

# Run every minute
schedule.every(1).minutes.do(run_aggregations)
```

## Dashboard Configuration Storage

```python
class DashboardConfig:
    """Store and manage dashboard configurations"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def save_dashboard(self, dashboard_id: str, config: dict, user_id: str = None):
        """Save dashboard configuration"""
        config['id'] = dashboard_id
        config['updated_at'] = time.time()
        config['updated_by'] = user_id

        self.redis.set(f"dashboard:config:{dashboard_id}", json.dumps(config))

        # Add to user's dashboards
        if user_id:
            self.redis.sadd(f"user:dashboards:{user_id}", dashboard_id)

    def get_dashboard(self, dashboard_id: str) -> dict:
        """Get dashboard configuration"""
        config = self.redis.get(f"dashboard:config:{dashboard_id}")
        return json.loads(config) if config else None

    def delete_dashboard(self, dashboard_id: str, user_id: str = None):
        """Delete dashboard"""
        self.redis.delete(f"dashboard:config:{dashboard_id}")
        if user_id:
            self.redis.srem(f"user:dashboards:{user_id}", dashboard_id)

    def list_dashboards(self, user_id: str) -> list:
        """List user's dashboards"""
        dashboard_ids = self.redis.smembers(f"user:dashboards:{user_id}")
        dashboards = []

        for did in dashboard_ids:
            config = self.get_dashboard(did)
            if config:
                dashboards.append({
                    'id': config['id'],
                    'name': config.get('name', 'Untitled'),
                    'updated_at': config.get('updated_at')
                })

        return dashboards


# Example dashboard configuration
example_config = {
    'name': 'Operations Dashboard',
    'layout': 'grid',
    'refreshInterval': 5000,
    'widgets': [
        {
            'id': 'cpu-gauge',
            'type': 'gauge',
            'title': 'CPU Usage',
            'metric': 'cpu_usage',
            'position': {'x': 0, 'y': 0, 'w': 1, 'h': 1},
            'thresholds': {'warning': 70, 'critical': 90}
        },
        {
            'id': 'requests-chart',
            'type': 'line_chart',
            'title': 'Requests per Second',
            'metric': 'requests_per_second',
            'position': {'x': 1, 'y': 0, 'w': 2, 'h': 1},
            'timeRange': '1h'
        },
        {
            'id': 'error-counter',
            'type': 'counter',
            'title': 'Total Errors',
            'metric': 'errors_total',
            'position': {'x': 3, 'y': 0, 'w': 1, 'h': 1},
            'format': 'number'
        }
    ]
}
```

## Conclusion

Building live dashboards with Redis enables real-time visibility into your systems and business metrics. Key takeaways:

- Use Redis hashes for current metric values and sorted sets for time-series data
- Implement WebSocket or SSE streaming for real-time updates
- Pre-compute aggregations for efficient historical queries
- Store dashboard configurations in Redis for dynamic customization
- Use Pub/Sub to distribute metric updates to all connected clients

By combining Redis's low-latency data structures with modern streaming protocols, you can build dashboards that update in real-time while handling thousands of concurrent viewers.
