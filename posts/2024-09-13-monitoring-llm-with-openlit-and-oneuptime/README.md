#Monitoring LLM Application(s) with Openlit and OneUptime

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

OpenLIT automates telemetry data capture, simplifying the process for developers. Here’s a step-by-step guide to setting it up:
1. Install the OpenLIT SDK:
    First, you must install the following package: 

    ```shell
    pip install openlit
    ```

2. Get your OneUptime OpenTelemetry Credentials
    1. Sign in to your OneUptime account.
    2. Click on "More" in the Navigation bar and click on "Project Settings".
    3. On the Telemetry Ingestion Key page, click on "Create Ingestion Key" to create a token.
    
    ![](https://oneuptime.com/docs/static/images/TelemetryIngestionKeys.png)

    4. Once you created a token, click on "View" to view and copy the token.

    ![](https://oneuptime.com/docs/static/images/TelemetryIngestionKeyView.png)

3. Set Environment Variables:
    OpenTelemetry Environment variables for OneUptime can be set as follows in linux.

    ```shell
    export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp.oneuptime.com"
    export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=YOUR_ONEUPTIME_SERVICE_TOKEN"
    ```

    If you're self-hosting oneuptime, this can be changed to your self hosted OpenTelemetry collector endpoint (eg: http(s)://<your-oneuptime-host>/otlp)

4. Initialize the SDK:
    You will need to add the following to the LLM Application code.

    ```python
    import openlit
    openlit.init()
    ```

    Optionally, you can customize the application name and environment by setting the `application_name` and `environment` attributes when initializing OpenLIT in your application. These variables configure the OTel attributes `service.name` and `deployment.environment`, respectively. For more details on other configuration settings, check out the OpenLIT GitHub Repository.

    ```python
    openlit.init(application_name="YourAppName",environment="Production")
    ```

    The most popular libraries in GenAI are OpenAI (for accessing LLMs) and Langchain (for orchestrating steps). An example instrumentation of a Langchain and OpenAI based LLM Application will look like:

    ```python
    import getpass
    import os
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage
    import openlit 

    # Auto-instruments LLM and VectorDB calls, sending OTel traces and metrics to the configured endpoint
    openlit.init()

    os.environ["OPENAI_API_KEY"] = getpass.getpass()
    model = ChatOpenAI(model="gpt-4")
    messages = [
        SystemMessage(content="Translate the following from English into Italian"),
        HumanMessage(content="hi!"),
    ]
    model.invoke(messages)
    ```

## Visualizing Data with OneUptime
Once your LLM application is instrumented, you should see the traces and metrics in the OneUptime telemetry traces page. Please contact support@oneuptime.com if you need any help.

![](https://github.com/openlit/openlit/blob/main/docs/images/oneuptime-dashboard-1.png?raw=true)
![](https://github.com/openlit/openlit/blob/main/docs/images/oneuptime-dashboard-2.png?raw=true)

## Conclusion
Effective LLM observability is essential for the efficient and reliable operation of LLM applications. By leveraging OpenTelemetry's open standards and broad compatibility, OneUptime's robust analytical tools, and OpenLIT's seamless auto-instrumentation for over 20 GenAI tools ranging from LLMs, VectorDBs and GPUs, developers can achieve comprehensive visibility into their LLM performance. This integrated approach ensures that all aspects of your LLM systems are transparent, actionable, and optimized for peak efficiency and reliability.