# How to Export OpenTelemetry Traces from an iOS App via OTLP HTTP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Swift, iOS, OTLP, HTTP, Exporter, Mobile

Description: Configure the OTLP HTTP exporter to send OpenTelemetry traces from your iOS app to a backend collector for storage, analysis, and visualization in production.

Collecting traces locally with the stdout exporter works fine during development, but production apps need to send telemetry data to a backend system. The OpenTelemetry Protocol (OTLP) provides a standardized way to export traces, metrics, and logs to any compatible backend. The HTTP variant of OTLP works particularly well for mobile applications, handling network interruptions and providing reliable delivery of telemetry data.

## Understanding OTLP HTTP

OTLP defines both gRPC and HTTP/protobuf transport mechanisms. While gRPC offers better performance, HTTP is simpler to configure and works more reliably across different network conditions. Mobile networks frequently block or throttle non-standard ports and protocols, making HTTP the practical choice for iOS applications.

The OTLP HTTP exporter sends batches of spans to an endpoint via HTTP POST requests. It handles retries, compression, and authentication, making it production-ready out of the box. The protocol uses protobuf encoding for efficient data transfer, reducing bandwidth consumption on cellular networks.

## Installing the OTLP HTTP Exporter

Add the OTLP HTTP exporter package to your project through Swift Package Manager. It's part of the opentelemetry-swift ecosystem.

```swift
// Package.swift dependencies
dependencies: [
    .package(
        url: "https://github.com/open-telemetry/opentelemetry-swift",
        from: "1.5.0"
    )
]

// Target dependencies
.target(
    name: "YourApp",
    dependencies: [
        .product(name: "OpenTelemetryApi", package: "opentelemetry-swift"),
        .product(name: "OpenTelemetrySdk", package: "opentelemetry-swift"),
        .product(name: "OtlpHttpTraceExporter", package: "opentelemetry-swift"),
        .product(name: "ResourceExtension", package: "opentelemetry-swift")
    ]
)
```

Import the exporter alongside the core OpenTelemetry modules in your telemetry configuration code.

```swift
import OpenTelemetryApi
import OpenTelemetrySdk
import OtlpHttpTraceExporter
import ResourceExtension
```

## Basic OTLP HTTP Configuration

Configure the exporter with your backend endpoint. This example assumes you're sending data to an OpenTelemetry collector or compatible backend.

```swift
import Foundation
import OpenTelemetryApi
import OpenTelemetrySdk
import OtlpHttpTraceExporter
import ResourceExtension

class TelemetryConfiguration {
    static func initialize() {
        // Create resource with app identification
        let resource = Resource(attributes: [
            ResourceAttributes.serviceName.rawValue: AttributeValue.string("my-ios-app"),
            ResourceAttributes.serviceVersion.rawValue: AttributeValue.string("1.0.0"),
            ResourceAttributes.deploymentEnvironment.rawValue: AttributeValue.string("production")
        ])

        // Configure OTLP HTTP exporter
        let endpoint = "https://otel-collector.example.com:4318/v1/traces"

        let configuration = OtlpConfiguration(
            timeout: TimeInterval(10), // 10 second timeout
            headers: [
                ("Content-Type", "application/x-protobuf")
            ]
        )

        let exporter = OtlpHttpTraceExporter(
            endpoint: URL(string: endpoint)!,
            config: configuration
        )

        // Create a batch span processor
        // Batching reduces network requests by grouping spans together
        let processor = BatchSpanProcessor(
            spanExporter: exporter,
            scheduleDelay: TimeInterval(5) // Export every 5 seconds
        )

        // Build and register the tracer provider
        let tracerProvider = TracerProviderBuilder()
            .with(resource: resource)
            .add(spanProcessor: processor)
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)
    }
}
```

Call this initialization function early in your app lifecycle, typically in your AppDelegate or SwiftUI App struct.

```swift
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Initialize OpenTelemetry with OTLP HTTP exporter
        TelemetryConfiguration.initialize()

        return true
    }
}
```

## Adding Authentication Headers

Production backends typically require authentication. Add API keys or authorization tokens through custom headers.

