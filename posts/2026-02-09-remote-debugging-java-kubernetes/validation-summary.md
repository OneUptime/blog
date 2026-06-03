# Validation Summary: How to Set Up Remote Debugging for Java Applications Running

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java 17
- JVM remote debugging
- Java Debug Wire Protocol (JDWP)
- Java Attach API
- Kubernetes Deployments, Services, ConfigMaps, and shared process namespaces
- kubectl port-forward, exec, cp, patch, and rollout restart
- Java Flight Recorder and Java Mission Control
- Docker container images

## Sources Consulted
- Oracle JPDA Connection and Invocation Details: https://docs.oracle.com/en/java/javase/17/docs/specs/jpda/conninv.html
- Oracle Java SE 17 `VirtualMachine` Attach API documentation: https://docs.oracle.com/en/java/javase/17/docs/api/jdk.attach/com/sun/tools/attach/VirtualMachine.html
- Oracle Java SE 17 `jcmd` command documentation: https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes shared process namespace documentation: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Docker Hub OpenJDK official image notice: https://hub.docker.com/_/openjdk

## Issues Found
- The Dockerfile and sidecar examples used the deprecated Docker Official `openjdk` image. Replaced them with `eclipse-temurin:17-jdk`.
- The `DebugAgent` example used `vm.loadAgent("jdwp=...")`, which is for Java agents packaged as JAR files. Changed it to `vm.loadAgentLibrary("jdwp", debugOptions)`, which is the Attach API method for loading a native JVMTI agent such as JDWP.
- Removed `vm.startLocalManagementAgent()` from the JDWP attach example because it starts the local JMX management agent and does not enable JDWP debugging.
- The Java 17 sidecar command referenced `tools.jar`, which no longer exists in JDK 9 and later. Updated the compile/run commands to use the `jdk.attach` module.
- The sidecar Deployment snippet was not a valid `apps/v1` Deployment because it omitted `spec.selector` and matching template labels. Added the required selector and labels.
- The sidecar attach approach did not account for the Attach API's use of temporary files across container filesystem namespaces. Added a shared `/tmp` `emptyDir` volume mounted in both containers.
- The debug-enabler script used `jcmd VM.start_java_debugging` without starting the JVM with the hidden JDWP `onjcmd=y` option. Replaced it with the corrected `DebugAgent` attach flow.
- The conditional debug Java example used `VirtualMachine.startManagementAgent(String)`, which is not a valid method signature and would start JMX rather than JDWP. Replaced it with a shell entrypoint that conditionally sets `JAVA_TOOL_OPTIONS` before launching the JVM.
- The ConfigMap Deployment snippet was not a valid `apps/v1` Deployment because it omitted `spec.selector` and matching template labels. Added the required selector and labels.
- Several `kubectl exec`, `kubectl cp`, and `kubectl port-forward` examples treated the Deployment name as a Pod name. Updated them to resolve a matching Pod with `kubectl get pod` before using Pod-only commands.

## Review Notes
The JDWP startup options, Kubernetes Service/port-forward examples, ConfigMap patch commands, rollout restart commands, and JFR `jcmd` example are consistent with the referenced documentation. The dynamic attach workflow still requires a full JDK, suitable process permissions, and matching user identity between the attaching process and target JVM.
