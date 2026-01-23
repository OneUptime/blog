# Monitoring LLM Application(s) with Openlit and OneUptime

Author: [AmanAgarwal041](https://github.com/AmanAgarwal041)

Tags: LLM Observability, Openlit, OpenTelemetry

Description: How to monitor LLMs using tools like Openlit & OpenTelemetry to ensure accurate outputs, improve data retrieval, and optimize costs, with OneUptime for visualizing performance metrics.

# Overview

Keeping an eye on large language models (LLMs) is key to understanding how they operate. This involves monitoring everything from their applications and prompts to their data sources and outputs. It's crucial because it ensures that LLMs perform accurately and reliably.

## Why LLM Observability Matters

As LLMs evolve, they're used in more applications such as chatbots, copilots, code generation, and content creation. These LLMs are fantastic for their speed and ability to handle complex queries using a wide range of data sources.

However, just because a model processes more data faster doesn't mean it's effective. Accurate data is essential, and flawed data sources can lead to wrong outputs. Similarly, even if the data is correct, bad processing can result in unreliable outcomes. Observing your LLM ensures all parts of it function accurately and consistently.

## Core Elements of LLM Observability

Here are the three main components to focus on when observing LLMs:

### Evaluating Outputs
It's important for teams to regularly check how accurate and reliable the outputs are. In many cases, organizations using third-party LLMs will engage a separate LLM designed solely for evaluation purposes.

### Analyzing Prompts
A common issue with bad outputs is poorly structured prompts. Observability includes looking at these prompts to determine if they yield the desired results and if there are better ways to phrase them.

### Improving Data Retrieval
The accuracy and context of retrieved data are critical for good outputs. Observability looks at how data is fetched and considers ways to make this process more accurate.

### Optimizing Costs 
Using LLMs can become costly as each LLM request has a cost associated with it and it becomes very important at large scale to keep these costs as low as possible.

## Using OpenTelemetry

OpenTelemetry is an open-source framework designed for observability. It collects and exports monitoring data in a way that isn't tied to any specific vendor, making it very versatile. This is especially useful for LLM applications because it works well with various monitoring tools.

For LLMs, tracking operation sequences (traces) is vital, especially when using orchestration frameworks like LangChain or LlamaIndex. Tracing simplifies debugging and helps in pinpointing the root causes of problems more effectively.

### Implementing Automatic Instrumentation with OpenLIT

OpenLIT automates telemetry data capture, simplifying the process for developers. Instead of manually instrumenting every LLM call, OpenLIT hooks into popular libraries like OpenAI, LangChain, and LlamaIndex to automatically capture traces, metrics, and metadata. Here's a step-by-step guide to setting it up:

#### Step 1: Install the OpenLIT SDK

The OpenLIT SDK is a Python package that provides automatic instrumentation for LLM applications. It captures detailed telemetry data including request/response payloads, token counts, latency measurements, and cost estimates from popular AI/ML libraries.

```shell
# Install the OpenLIT SDK for automatic LLM instrumentation
# This package captures telemetry data from popular AI/ML libraries
pip install openlit
```

#### Step 2: Get your OneUptime OpenTelemetry Credentials

Before you can send telemetry data to OneUptime, you need to create an ingestion key that authenticates your application.

1. Sign in to your OneUptime account.
2. Click on "More" in the Navigation bar and click on "Project Settings".
3. On the Telemetry Ingestion Key page, click on "Create Ingestion Key" to create a token.
    
![](https://oneuptime.com/docs/static/images/TelemetryIngestionKeys.png)

4. Once you created a token, click on "View" to view and copy the token.

![](https://oneuptime.com/docs/static/images/TelemetryIngestionKeyView.png)

#### Step 3: Set Environment Variables

OpenTelemetry uses environment variables to configure the exporter endpoint and authentication. These variables tell your application where to send telemetry data (the OTLP endpoint) and how to authenticate with OneUptime (via the service token).

```shell
# Set the OpenTelemetry collector endpoint for OneUptime
# This is where all traces and metrics will be sent
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp.oneuptime.com"

# Set the authentication header with your OneUptime service token
# Replace YOUR_ONEUPTIME_SERVICE_TOKEN with the token from step 2
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=YOUR_ONEUPTIME_SERVICE_TOKEN"
```

If you're self-hosting OneUptime, change the endpoint to your self-hosted OpenTelemetry collector endpoint (e.g., `http(s)://<your-oneuptime-host>/otlp`).

#### Step 4: Initialize the SDK

Add the OpenLIT initialization code at the very start of your application, before importing any LLM libraries. This ensures that OpenLIT can properly hook into the libraries and capture all telemetry data. The `init()` function sets up automatic instrumentation for all supported AI/ML libraries including OpenAI, Anthropic, LangChain, LlamaIndex, and vector databases.

```python
# Import the OpenLIT SDK
import openlit

# Initialize OpenLIT - this automatically instruments LLM calls
# Must be called before any LLM library imports for best results
openlit.init()
```

You can customize the service identification by setting the `application_name` and `environment` parameters. These values map to OpenTelemetry resource attributes (`service.name` and `deployment.environment`), which help you identify your service in the OneUptime dashboard and filter traces by environment.

```python
# Initialize with custom service name and environment
# application_name: Sets the service.name attribute in traces
# environment: Sets the deployment.environment attribute (e.g., Production, Staging)
openlit.init(application_name="YourAppName", environment="Production")
```

For more configuration options, check out the [OpenLIT GitHub Repository](https://github.com/openlit/openlit).

#### Complete Example: Instrumenting a LangChain Application

The following example demonstrates a complete LangChain application with OpenLIT instrumentation. It shows how to set up a chat model with OpenAI's GPT-4 and send a simple translation request. When you run this code with OpenLIT initialized and the environment variables configured, all LLM interactions are automatically captured and sent to OneUptime.

```python
# Standard library imports for secure credential handling
import getpass
import os

# LangChain imports for chat model and message types
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# Import OpenLIT for automatic instrumentation
import openlit

# Initialize OpenLIT BEFORE making any LLM calls
# This auto-instruments LLM and VectorDB calls, sending OTel traces
# and metrics to the configured endpoint (set via environment variables)
openlit.init()

# Securely prompt for OpenAI API key (won't echo to terminal)
os.environ["OPENAI_API_KEY"] = getpass.getpass()

# Initialize the ChatOpenAI model with GPT-4
model = ChatOpenAI(model="gpt-4")

# Create a list of messages for the chat model
# SystemMessage: Sets the context/behavior for the AI
# HumanMessage: The user's input to be processed
messages = [
    SystemMessage(content="Translate the following from English into Italian"),
    HumanMessage(content="hi!"),
]

# Invoke the model - OpenLIT automatically captures this call as a trace
# including latency, token usage, and model parameters
model.invoke(messages)
```

The trace captured by OpenLIT includes:
- **Request details**: The prompts sent to the model
- **Response content**: The model's output
- **Token usage**: Input and output token counts for cost tracking
- **Latency**: Time taken for the API call
- **Model metadata**: Model name, temperature, and other parameters

## Visualizing Data with OneUptime
Once your LLM application is instrumented, you should see the traces and metrics in the OneUptime telemetry traces page. Please contact support@oneuptime.com if you need any help.

![](https://github.com/openlit/openlit/blob/main/docs/images/oneuptime-dashboard-1.png?raw=true)
![](https://github.com/openlit/openlit/blob/main/docs/images/oneuptime-dashboard-2.png?raw=true)

## Conclusion
Effective LLM observability is essential for the efficient and reliable operation of LLM applications. By leveraging OpenTelemetry's open standards and broad compatibility, OneUptime's robust analytical tools, and OpenLIT's seamless auto-instrumentation for over 20 GenAI tools ranging from LLMs, VectorDBs and GPUs, developers can achieve comprehensive visibility into their LLM performance. This integrated approach ensures that all aspects of your LLM systems are transparent, actionable, and optimized for peak efficiency and reliability.

**Related Reading:**

- [Why build open-source DataDog?](https://oneuptime.com/blog/post/2024-08-14-why-build-open-source-datadog/view)
- [Logs, Metrics & Traces: Turning Three Noisy Streams into One Story](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [Traces vs Metrics in Software Observability](https://oneuptime.com/blog/post/2025-08-21-traces-vs-metrics-in-opentelemetry/view)