```swift
import Foundation
import OtlpHttpTraceExporter

class SecureTelemetryConfiguration {
    // Load the API key from a secure location
    // Never hardcode secrets in your app
    private static func getAPIKey() -> String {
        // In a real app, retrieve from Keychain or secure configuration
        if let apiKey = Bundle.main.infoDictionary?["OTEL_API_KEY"] as? String {
            return apiKey
        }
        return ""
    }

    static func createExporter() -> OtlpHttpTraceExporter {
        let endpoint = "https://api.observability-platform.com/v1/traces"
        let apiKey = getAPIKey()

        let configuration = OtlpConfiguration(
            timeout: TimeInterval(15),
            headers: [
                ("Content-Type", "application/x-protobuf"),
                ("X-API-Key", apiKey),
                ("X-Client-Type", "ios"),
                ("X-Client-Version", Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown")
            ]
        )

        return OtlpHttpTraceExporter(
            endpoint: URL(string: endpoint)!,
            config: configuration
        )
    }
}
```

Store sensitive credentials in the iOS Keychain rather than in plain text configuration files or Info.plist entries.

## Configuring Batch Processing

The batch span processor controls when and how spans are exported. Fine-tune these settings to balance timeliness with efficiency.

```swift
import OpenTelemetrySdk
import OtlpHttpTraceExporter

class OptimizedTelemetryConfiguration {
    static func initialize() {
        let exporter = createExporter()

        // Configure batch processor with custom parameters
        let processor = BatchSpanProcessor(
            spanExporter: exporter,
            scheduleDelay: TimeInterval(5),      // Export every 5 seconds
            maxQueueSize: 2048,                   // Buffer up to 2048 spans
            maxExportBatchSize: 512,              // Send up to 512 spans per batch
            exportTimeout: TimeInterval(30)       // Give up after 30 seconds
        )

        let tracerProvider = TracerProviderBuilder()
            .with(resource: createResource())
            .add(spanProcessor: processor)
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)
    }

    private static func createExporter() -> OtlpHttpTraceExporter {
        let configuration = OtlpConfiguration(
            timeout: TimeInterval(30),
            headers: [("Content-Type", "application/x-protobuf")]
        )

        return OtlpHttpTraceExporter(
            endpoint: URL(string: "https://otel-collector.example.com:4318/v1/traces")!,
            config: configuration
        )
    }

    private static func createResource() -> Resource {
        return Resource(attributes: [
            ResourceAttributes.serviceName.rawValue: AttributeValue.string("my-ios-app")
        ])
    }
}
```

Larger batch sizes reduce network overhead but increase memory usage and delay trace delivery. Shorter schedule delays provide more real-time visibility but create more network requests. Adjust these values based on your app's telemetry volume and requirements.

## Handling Network Failures

Mobile apps lose connectivity frequently. The OTLP HTTP exporter handles retries automatically, but you should configure appropriate timeouts and understand the retry behavior.

```swift
import Foundation
import OpenTelemetrySdk
import OtlpHttpTraceExporter
import Network

class ResilientTelemetryConfiguration {
    private static let networkMonitor = NWPathMonitor()
    private static var isNetworkAvailable = true

    static func initialize() {
        // Monitor network status
        startNetworkMonitoring()

        // Create exporter with aggressive retry settings
        let exporter = createResilientExporter()

        // Use a custom span processor that respects network status
        let processor = NetworkAwareBatchProcessor(
            spanExporter: exporter,
            scheduleDelay: TimeInterval(10),
            maxQueueSize: 4096  // Larger queue for offline scenarios
        )

        let tracerProvider = TracerProviderBuilder()
            .with(resource: createResource())
            .add(spanProcessor: processor)
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)
    }

    private static func startNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { path in
            isNetworkAvailable = path.status == .satisfied
        }

        networkMonitor.start(queue: DispatchQueue.global(qos: .utility))
    }

    private static func createResilientExporter() -> OtlpHttpTraceExporter {
        let configuration = OtlpConfiguration(
            timeout: TimeInterval(60), // Longer timeout for poor networks
            headers: [("Content-Type", "application/x-protobuf")]
        )

        return OtlpHttpTraceExporter(
            endpoint: URL(string: "https://otel-collector.example.com:4318/v1/traces")!,
            config: configuration
        )
    }

    private static func createResource() -> Resource {
        return Resource(attributes: [
            ResourceAttributes.serviceName.rawValue: AttributeValue.string("my-ios-app")
        ])
    }
}

// Custom processor that checks network status before exporting
class NetworkAwareBatchProcessor: BatchSpanProcessor {
    private let networkMonitor = NWPathMonitor()
    private var isOnline = true

    override init(
        spanExporter: SpanExporter,
        scheduleDelay: TimeInterval = 5,
        maxQueueSize: Int = 2048,
        maxExportBatchSize: Int = 512,
        exportTimeout: TimeInterval = 30
    ) {
        super.init(
            spanExporter: spanExporter,
            scheduleDelay: scheduleDelay,
            maxQueueSize: maxQueueSize,
            maxExportBatchSize: maxExportBatchSize,
            exportTimeout: exportTimeout
        )

        startMonitoring()
    }

    private func startMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            self?.isOnline = path.status == .satisfied

            // If we just came online, force an export
            if path.status == .satisfied {
                self?.forceFlush()
            }
        }

        networkMonitor.start(queue: DispatchQueue.global(qos: .utility))
    }
}
```

