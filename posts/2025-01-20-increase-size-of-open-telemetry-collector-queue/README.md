# How to increase the size of the sending queue in OpenTelemetry Collector?

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: OpenTelemetry

Description: Sometimes your OpenTelemetry Collector might not be able to send all the data to the backend. This is because the sending queue is full. This post will help you increase the size of the sending queue.

### How to increase the size of OpenTelemetry Collector Sending Queue?

In the OpenTelemetry Collector, the sending queue is used to buffer the data before sending it to the backend. If the sending queue is full, the Collector will start dropping the data. This can happen if the backend is slow or if the network is slow. 

By default, the sending queue size is set to 1000 and the number of consumers is set to 1. You can increase the sending queue size and the number of consumers to handle more data.

Here's how to increase it: 

```yaml

# Exporter section of your configuration file will look like this:
exporters:

  # Example exporter configuration
  otlphttp:
    endpoint: "http://your_exporter_endpoint:port"
    headers: {"Content-Type": "application/json"}

    # Sending queue configuration
    sending_queue:
      enabled: true
      num_consumers: 3
      queue_size: 1000
```



In the above configuration, we have set the sending queue size to 1000. You can increase or decrease this value based on your needs. The `num_consumers` field specifies the number of consumers that will be reading from the queue. You can increase this value if you have a high volume of data to send.

After making these changes, restart the OpenTelemetry Collector for the changes to take effect.


### Some things to be aware of:

- Increasing the sending queue size will increase the memory usage of the Collector. Make sure you have enough memory available on your system.
- Increasing the number of consumers will increase the CPU usage of the Collector. Make sure you have enough CPU resources available on your system.
- If your backend where the data is being sent is slow, increasing the sending queue size might not help. You might need to look into optimizing the backend or scaling the network. 

By increasing the sending queue size and the number of consumers, you can ensure that your OpenTelemetry Collector can handle more data and send it to the backend without dropping it.

If you do not want to host your own OpenTelemetry backend, you can use a managed service like [OneUptime](https://oneuptime.com) to collect and analyze your traces, logs, and metrics. 

Happy tracing!