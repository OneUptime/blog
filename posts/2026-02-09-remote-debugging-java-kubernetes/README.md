# How to Set Up Remote Debugging for Java Applications Running in Kubernetes with JVM Attach

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Kubernetes, Debugging, JVM, DevOps

Description: Set up remote debugging for Java applications in Kubernetes using JDWP and JVM attach capabilities to troubleshoot production issues without rebuilding or redeploying containers.

---

Debugging Java applications running in Kubernetes clusters presents unique challenges. Traditional debugging approaches often require rebuilding containers with debug flags or connecting through complex network configurations. Understanding how to use JVM's remote debugging capabilities makes troubleshooting production issues significantly faster.

This guide shows you how to configure remote debugging for Java applications in Kubernetes, use JVM attach to connect debuggers to running processes, and implement best practices that balance debugging capabilities with security concerns.

## Understanding Java Remote Debugging

The Java Virtual Machine provides the Java Debug Wire Protocol (JDWP) for remote debugging. JDWP allows debuggers like IntelliJ IDEA or Eclipse to connect to running JVM processes, set breakpoints, inspect variables, and step through code execution.

The JVM exposes debugging through the JDWP agent, which you enable with specific command-line arguments when starting your application.

## Configuring JVM for Remote Debugging

Add JDWP parameters to your Java application's startup command:

```dockerfile
# Dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app
COPY target/myapp.jar /app/app.jar

# Add debug options as environment variable
ENV JAVA_TOOL_OPTIONS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"

ENTRYPOINT ["java", "-jar", "app.jar"]
```

The debug options breakdown:

- `transport=dt_socket`: Use TCP socket transport
- `server=y`: JVM listens for debugger connections
- `suspend=n`: Don't wait for debugger before starting (use `suspend=y` for startup debugging)
- `address=*:5005`: Listen on all interfaces, port 5005

## Kubernetes Deployment Configuration

Create a deployment with debugging capabilities:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-app
  namespace: development
spec:
  replicas: 1
  selector:
    matchLabels:
      app: java-app
  template:
    metadata:
      labels:
        app: java-app
    spec:
      containers:
      - name: java-app
        image: myregistry/java-app:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 5005
          name: debug
        env:
        - name: JAVA_TOOL_OPTIONS
          value: "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: java-app
  namespace: development
spec:
  selector:
    app: java-app
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: debug
    port: 5005
    targetPort: 5005
```

## Connecting Your IDE Debugger

Use kubectl port-forward to create a secure tunnel to the debug port:

```bash
# Forward the debug port to your local machine
kubectl port-forward -n development deployment/java-app 5005:5005
```

Configure IntelliJ IDEA for remote debugging:

1. Open Run > Edit Configurations
2. Add new Remote JVM Debug configuration
3. Set debugger mode to "Attach to remote JVM"
4. Set host to `localhost`
5. Set port to `5005`
6. Click Apply and OK

Start debugging by clicking the debug button. IntelliJ connects to your Kubernetes pod and you can set breakpoints in your code.

## Dynamic Debugging with JVM Attach

For production environments where debug ports should not be exposed, use JVM attach to enable debugging on demand:

```java
// DebugAgent.java
import com.sun.tools.attach.VirtualMachine;
import com.sun.tools.attach.AgentInitializationException;
import com.sun.tools.attach.AgentLoadException;
import com.sun.tools.attach.AttachNotSupportedException;

import java.io.IOException;