## Compression for Bandwidth Optimization

OTLP supports gzip compression to reduce bandwidth usage. This is particularly important for mobile apps on cellular networks.

```swift
import Foundation
import OtlpHttpTraceExporter

class CompressedTelemetryConfiguration {
    static func createCompressedExporter() -> OtlpHttpTraceExporter {
        let configuration = OtlpConfiguration(
            timeout: TimeInterval(30),
            headers: [
                ("Content-Type", "application/x-protobuf"),
                ("Content-Encoding", "gzip")  // Enable compression
            ]
        )

        return OtlpHttpTraceExporter(
            endpoint: URL(string: "https://otel-collector.example.com:4318/v1/traces")!,
            config: configuration,
            useCompression: true  // Enable gzip compression
        )
    }
}
```

Compression reduces data transfer by 70-90% for typical trace payloads. The CPU overhead is minimal compared to the bandwidth savings, making it beneficial for nearly all production deployments.

## Environment-Specific Configuration

Use different endpoints and settings for development, staging, and production environments.

```swift
import Foundation
import OpenTelemetrySdk
import OtlpHttpTraceExporter

enum DeploymentEnvironment {
    case development
    case staging
    case production

    var otlpEndpoint: String {
        switch self {
        case .development:
            return "http://localhost:4318/v1/traces"
        case .staging:
            return "https://otel-staging.example.com:4318/v1/traces"
        case .production:
            return "https://otel.example.com:4318/v1/traces"
        }
    }

    var batchDelay: TimeInterval {
        switch self {
        case .development:
            return 2  // Faster export for immediate feedback
        case .staging, .production:
            return 10 // Longer delay to reduce network overhead
        }
    }

    var samplingRate: Double {
        switch self {
        case .development:
            return 1.0  // Sample everything in development
        case .staging:
            return 0.5  // Sample 50% in staging
        case .production:
            return 0.1  // Sample 10% in production
        }
    }
}

class EnvironmentAwareTelemetryConfiguration {
    static func initialize() {
        let environment = getCurrentEnvironment()

        let exporter = OtlpHttpTraceExporter(
            endpoint: URL(string: environment.otlpEndpoint)!,
            config: OtlpConfiguration(
                timeout: TimeInterval(30),
                headers: [("Content-Type", "application/x-protobuf")]
            ),
            useCompression: true
        )

        let processor = BatchSpanProcessor(
            spanExporter: exporter,
            scheduleDelay: environment.batchDelay
        )

        let tracerProvider = TracerProviderBuilder()
            .with(resource: createResource(environment: environment))
            .add(spanProcessor: processor)
            .with(sampler: Samplers.traceIdRatio(ratio: environment.samplingRate))
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)
    }

    private static func getCurrentEnvironment() -> DeploymentEnvironment {
        #if DEBUG
        return .development
        #else
        // Check for TestFlight or production build
        if Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt" {
            return .staging
        }
        return .production
        #endif
    }

    private static func createResource(environment: DeploymentEnvironment) -> Resource {
        return Resource(attributes: [
            ResourceAttributes.serviceName.rawValue: AttributeValue.string("my-ios-app"),
            ResourceAttributes.deploymentEnvironment.rawValue: AttributeValue.string(
                String(describing: environment)
            )
        ])
    }
}
```

