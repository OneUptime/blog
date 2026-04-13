# How to Use Dapr with Vue.js Frontend and Go Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Vue.js, Go, Microservice, Full Stack

Description: Build a full-stack application using Vue.js and a Go backend with Dapr service invocation for lightweight, high-performance microservice communication.

---

Go's performance and simplicity pair well with Vue.js's progressive framework for building fast full-stack applications. Adding Dapr gives the Go backend plug-and-play integrations with state stores, pub/sub, and secret managers without vendor lock-in. This guide builds a metrics dashboard app with this stack.

## Backend: Go with Dapr SDK

Initialize a Go module and install the Dapr Go SDK:

```bash
mkdir metrics-service && cd metrics-service
go mod init metrics-service
go get github.com/dapr/go-sdk/client
go get github.com/dapr/go-sdk/service/http
```

Create the Go HTTP server:

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    dapr "github.com/dapr/go-sdk/client"
    daprd "github.com/dapr/go-sdk/service/http"
    "github.com/dapr/go-sdk/service/common"
)

type Metric struct {
    Name  string  `json:"name"`
    Value float64 `json:"value"`
    Unit  string  `json:"unit"`
}

var daprClient dapr.Client

func main() {
    var err error
    daprClient, err = dapr.NewClient()
    if err != nil {
        log.Fatalf("Failed to create Dapr client: %v", err)
    }
    defer daprClient.Close()

    s := daprd.NewService(":8080")

    s.AddServiceInvocationHandler("/metrics", getMetricsHandler)
    s.AddServiceInvocationHandler("/metrics/record", recordMetricHandler)

    log.Println("Metrics service running on :8080")
    if err := s.Start(); err != nil {
        log.Fatalf("Service failed: %v", err)
    }
}

func getMetricsHandler(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    result, err := daprClient.GetState(ctx, "statestore", "metrics", nil)
    if err != nil {
        return nil, err
    }

    data := result.Value
    if data == nil {
        data = []byte("[]")
    }
    return &common.Content{Data: data, ContentType: "application/json"}, nil
}

func recordMetricHandler(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    var metric Metric
    if err := json.Unmarshal(in.Data, &metric); err != nil {
        return nil, err
    }

    // Save to state store
    metricData, err := json.Marshal(metric)
    if err != nil {
        return nil, err
    }
    if err := daprClient.SaveState(ctx, "statestore", "metric-"+metric.Name,
        metricData, nil); err != nil {
        return nil, err
    }

    // Publish metric recorded event
    if err := daprClient.PublishEvent(ctx, "pubsub", "metric-recorded",
        metricData); err != nil {
        log.Printf("Failed to publish event: %v", err)
    }

    return &common.Content{Data: []byte(`{"status":"recorded"}`),
        ContentType: "application/json"}, nil
}
```

## Frontend: Vue.js with Axios

Create a Vue.js project:

```bash
npm create vue@latest metrics-dashboard
cd metrics-dashboard
npm install axios
```

Create a Dapr composable for reusable API calls:

```javascript
// src/composables/useDapr.js
import axios from 'axios';

const DAPR_PORT = import.meta.env.VITE_DAPR_HTTP_PORT || 3500;
const APP_ID = 'metrics-service';

export function useDapr() {
  const baseUrl = `http://localhost:${DAPR_PORT}/v1.0/invoke/${APP_ID}/method`;

  const invoke = async (method, path, data = null) => {
    const config = { method, url: `${baseUrl}${path}` };
    if (data) config.data = data;
    const response = await axios(config);
    return response.data;
  };

  const getMetrics = () => invoke('GET', '/metrics');
  const recordMetric = (metric) => invoke('POST', '/metrics/record', metric);

  return { getMetrics, recordMetric };
}
```

Build the dashboard component:

```vue
<!-- src/components/MetricsDashboard.vue -->
<template>
  <div class="dashboard">
    <h1>Metrics Dashboard</h1>
    <div v-for="metric in metrics" :key="metric.name" class="metric-card">
      <h3>{{ metric.name }}</h3>
      <p>{{ metric.value }} {{ metric.unit }}</p>
    </div>
    <form @submit.prevent="addMetric">
      <input v-model="newMetric.name" placeholder="Metric name" required />
      <input v-model.number="newMetric.value" type="number" placeholder="Value" required />
      <input v-model="newMetric.unit" placeholder="Unit" />
      <button type="submit">Record</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useDapr } from '../composables/useDapr';

const { getMetrics, recordMetric } = useDapr();
const metrics = ref([]);
const newMetric = ref({ name: '', value: 0, unit: '' });

onMounted(async () => {
  metrics.value = await getMetrics();
});

async function addMetric() {
  await recordMetric(newMetric.value);
  metrics.value = await getMetrics();
  newMetric.value = { name: '', value: 0, unit: '' };
}
</script>
```

## Running Locally

```bash
# Terminal 1: Start Go backend with Dapr
dapr run \
  --app-id metrics-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- go run main.go

# Terminal 2: Start Vue.js dev server
VITE_DAPR_HTTP_PORT=3500 npm run dev
```

## Summary

Vue.js and Go with Dapr combine Vue's reactive frontend with Go's high-performance backend through Dapr's sidecar pattern. The Go Dapr SDK handles state and pub/sub natively, while the Vue frontend calls Dapr's HTTP API for service invocation without coupling to backend URLs.
