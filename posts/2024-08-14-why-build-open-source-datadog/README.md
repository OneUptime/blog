# Why build open-source DataDog?

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: DataDog, Open Source

Description: Building an open-source alternative to Datadog enhances cost-efficiency, observability, and data privacy, offering a net-positive impact on the software world.

### It's expensive - a lot of companies pay more in Datadog bills than in cloud costs. 

Many organizations find themselves spending more on Datadog's monitoring and observability services than on their actual cloud infrastructure. This can be a significant financial burden, especially for startups and small to medium-sized enterprises. By building an open-source alternative like OneUptime, we aim to provide a cost-effective solution that offers similar, if not superior, capabilities without the hefty price tag. This allows companies to allocate their budgets more efficiently and invest in other critical areas of their business.

### We love open source. We believe open software wins. We believe open protocol wins. 

At OneUptime, we believe in the power of open source. **Open-source software is eating the world.**  It allows anyone to contribute to and improve OneUptime increasing the pace of development and innovation, ensuring it evolves to meet the community's needs. Open protocols like [OpenTelemetry](https://opentelemetry.io/) and standards ensure interoperability and prevent vendor lock-in, giving users the freedom to choose the best tools for their needs. By embracing open source, we are 100% committed to building a robust, flexible, and community-driven observability platform. We believe that open software and open protocols are the future of observability and are essential for driving the best observability experience for developers. 

### More automated code fixes, less noise, graphs and charts. 

While Datadog provides valuable insights through graphs and charts, OneUptime goes a step further. In addition to comprehensive observability data, we offer a unique feature: the ability to install our GitHub Actions runner. This runner can automatically scans your code, identify issues, and create pull requests to fix them. This integration streamlines the development process, enhances code quality, and accelerates the resolution of issues, positioning OneUptime at the forefront of software observability and automation.

**No part of your code is sent to us. We run the code in your environment, on a runner you control, on your infrastructure, on the AI model hosted by you.**

### Companies don't want to send data to Datadog because of sensitive information.

Data privacy and security are paramount concerns for many organizations (specially in Healthcare and Financial Services industries). Sending sensitive information to third-party services like Datadog can pose risks. OneUptime offers a secure alternative by allowing companies to self-host their observability platform. This ensures that sensitive data remains within the organization's control, reducing the risk of data breaches and ensuring compliance with data protection regulations. 

You can run OneUptime on your own infrastructure, in your own cloud account, or on your own Kubernetes cluster. All data is stored in your own database, and you have full control over who can access it. This self-hosted approach provides peace of mind and reassurance that your data is on-prem, safe and secure.

### We're open telemetry native.

OneUptime is built with OpenTelemetry at its core. OpenTelemetry is an open-source observability framework that provides standardized instrumentation for collecting metrics, logs, and traces. By being OpenTelemetry native, OneUptime ensures seamless integration with a wide range of tools and services, offering a unified and comprehensive observability solution. This native support simplifies the setup process and enhances the platform's flexibility and scalability.

**Related Reading:**

- [Datadog Dollars: Why Your Monitoring Bill Is Breaking the Bank](https://oneuptime.com/blog/post/2025-02-01-datadog-dollars-why-monitoring-is-breaking-the-bank/view)
- [Monitoring LLM Application(s) with Openlit and OneUptime](https://oneuptime.com/blog/post/2024-09-13-monitoring-llm-with-openlit-and-oneuptime/view)
- [Logs, Metrics & Traces: Turning Three Noisy Streams into One Story](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
