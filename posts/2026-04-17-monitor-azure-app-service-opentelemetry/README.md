# How to Monitor Azure App Services (PaaS) with OpenTelemetry

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Azure, Azure App Service, OpenTelemetry, Observability, Monitoring

Description: A practical guide to instrumenting Azure App Services with OpenTelemetry: in-process auto-instrumentation for Node.js, .NET, Java, and Python, plus forwarding platform logs and metrics.

---

> Azure App Service is a Platform-as-a-Service offering. You don't get the host, you don't get root, and you can't run a daemon next to your app the way you would on a VM. That changes how you approach OpenTelemetry.

On IaaS you'd drop a Collector agent on the box, point your application at `localhost:4318`, and be done. On App Service you have to work around a locked-down sandbox - which means in-process instrumentation in the app itself, and a separate pipeline for the platform-level telemetry the SDK can't see. This post walks through a setup that covers both.

---

## The architecture at a glance

There are two telemetry streams on App Service, and you need both:

1. **Application telemetry** - traces, metrics, and logs emitted by your code. The OpenTelemetry SDK lives inside your app process and exports OTLP directly (or to a Collector).
2. **Platform telemetry** - HTTP logs, console logs, platform/container events, and platform metrics such as CPU, memory, HTTP queue length, and response times. These come from the App Service runtime itself and are exposed through **Diagnostic Settings**. They need a separate path to OTLP.

Treat them as two pipelines that happen to land in the same backend. Teams that only do #1 are blind when the platform misbehaves (scale-in killing requests, cold starts, quota throttling). Teams that only do #2 have no trace data and can't correlate errors to requests.

---

## Prerequisites