## Debugging Export Issues

When traces aren't appearing in your backend, debugging the export pipeline helps identify the problem.

```swift
import Foundation
import OpenTelemetrySdk
import OtlpHttpTraceExporter

class DebuggableTelemetryConfiguration {
    static func initialize() {
        // Create a debugging wrapper around the exporter
        let baseExporter = createExporter()
        let debugExporter = DebuggingExporter(wrapping: baseExporter)

        let processor = BatchSpanProcessor(spanExporter: debugExporter)

        let tracerProvider = TracerProviderBuilder()
            .with(resource: createResource())
            .add(spanProcessor: processor)
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)
    }

    private static func createExporter() -> OtlpHttpTraceExporter {
        return OtlpHttpTraceExporter(
            endpoint: URL(string: "https://otel-collector.example.com:4318/v1/traces")!,
            config: OtlpConfiguration(
                timeout: TimeInterval(30),
                headers: [("Content-Type", "application/x-protobuf")]
            )
        )
    }

    private static func createResource() -> Resource {
        return Resource(attributes: [
            ResourceAttributes.serviceName.rawValue: AttributeValue.string("my-ios-app")
        ])
    }
}

// Wrapper exporter that logs export attempts
class DebuggingExporter: SpanExporter {
    private let wrappedExporter: SpanExporter

    init(wrapping exporter: SpanExporter) {
        self.wrappedExporter = exporter
    }

    func export(spans: [SpanData], explicitTimeout: TimeInterval?) -> SpanExporterResultCode {
        print("[OTLP Export] Attempting to export \(spans.count) spans")

        let startTime = Date()
        let result = wrappedExporter.export(spans: spans, explicitTimeout: explicitTimeout)
        let duration = Date().timeIntervalSince(startTime)

        switch result {
        case .success:
            print("[OTLP Export] Successfully exported \(spans.count) spans in \(duration)s")
        case .failure:
            print("[OTLP Export] Failed to export spans after \(duration)s")
        }

        return result
    }

    func flush(explicitTimeout: TimeInterval?) -> SpanExporterResultCode {
        print("[OTLP Export] Flush requested")
        return wrappedExporter.flush(explicitTimeout: explicitTimeout)
    }

    func shutdown(explicitTimeout: TimeInterval?) {
        print("[OTLP Export] Shutdown requested")
        wrappedExporter.shutdown(explicitTimeout: explicitTimeout)
    }
}
```

Remove this debugging wrapper in production builds to avoid log spam.

## Ensuring Data Delivery on App Termination

Mobile apps can be terminated suddenly by the system or user. Flush pending spans before termination to avoid data loss.

```swift
import UIKit
import OpenTelemetrySdk

class AppDelegate: UIResponder, UIApplicationDelegate {
    private var tracerProvider: TracerProviderSdk?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Store reference to tracer provider for shutdown
        tracerProvider = TelemetryConfiguration.initialize()

        return true
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Flush all pending spans before app terminates
        print("App terminating, flushing telemetry data...")

        // Force flush with timeout
        _ = tracerProvider?.forceFlush(timeout: 5.0)

        // Shutdown the provider
        tracerProvider?.shutdown()

        print("Telemetry shutdown complete")
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Also flush when app enters background
        // The app might be terminated while in background
        _ = tracerProvider?.forceFlush(timeout: 2.0)
    }
}

extension TelemetryConfiguration {
    static func initialize() -> TracerProviderSdk {
        let exporter = createExporter()
        let processor = BatchSpanProcessor(spanExporter: exporter)

        let tracerProvider = TracerProviderBuilder()
            .with(resource: createResource())
            .add(spanProcessor: processor)
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)

        return tracerProvider
    }

    private static func createExporter() -> OtlpHttpTraceExporter {
        return OtlpHttpTraceExporter(
            endpoint: URL(string: "https://otel-collector.example.com:4318/v1/traces")!,
            config: OtlpConfiguration(
                timeout: TimeInterval(30),
                headers: [("Content-Type", "application/x-protobuf")]
            )
        )
    }

    private static func createResource() -> Resource {
        return Resource(attributes: [
            ResourceAttributes.serviceName.rawValue: AttributeValue.string("my-ios-app")
        ])
    }
}
```