public class DebugAgent {
    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: java DebugAgent <pid>");
            System.exit(1);
        }

        String pid = args[0];
        String debugOptions = "transport=dt_socket,server=y,suspend=n,address=*:5005";

        try {
            // Attach to the target JVM
            VirtualMachine vm = VirtualMachine.attach(pid);

            // Load the JDWP agent
            vm.startLocalManagementAgent();
            String agentArgs = debugOptions;
            vm.loadAgent("jdwp=" + agentArgs);

            System.out.println("Debug agent loaded successfully on PID: " + pid);
            System.out.println("Debug port: 5005");

            vm.detach();
        } catch (AttachNotSupportedException | IOException | AgentLoadException | AgentInitializationException e) {
            System.err.println("Failed to attach to JVM: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
```

Create a sidecar container with debugging tools:

```yaml
# deployment-with-debugger.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-app
spec:
  template:
    spec:
      shareProcessNamespace: true
      containers:
      - name: java-app
        image: myregistry/java-app:latest
        ports:
        - containerPort: 8080

      - name: debug-sidecar
        image: openjdk:17-jdk-slim
        command: ["/bin/sh"]
        args: ["-c", "while true; do sleep 3600; done"]
        securityContext:
          capabilities:
            add: ["SYS_PTRACE"]
```

Attach the debugger from the sidecar:

```bash
# Find the Java process PID
kubectl exec -it java-app -c debug-sidecar -- ps aux | grep java

# Attach debugger to the process
kubectl exec -it java-app -c debug-sidecar -- java -cp /usr/lib/jvm/java-17-openjdk/lib/tools.jar DebugAgent <PID>

# Forward the debug port
kubectl port-forward java-app 5005:5005
```

## Building a Debug Enabler Script

Create a utility script to enable debugging on demand:

```bash
#!/bin/bash
# enable-java-debug.sh

set -e

NAMESPACE=$1
DEPLOYMENT=$2
DEBUG_PORT=${3:-5005}

if [ -z "$NAMESPACE" ] || [ -z "$DEPLOYMENT" ]; then
    echo "Usage: $0 <namespace> <deployment> [debug-port]"
    exit 1
fi

echo "Enabling debug mode for $DEPLOYMENT in namespace $NAMESPACE..."

# Get pod name
POD=$(kubectl get pod -n "$NAMESPACE" -l app="$DEPLOYMENT" -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
    echo "No pod found for deployment $DEPLOYMENT"
    exit 1
fi

echo "Found pod: $POD"

# Check if debug port is already open
if kubectl exec -n "$NAMESPACE" "$POD" -- netstat -an | grep -q ":$DEBUG_PORT"; then
    echo "Debug port $DEBUG_PORT is already open"
else
    echo "Debug port not found, attempting to attach..."

    # Find Java process PID
    JAVA_PID=$(kubectl exec -n "$NAMESPACE" "$POD" -- ps aux | grep 'java.*jar' | grep -v grep | awk '{print $2}')

    if [ -z "$JAVA_PID" ]; then
        echo "Could not find Java process"
        exit 1
    fi

    echo "Found Java process with PID: $JAVA_PID"

    # Note: This requires the JDK to be available in the container
    kubectl exec -n "$NAMESPACE" "$POD" -- jcmd "$JAVA_PID" VM.start_java_debugging
fi

# Set up port forward
echo "Setting up port forward on localhost:$DEBUG_PORT..."
kubectl port-forward -n "$NAMESPACE" "$POD" "$DEBUG_PORT:$DEBUG_PORT" &
PF_PID=$!

echo ""
echo "Debug enabled! Connect your debugger to localhost:$DEBUG_PORT"
echo "Press Ctrl+C to stop port forwarding"

# Wait for interrupt
trap "kill $PF_PID 2>/dev/null" EXIT
wait $PF_PID
```

Use the script:

```bash
chmod +x enable-java-debug.sh
./enable-java-debug.sh development java-app 5005
```

## Conditional Debug Mode with Environment Variables

Enable debugging based on environment configuration:

```java
// Application.java
public class Application {
    public static void main(String[] args) {
        // Check if debug mode is requested
        String debugMode = System.getenv("DEBUG_MODE");

        if ("true".equals(debugMode)) {
            enableDebugMode();
        }

        // Start application
        SpringApplication.run(Application.class, args);
    }

    private static void enableDebugMode() {
        try {
            String debugPort = System.getenv().getOrDefault("DEBUG_PORT", "5005");

            // Start JDWP agent programmatically
            Class<?> vmClass = Class.forName("com.sun.tools.attach.VirtualMachine");
            String pid = ManagementFactory.getRuntimeMXBean().getName().split("@")[0];

            Object vm = vmClass.getMethod("attach", String.class).invoke(null, pid);

            String options = String.format(
                "transport=dt_socket,server=y,suspend=n,address=*:%s",
                debugPort
            );

            vmClass.getMethod("startManagementAgent", String.class)
                   .invoke(vm, options);

            System.out.println("Debug mode enabled on port " + debugPort);

            vmClass.getMethod("detach").invoke(vm);
        } catch (Exception e) {
            System.err.println("Failed to enable debug mode: " + e.getMessage());
        }
    }
}
```

Enable debugging via ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: java-app-config
data:
  DEBUG_MODE: "false"
  DEBUG_PORT: "5005"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-app
spec:
  template:
    spec:
      containers:
      - name: java-app
        envFrom:
        - configMapRef:
            name: java-app-config
```

Toggle debugging:

```bash
# Enable debug mode
kubectl patch configmap java-app-config -p '{"data":{"DEBUG_MODE":"true"}}'
kubectl rollout restart deployment/java-app

# Disable debug mode
kubectl patch configmap java-app-config -p '{"data":{"DEBUG_MODE":"false"}}'
kubectl rollout restart deployment/java-app
```

## Security Considerations

Never expose debug ports directly in production. Always use port-forwarding or VPN access for debugging sessions.

Implement time-limited debugging:

```bash
#!/bin/bash
# debug-with-timeout.sh

NAMESPACE=$1
POD=$2
DURATION=${3:-3600}  # Default 1 hour

echo "Enabling debug for $DURATION seconds..."

# Enable debug
kubectl exec -n "$NAMESPACE" "$POD" -- enable-debug.sh

# Set up port forward
kubectl port-forward -n "$NAMESPACE" "$POD" 5005:5005 &
PF_PID=$!

# Wait for duration then cleanup
sleep "$DURATION"

echo "Debug session expired, cleaning up..."
kubectl exec -n "$NAMESPACE" "$POD" -- disable-debug.sh
kill $PF_PID
```

## Debugging Performance Issues

Use Java Flight Recorder alongside remote debugging:

```bash
# Start flight recording
kubectl exec -n development java-app -- jcmd 1 JFR.start duration=60s filename=/tmp/recording.jfr

# Wait for recording to complete
sleep 60

# Copy recording file
kubectl cp development/java-app:/tmp/recording.jfr ./recording.jfr

# Analyze with Java Mission Control
jmc recording.jfr
```

Remote debugging for Java applications in Kubernetes transforms troubleshooting from a complex, time-consuming process into a streamlined workflow. Configure your environments appropriately, use port-forwarding for security, and leverage JVM attach for production debugging without permanent debug ports.