- An Azure App Service running Node.js, .NET, Java, or Python. Node.js, .NET, and Java can run on Linux or Windows; Python's built-in App Service runtime is Linux-only unless you bring a custom Windows container.
- Permission to edit Application settings and Diagnostic settings on the App Service
- An OTLP-compatible backend (this guide uses [OneUptime](https://oneuptime.com))
- Optionally, an OpenTelemetry Collector deployed somewhere reachable (Container Apps, AKS, or a VM)

---

## Step 1: Instrument the application

The fastest path is auto-instrumentation. You install the OpenTelemetry SDK for your runtime, set a handful of environment variables, and the SDK takes over - wrapping HTTP handlers, database clients, and outbound calls without code changes.

### Node.js

Add the auto-instrumentation packages to your `package.json`:

```bash
npm install @opentelemetry/api \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/exporter-metrics-otlp-http \
            @opentelemetry/exporter-logs-otlp-http
```

Then in the Azure Portal, go to **your App Service → Configuration → Application settings** and add:

```text
NODE_OPTIONS = --require @opentelemetry/auto-instrumentations-node/register
OTEL_SERVICE_NAME = my-node-app
OTEL_EXPORTER_OTLP_ENDPOINT = https://oneuptime.com/otlp
OTEL_EXPORTER_OTLP_HEADERS = x-oneuptime-token=YOUR_TOKEN
OTEL_RESOURCE_ATTRIBUTES = deployment.environment.name=prod,cloud.provider=azure,cloud.platform=azure.app_service
OTEL_TRACES_EXPORTER = otlp
OTEL_METRICS_EXPORTER = otlp
OTEL_LOGS_EXPORTER = otlp
```

Restart the app. Incoming HTTP requests, outbound `fetch`/`http` calls, and popular database clients will produce spans immediately.

### .NET

For .NET 6+ the cleanest option is the OpenTelemetry Auto-Instrumentation module. Upload `OpenTelemetry.AutoInstrumentation` to `/home/site/wwwroot/otel/` via Kudu (or bundle it in your deployment zip), then set:

```text
OTEL_DOTNET_AUTO_HOME = /home/site/wwwroot/otel
CORECLR_ENABLE_PROFILING = 1
CORECLR_PROFILER = {918728DD-259F-4A6A-AC2B-B85E1B658318}
CORECLR_PROFILER_PATH = /home/site/wwwroot/otel/linux-x64/OpenTelemetry.AutoInstrumentation.Native.so
DOTNET_STARTUP_HOOKS = /home/site/wwwroot/otel/net/OpenTelemetry.AutoInstrumentation.StartupHook.dll
DOTNET_ADDITIONAL_DEPS = /home/site/wwwroot/otel/AdditionalDeps
DOTNET_SHARED_STORE = /home/site/wwwroot/otel/store
OTEL_SERVICE_NAME = my-dotnet-app
OTEL_EXPORTER_OTLP_ENDPOINT = https://oneuptime.com/otlp
OTEL_EXPORTER_OTLP_HEADERS = x-oneuptime-token=YOUR_TOKEN
```

On Windows App Service, use `CORECLR_PROFILER_PATH_32` or `CORECLR_PROFILER_PATH_64` for the Windows DLL path; the profiler CLSID stays the same. If you prefer explicit wiring, add the `OpenTelemetry.Extensions.Hosting` NuGet and configure the tracer provider in `Program.cs` - either approach works.

### Java

Java has the smoothest ride on App Service because the Java agent attaches at JVM startup with a single flag. Upload `opentelemetry-javaagent.jar` to `/home/site/wwwroot/` and set this for Java SE apps:

```text
JAVA_OPTS = -javaagent:/home/site/wwwroot/opentelemetry-javaagent.jar
OTEL_SERVICE_NAME = my-java-app
OTEL_EXPORTER_OTLP_ENDPOINT = https://oneuptime.com/otlp
OTEL_EXPORTER_OTLP_HEADERS = x-oneuptime-token=YOUR_TOKEN
OTEL_EXPORTER_OTLP_PROTOCOL = http/protobuf
```

For Tomcat apps, put the same `-javaagent:/home/site/wwwroot/opentelemetry-javaagent.jar` value in `CATALINA_OPTS` instead of `JAVA_OPTS`.

Tomcat, Spring Boot, JDBC, Kafka, and the rest of the common stack are instrumented out of the box.

### Python

Install the agent packages and run the bootstrap helper during your deployment:

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

Then change the startup command under **Configuration → General settings → Startup Command** to wrap your entrypoint:

```bash
opentelemetry-instrument gunicorn --bind=0.0.0.0 --workers=4 app:app
```

Set the usual `OTEL_*` variables as Application settings, same as the Node.js example.

---

## Step 2: Set the right resource attributes

App Service exposes a handful of environment variables that uniquely identify a running instance. Map them into OpenTelemetry resource attributes so every span, metric, and log can be pinned to a specific slot, region, and instance. If you control a Linux startup script or container entrypoint, build the attribute string there so the shell expands the App Service variables:

```bash
export OTEL_RESOURCE_ATTRIBUTES="cloud.provider=azure,cloud.platform=azure.app_service,cloud.region=${REGION_NAME},service.instance.id=${WEBSITE_INSTANCE_ID:-$WEBSITE_ROLE_INSTANCE_ID},deployment.environment.name=${WEBSITE_SLOT_NAME:-Production}"
```

If you configure `OTEL_RESOURCE_ATTRIBUTES` directly in the Azure Portal as an Application setting, App Service passes the value as-is; it does not expand `$REGION_NAME` or `$WEBSITE_INSTANCE_ID` inside the setting. In that case, set concrete values or set the attribute string in startup code. The payoff shows up the first time you're debugging a bad deploy and can filter to a single instance or slot without writing a custom tag.

---

## Step 3: Get platform telemetry out via Diagnostic Settings

The SDK inside your app can't see what happens before the request reaches your code - front-end HTTP logs, App Service platform events, resource metrics, container startup failures. For that, use **Diagnostic Settings**.

Go to **App Service → Monitoring → Diagnostic settings → Add diagnostic setting** and enable at least:

- `AppServiceHTTPLogs` - the front-end HTTP request log
- `AppServiceConsoleLogs` - stdout/stderr from your container
- `AppServicePlatformLogs` - container lifecycle and platform events
- `AllMetrics` - CPU, memory, HTTP queue length, response times

Route them to an **Event Hub**. If you choose a named Event Hub in the diagnostic setting, all selected categories can go through that hub. If you leave the Event Hub name blank, Azure Monitor writes category-specific hubs such as `insights-logs-appservicehttplogs` and `insights-metrics-pt1m`, so configure one receiver per hub.

Then run an OpenTelemetry Collector with the `azure_event_hub` receiver to consume the stream and translate it into OTLP:

```yaml
receivers:
  azure_event_hub:
    connection: Endpoint=sb://...;SharedAccessKeyName=...;SharedAccessKey=...;EntityPath=appservice-diagnostics
    format: azure

processors:
  batch: {}
  resource:
    attributes:
      - key: cloud.provider
        value: azure
        action: upsert
      - key: cloud.platform
        value: azure.app_service
        action: upsert

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: YOUR_TOKEN

service:
  pipelines:
    logs:
      receivers: [azure_event_hub]
      processors: [resource, batch]
      exporters: [otlphttp]
    metrics:
      receivers: [azure_event_hub]
      processors: [resource, batch]
      exporters: [otlphttp]
```

Run that Collector on Azure Container Apps or an AKS cluster in the same region as your App Service. Now platform logs land in the same backend as your application traces, and you can correlate a 502 in the front-end HTTP log to the exception that caused it in the app.

---

## Step 4: Decide whether you need a Collector in front of the app

For a small app, exporting OTLP straight from the SDK to your backend works. For anything that matters in production, put a Collector between the two. Reasons:

- **Batching and retries.** The Collector buffers during backend hiccups. The SDK dropping spans during a 30-second outage is a familiar pain.
- **Enrichment.** Strip secrets, add tenant IDs, normalize attribute names once - not in every service.
- **Multi-backend fan-out.** Send traces to OneUptime and metrics to a long-term metrics store without re-instrumenting.

On App Service you have two Collector placement options:

1. **Sidecar container on Web App for Containers.** Add the `otel/opentelemetry-collector-contrib` image as a sidecar to your main app container. The SDK talks to the sidecar on `localhost:4318`. This is the path Microsoft now recommends - Docker Compose multi-container support is on retirement (ending March 31, 2027) in favor of sidecar containers, so start here even if you've used compose in the past.
2. **Dedicated Collector on Azure Container Apps or AKS.** The SDK exports over HTTPS to the Collector's public endpoint (or private endpoint via VNet integration). Works for every App Service runtime without changing the deployment artifact.

---

## App Service-specific gotchas

These are the things that consistently bite teams moving OpenTelemetry onto App Service:

- **Enable "Always On".** Without it, the app unloads during idle periods and takes the SDK's background exporter with it - partial traces, missing metrics, and cold-start latency that looks like a bug in your code.
- **The writable path is `/home` on Linux and `D:\home` on Windows.** If you want to write the Collector binary or a Java agent somewhere persistent on Linux, put it under `/home/site/wwwroot/`. For custom containers, make sure App Service storage is enabled if you expect `/home` to persist.
- **Slot swaps recycle the process.** Keep `OTEL_BSP_SCHEDULE_DELAY` at its default `5000` ms, or lower it carefully, so in-flight spans flush before the old slot shuts down. Just don't bump it up.
- **Private networking.** If the Collector is inside a VNet, enable **VNet Integration** on the App Service and verify the outbound egress rules allow traffic to the Collector's private endpoint.
- **Windows App Service sandbox restrictions.** Some profilers and native hooks are blocked. If the .NET auto-instrumentation fails silently on Windows, switch to code-based instrumentation with `OpenTelemetry.Extensions.Hosting`.
- **Container startup timeout.** App Service gives a Linux container 230 seconds by default to start responding on the configured port (tunable via `WEBSITES_CONTAINER_START_TIME_LIMIT`, 10–1800 seconds). A misconfigured Collector sidecar, or an app entrypoint that waits on it, can make the app fail to boot. Keep the sidecar's startup fast and don't make the app wait on it.
- **Resource CPU/memory limits.** The Collector sidecar shares the plan's CPU and RAM. On a B1 plan you'll notice the overhead. Size the plan accordingly if you're running a Collector sidecar.

---

## Verifying the pipeline

A quick end-to-end check before you declare victory:

1. Hit a route on your app and look for a trace in your backend with `service.name=my-app` and `cloud.platform=azure.app_service`.
2. Force a 502 by stopping the app mid-request, then check that the platform HTTP log arrived through the Event Hub → Collector path.
3. Restart the app and confirm a span appears for the first request after cold start. If it doesn't, Always On is probably off.
4. Filter by `service.instance.id` and confirm you can see each instance separately during a scale-out.

If all four pass, your two pipelines are healthy and you can start building SLOs against them.

---

## Sending it all to OneUptime

Point `OTEL_EXPORTER_OTLP_ENDPOINT` at your OneUptime OTLP ingest URL, set the `x-oneuptime-token` header, and traces, metrics, and logs land in the corresponding telemetry services - no Azure Monitor workspace or vendor-specific agents. The Collector pipeline for platform logs sends to the same endpoint, so application and platform telemetry sit next to each other in the same UI.

The point of OpenTelemetry on a PaaS like App Service is to keep the observability story portable. You get the same SDK, the same wire format, and the same backend choices you'd have on Kubernetes or bare metal. App Service just adds a few constraints - a locked-down sandbox, a separate path for platform telemetry, and a handful of runtime quirks - that are worth knowing up front.
