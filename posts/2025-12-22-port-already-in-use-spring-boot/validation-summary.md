# Validation Summary: How to Fix 'Port already in use' Errors in Spring Boot

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Java
- Spring Boot (server configuration, Actuator, DevTools, graceful shutdown)
- Spring Boot configuration (`application.properties`, `application.yml`, profiles)
- Shell tooling (`lsof`, `netstat`, `ss`, `kill`, `pkill`)
- Windows tooling (`netstat`, `tasklist`, `taskkill`)
- Docker / Docker Compose
- Kubernetes (Deployment, Service)

## Sources Consulted
- Spring Boot reference – Web server / `server.port` and embedded server configuration: https://docs.spring.io/spring-boot/reference/web/servlet.html
- Spring Boot reference – Graceful shutdown (`server.shutdown`, `spring.lifecycle.timeout-per-shutdown-phase`): https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Spring Boot reference – Profiles and multi-document YAML (`spring.config.activate.on-profile`): https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Boot Actuator – shutdown endpoint and management port: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Boot API – `WebServerInitializedEvent`, `WebServerFactoryCustomizer`, `ConfigurableWebServerFactory`
- Spring Boot DevTools documentation: https://docs.spring.io/spring-boot/reference/using/devtools.html
- Docker Compose – Compose file `version` is obsolete in the Compose Specification: https://docs.docker.com/compose/compose-file/
- Kubernetes – Deployment and Service reference: https://kubernetes.io/docs/concepts/

## Issues Found
No technical issues found.

All code, commands, and configuration snippets were verified as syntactically correct and using current (non-deprecated) APIs:
- The error message and the `Action:` text match Spring Boot's actual failure analyzer output.
- Relaxed-binding env var `SERVER_PORT` maps correctly to `server.port`.
- `server.port=0` plus `WebServerInitializedEvent.getWebServer().getPort()` is the correct way to read the assigned random port.
- Profile-based config uses the post-2.4 `spring.config.activate.on-profile` key (not the deprecated `spring.profiles`).
- Graceful shutdown keys (`server.shutdown: graceful`, `spring.lifecycle.timeout-per-shutdown-phase`) are correct.
- Actuator shutdown endpoint correctly requires `management.endpoint.shutdown.enabled: true` (disabled by default) and is invoked via HTTP POST.
- Docker Compose snippets correctly omit the obsolete `version` field; the host:container port-mapping explanation is accurate.

## Review Notes
- `netstat -vanp tcp | grep 8080` is BSD/macOS syntax. It is placed under the "On macOS and Linux" heading; on Linux this exact form does not work (`-p` expects a program name and `tcp` is not a valid Linux argument here). The section already provides `ss -tulpn` explicitly labeled "(Linux)" and `lsof` works on both platforms, so the guidance is still actionable on Linux — left as-is since the netstat line is correct for macOS and a Linux alternative is given.
- `socket.setReuseAddress(true)` in `isPortAvailable` is called after `new ServerSocket(port)` has already bound, so it has no effect on the bind. It is harmless and does not change the availability-check behavior.
- The `findAvailablePort`/`ServerSocket` check has an inherent TOCTOU race (the port can be taken between the check and the server actually binding). This is a well-known limitation of the approach rather than an error; `server.port=0` is the more robust option and the post already presents it first.