## Validating OTLP Configuration

Test your OTLP exporter configuration to ensure traces reach your backend.

```swift
import OpenTelemetryApi

class TelemetryValidator {
    static func sendTestTrace() {
        let tracer = OpenTelemetry.instance.tracerProvider.get(
            instrumentationName: "validation",
            instrumentationVersion: "1.0.0"
        )

        let span = tracer.spanBuilder(spanName: "test_trace")
            .setSpanKind(spanKind: .client)
            .startSpan()

        span.setAttribute(key: "test.type", value: "validation")
        span.setAttribute(key: "test.timestamp", value: Date().timeIntervalSince1970)

        span.end()

        // Force flush to send immediately
        if let provider = OpenTelemetry.instance.tracerProvider as? TracerProviderSdk {
            let result = provider.forceFlush(timeout: 10.0)

            switch result {
            case .success:
                print("Test trace sent successfully")
            case .failure:
                print("Failed to send test trace")
            }
        }
    }
}
```

Call this validation function after configuring your exporter. Check your backend for the test trace to confirm everything works correctly.

## Performance Considerations

The OTLP HTTP exporter runs background tasks to batch and export spans. These operations consume CPU, memory, and network bandwidth. Monitor the impact on your app:

- Battery usage from network requests
- Memory consumption from span buffering
- Network bandwidth on cellular connections
- CPU usage during protobuf encoding

Use sampling in production to reduce telemetry volume. Sample a representative subset of requests rather than tracing everything. This maintains observability while reducing overhead and costs.

## Complete Production Configuration

Here's a complete production-ready configuration combining all the best practices:

```swift
import Foundation
import OpenTelemetryApi
import OpenTelemetrySdk
import OtlpHttpTraceExporter
import ResourceExtension

class ProductionTelemetryConfiguration {
    private static var tracerProvider: TracerProviderSdk?

    static func initialize() {
        let environment = getCurrentEnvironment()

        let exporter = OtlpHttpTraceExporter(
            endpoint: URL(string: environment.otlpEndpoint)!,
            config: OtlpConfiguration(
                timeout: TimeInterval(30),
                headers: [
                    ("Content-Type", "application/x-protobuf"),
                    ("Content-Encoding", "gzip"),
                    ("X-API-Key", getAPIKey())
                ]
            ),
            useCompression: true
        )

        let processor = BatchSpanProcessor(
            spanExporter: exporter,
            scheduleDelay: environment.batchDelay,
            maxQueueSize: 4096,
            maxExportBatchSize: 512
        )

        tracerProvider = TracerProviderBuilder()
            .with(resource: createResource())
            .add(spanProcessor: processor)
            .with(sampler: Samplers.traceIdRatio(ratio: environment.samplingRate))
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider!)
    }

    static func shutdown() {
        _ = tracerProvider?.forceFlush(timeout: 5.0)
        tracerProvider?.shutdown()
    }

    private static func createResource() -> Resource {
        return Resource(attributes: [
            ResourceAttributes.serviceName.rawValue: AttributeValue.string(
                Bundle.main.bundleIdentifier ?? "unknown"
            ),
            ResourceAttributes.serviceVersion.rawValue: AttributeValue.string(
                Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
            ),
            ResourceAttributes.deploymentEnvironment.rawValue: AttributeValue.string(
                String(describing: getCurrentEnvironment())
            )
        ])
    }

    private static func getCurrentEnvironment() -> DeploymentEnvironment {
        #if DEBUG
        return .development
        #else
        if Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt" {
            return .staging
        }
        return .production
        #endif
    }

    private static func getAPIKey() -> String {
        // Retrieve from Keychain in production
        return Bundle.main.infoDictionary?["OTEL_API_KEY"] as? String ?? ""
    }
}
```

## Connecting Your iOS App to the World

The OTLP HTTP exporter transforms locally collected traces into a distributed observability system. Your iOS app becomes part of a larger telemetry ecosystem, where mobile traces can be correlated with backend service traces, creating end-to-end visibility across your entire application stack.

Configure the exporter carefully to balance observability needs with resource consumption. Use compression, batching, and sampling to minimize overhead while maintaining useful visibility into your app's behavior. With proper configuration, the OTLP HTTP exporter reliably delivers telemetry data even in challenging mobile network conditions.
