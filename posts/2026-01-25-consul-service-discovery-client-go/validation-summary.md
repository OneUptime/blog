# Validation Summary: How to Build a Consul Service Discovery Client in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- HashiCorp Consul
- Consul Go API client
- Consul service registration and deregistration
- Consul health checks
- Consul blocking queries
- HTTP health endpoints

## Sources Consulted
- HashiCorp Consul Go API package documentation: https://pkg.go.dev/github.com/hashicorp/consul/api
- HashiCorp Consul Agent Service HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/agent/service
- HashiCorp Consul Agent Check HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/agent/check
- HashiCorp Consul Health HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/health
- HashiCorp Consul Blocking Queries documentation: https://developer.hashicorp.com/consul/api-docs/features/blocking
- HashiCorp Consul health check configuration reference: https://developer.hashicorp.com/consul/docs/reference/service/health-check

## Issues Found
- The service registration example used `DeregisterCriticalServiceAfter: "30s"` and stated that Consul would deregister the service after 30 seconds of failed checks. Consul documents a minimum timeout of one minute for this setting, with a critical-service reaper that runs every 30 seconds. Changed the value to `"1m"` and updated the explanation to say the service is deregistered after being critical for at least one minute.
- The blocking-query watcher did not handle documented `LastIndex` edge cases. Consul's blocking query documentation says clients should reset the index if it goes backwards and sanity-check zero indexes. Added checks for decreasing and zero `meta.LastIndex` values before updating subscribers.
- The complete example configured `ServicePort` but started the HTTP server with a hardcoded `":8080"` address. Changed the example to use `fmt.Sprintf(":%d", cfg.ServicePort)` and added the required `fmt` import so the server port matches the configuration.

## Review Notes
- The Consul Go API calls used in the post are current and valid: `api.DefaultConfig`, `api.NewClient`, `Agent().ServiceRegister`, `Agent().ServiceDeregister`, `Health().Service`, `api.AgentServiceRegistration`, `api.AgentServiceCheck`, and `api.QueryOptions`.
- The discovery code correctly uses `passingOnly=true` to return only service instances with passing checks.
- The health check URL uses `localhost`, which is correct for a service running on the same host or network namespace as the local Consul agent. Deployments where the Consul agent runs elsewhere should configure a reachable service address.
